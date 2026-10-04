import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rootCertificates } from "node:tls";
import { buildAllowedOrigins } from "./lib/allowed-origins.ts";
import { hashPassword, verifyPassword } from "./lib/password.ts";
import { authEmailConfigured, authenticationLink, isDemoAuthEmail } from "./lib/auth-email.ts";
import { establishProfileSession } from "./lib/profile-session.ts";
import { requireAuth } from "./middlewares/require-auth.ts";
import { cloudFrontProtocol } from "./middlewares/cloudfront-protocol.ts";

test("health is mounted before CORS and session middleware, without Clerk", async () => {
  const source = await readFile(new URL("./app.ts", import.meta.url), "utf8");
  const health = source.indexOf('app.use("/api", healthRouter)');
  assert.ok(health > 0);
  assert.ok(health < source.indexOf("const requestOrigin ="));
  assert.ok(health < source.indexOf("session({"));
  assert.doesNotMatch(source, /@clerk|CLERK_|clerkMiddleware/);
  const frontend = await readFile(new URL("../../proconnect/src/App.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(frontend, /@clerk|CLERK_|ClerkProvider|ClerkBridge/);
});

test("a missing app session cannot access protected routes", () => {
  const response = { status(code) { this.code = code; return this; }, json(data) { this.body = data; } };
  let continued = false;
  requireAuth({ session: {} }, response, () => { continued = true; });
  assert.equal(response.code, 401);
  assert.equal(continued, false);
  requireAuth({ session: { profileId: 12 } }, response, () => { continued = true; });
  assert.equal(continued, true);
});

test("login rotates then persists the local session before returning", async () => {
  const calls = [];
  const request = {
    session: {
      regenerate(done) {
        calls.push("rotate");
        request.session = { save(done) { calls.push(["save", this.profileId]); done(); } };
        done();
      },
    },
  };
  await establishProfileSession(request, 42);
  assert.deepEqual(calls, ["rotate", ["save", 42]]);
});

test("a failed session write cannot report successful sign-in", async () => {
  const request = { session: { regenerate(done) { done(); }, save(done) { done(new Error("store unavailable")); } } };
  await assert.rejects(establishProfileSession(request, 42), /store unavailable/);
});

test("new scrypt passwords reject wrong passwords and malformed hashes", () => {
  const hashed = hashPassword("test-password-only");
  assert.equal(verifyPassword("test-password-only", hashed).valid, true);
  assert.equal(verifyPassword("wrong-password", hashed).valid, false);
  assert.equal(verifyPassword("anything", "scrypt$16384$8$1$$").valid, false);
});

test("legacy password accounts remain usable and require a hash upgrade", () => {
  const legacy = createHash("sha256").update("old-test-password" + "hmr_salt_2026").digest("hex");
  assert.deepEqual(verifyPassword("old-test-password", legacy), { valid: true, needsRehash: true });
  assert.equal(verifyPassword("wrong-password", legacy).valid, false);
});

test("production email requires SES sender and an explicit HTTPS frontend URL", () => {
  assert.equal(authEmailConfigured({ NODE_ENV: "production", DEMO_MODE: "true" }), false);
  assert.equal(isDemoAuthEmail({ NODE_ENV: "production", DEMO_MODE: "true" }), false);
  assert.equal(authEmailConfigured({ NODE_ENV: "development", DEMO_MODE: "true" }), true);
  for (const url of ["http://example.com", "https://user:password@example.com", "not-a-url"]) {
    assert.equal(authEmailConfigured({ PUBLIC_APP_URL: url, SES_FROM_EMAIL: "noreply@example.com" }), false);
  }
  assert.equal(authEmailConfigured({ PUBLIC_APP_URL: "https://example.com", SES_FROM_EMAIL: "noreply@example.com" }), true);
});

test("email links preserve the frontend base path and encode the token", () => {
  assert.equal(authenticationLink("https://example.com/app", "verify-email", "test+token"), "https://example.com/app/verify-email?token=test%2Btoken");
});

test("CloudFront viewer protocol is ignored unless explicitly trusted", () => {
  const req = { headers: { "cloudfront-forwarded-proto": "https", "x-forwarded-proto": "http" } };
  cloudFrontProtocol(false)(req, {}, () => {});
  assert.equal(req.headers["x-forwarded-proto"], "http");
  cloudFrontProtocol(true)(req, {}, () => {});
  assert.equal(req.headers["x-forwarded-proto"], "https");
});

test("AWS origins coexist with Replit origins and are deduplicated", () => {
  assert.deepEqual(buildAllowedOrigins({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: "https://example.cloudfront.net/, https://app.example.com",
    REPLIT_DOMAINS: "app.example.com",
  }), ["https://example.cloudfront.net", "https://app.example.com"]);
});

test("production origins reject insecure, wildcard, path, and credential URLs", () => {
  for (const origin of ["http://example.com", "https://*.example.com", "https://example.com/feed", "https://user:password@example.com", "not-a-url"]) {
    assert.throws(() => buildAllowedOrigins({ NODE_ENV: "production", ALLOWED_ORIGINS: origin }));
  }
});

test("the AWS runtime trusts the official RDS CA bundle without disabling TLS verification", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
  const runner = dockerfile.slice(dockerfile.indexOf("FROM node:24-alpine AS runner"));
  assert.match(runner, /ADD https:\/\/truststore\.pki\.rds\.amazonaws\.com\/global\/global-bundle\.pem \/app\/certs\/aws-rds-global-bundle\.pem/);
  assert.match(runner, /ENV NODE_EXTRA_CA_CERTS=\/app\/certs\/aws-rds-global-bundle\.pem/);
  assert.match(runner, /COPY artifacts\/api-server\/check-runtime-ca\.mjs \.\//);
  assert.doesNotMatch(runner, /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0|rejectUnauthorized\s*:\s*false/);
});

test("CI checks the built image with inherited trust before either push or deployment", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const smoke = 'docker run --rm --network none --entrypoint node \\\n            "$REGISTRY/$REPOSITORY:$SHA_TAG" /app/check-runtime-ca.mjs';
  const check = workflow.indexOf(smoke);
  assert.ok(check > workflow.indexOf("docker build \\"));
  assert.ok(check < workflow.indexOf('docker push "$REGISTRY/$REPOSITORY:$SHA_TAG"'));
  assert.ok(check < workflow.indexOf('docker push "$REGISTRY/$REPOSITORY:latest"'));
  assert.ok(check < workflow.indexOf("uses: aws-actions/amazon-ecs-deploy-task-definition@"));
  assert.match(workflow, /set -euo pipefail/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true|NODE_TLS_REJECT_UNAUTHORIZED\s*[:=]\s*["']?0/);
});

test("runtime smoke check requires valid CAs loaded at startup and fails closed", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "runtime-ca-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const script = fileURLToPath(new URL("../check-runtime-ca.mjs", import.meta.url));
  const valid = join(dir, "valid.pem");
  const empty = join(dir, "empty.pem");
  const malformed = join(dir, "malformed.pem");
  const partial = join(dir, "partial.pem");
  await writeFile(valid, rootCertificates[0]);
  await writeFile(empty, "");
  await writeFile(malformed, "-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----");
  await writeFile(partial, `${rootCertificates[0]}\n-----BEGIN CERTIFICATE-----\ntruncated`);
  const env = { ...process.env };
  // Tests must not depend on the developer's TLS or PostgreSQL settings.
  for (const key of ["NODE_EXTRA_CA_CERTS", "NODE_TLS_REJECT_UNAUTHORIZED", "PGSSLMODE", "NODE_OPTIONS"]) {
    delete env[key];
  }
  const run = (overrides, args = [script]) => spawnSync(process.execPath, args, {
    env: { ...env, ...overrides }, encoding: "utf8",
  });
  const success = run({ NODE_EXTRA_CA_CERTS: valid });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /1 CA certificates loaded; TLS verification enabled/);
  for (const overrides of [
    {},
    { NODE_EXTRA_CA_CERTS: join(dir, "missing.pem") },
    { NODE_EXTRA_CA_CERTS: dir },
    { NODE_EXTRA_CA_CERTS: empty },
    { NODE_EXTRA_CA_CERTS: malformed },
    { NODE_EXTRA_CA_CERTS: partial },
    { NODE_EXTRA_CA_CERTS: valid, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { NODE_EXTRA_CA_CERTS: valid, PGSSLMODE: "no-verify" },
    { NODE_EXTRA_CA_CERTS: valid, PGSSLMODE: "disable" },
  ]) {
    const result = run(overrides);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Runtime CA smoke check failed/);
  }
  const late = run({}, ["--input-type=module", "-e",
    `process.env.NODE_EXTRA_CA_CERTS = ${JSON.stringify(valid)}; await import(${JSON.stringify(new URL("../check-runtime-ca.mjs", import.meta.url).href)});`]);
  assert.equal(late.status, 1);
  assert.match(late.stderr, /Node did not load the complete .* at startup/);
});