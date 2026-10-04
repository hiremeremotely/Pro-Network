import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { rootCertificates } from "node:tls";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { validateProductionDatabaseTls } from "../../../lib/db/src/validate-tls.ts";
import { databaseConnectionDiagnostics } from "../../../lib/db/src/connection-diagnostics.ts";
import { buildAllowedOrigins } from "./lib/allowed-origins.ts";
import { hashPassword, verifyPassword } from "./lib/password.ts";
import { authEmailConfigured, authenticationLink, isDemoAuthEmail } from "./lib/auth-email.ts";
import { establishProfileSession } from "./lib/profile-session.ts";
import { requireAuth } from "./middlewares/require-auth.ts";
import { cloudFrontProtocol } from "./middlewares/cloudfront-protocol.ts";

// Synthetic credentials only. Never use the workspace's configured database.
const tlsTestUrl = "postgresql://test-user:test-password@db.example.test/test-db";
const safeTlsUrl = `${tlsTestUrl}?sslmode=verify-full`;

test("database diagnostics show effective driver fields without passwords or query secrets", () => {
  const password = "synthetic-password@:/%";
  const url = `postgresql://alpha:${encodeURIComponent(password)}@db.example.test:5433/appdb?sslmode=verify-full&token=synthetic-query-secret`;
  const result = databaseConnectionDiagnostics(url);
  assert.equal(result.host, "db.example.test");
  assert.equal(result.port, 5433);
  assert.equal(result.database, "appdb");
  assert.equal(result.username, "alpha");
  assert.equal(result.passwordConfigured, true);
  assert.equal(result.sslEnabled, true);
  assert.equal(result.password, "[REDACTED]");
  assert.doesNotMatch(JSON.stringify(result), /synthetic-password|synthetic-query-secret/);
  assert.deepEqual(databaseConnectionDiagnostics(undefined), { configured: false });
  assert.deepEqual(databaseConnectionDiagnostics("postgresql://["), {
    configured: true, parseError: true,
  });
  const overridden = databaseConnectionDiagnostics(`${safeTlsUrl}&host=effective.example.test&user=effective-user&database=effective-db&password=synthetic-override`);
  assert.equal(overridden.host, "effective.example.test");
  assert.equal(overridden.username, "effective-user");
  // The installed driver takes database from the URL path, not this query key.
  assert.equal(overridden.database, "test-db");
  assert.doesNotMatch(JSON.stringify(overridden), /test-password|synthetic-override/);
});

test("production database TLS requires explicit full verification without rewriting settings", () => {
  const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
  const { Client } = require("pg");
  for (const settings of [
    { DATABASE_URL: safeTlsUrl },
    { DATABASE_URL: tlsTestUrl, PGSSLMODE: "verify-full" },
    { DATABASE_URL: safeTlsUrl, PGSSLMODE: "verify-full" },
    { DATABASE_URL: `${safeTlsUrl}&uselibpqcompat=true` },
    { DATABASE_URL: `${safeTlsUrl}&ssl=true` },
    { DATABASE_URL: safeTlsUrl.replace("sslmode", "%73slmode") },
  ]) {
    const env = { NODE_ENV: "production", ...settings };
    const before = { ...env };
    assert.doesNotThrow(() => validateProductionDatabaseTls(env));
    assert.deepEqual(env, before);
    // Confirm the installed driver's URL path enables verification without
    // opening a connection (the environment-only case is covered below).
    if (settings.DATABASE_URL.includes("?")) {
      const ssl = new Client({ connectionString: settings.DATABASE_URL }).connectionParameters.ssl;
      assert.ok(ssl);
      assert.notEqual(ssl.rejectUnauthorized, false);
      assert.equal(ssl.checkServerIdentity, undefined);
    }
  }
});

test("production rejects weak modes, overrides, malformed URLs, and secret-bearing diagnostics", () => {
  const rejected = [
    {},
    { DATABASE_URL: tlsTestUrl },
    { DATABASE_URL: "test-password:not-a-postgres-url" },
    { DATABASE_URL: "https://test-user:test-password@db.example.test/test-db?sslmode=verify-full" },
    { DATABASE_URL: "socket:/tmp?sslmode=verify-full" },
    { DATABASE_URL: "postgresql://test-user:test-password@%2Ftmp/test-db?sslmode=verify-full" },
    { DATABASE_URL: safeTlsUrl, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: `${safeTlsUrl}&host=%2Ftmp` },
    { DATABASE_URL: `${safeTlsUrl}&checkServerIdentity=false` },
    { DATABASE_URL: `${safeTlsUrl}&rejectUnauthorized=false` },
    { DATABASE_URL: `${safeTlsUrl}&sslrejectunauthorized=0` },
    { DATABASE_URL: `${tlsTestUrl}?SSLMode=verify-full`, PGSSLMODE: "verify-full" },
  ];
  for (const mode of ["", "disable", "no-verify", "allow", "prefer", "require", "verify-ca", "unknown", "VERIFY-FULL"]) {
    rejected.push(
      { DATABASE_URL: `${tlsTestUrl}?sslmode=${mode}` },
      { DATABASE_URL: safeTlsUrl, PGSSLMODE: mode },
      { DATABASE_URL: `${safeTlsUrl}&sslmode=${mode}` },
      { DATABASE_URL: `${tlsTestUrl}?sslmode=${mode}&sslmode=verify-full` },
      { DATABASE_URL: `${tlsTestUrl}?sslmode=${mode}&uselibpqcompat=true` },
    );
  }
  for (const ssl of ["", "0", "false", "no-verify", "unknown"]) {
    rejected.push({ DATABASE_URL: `${safeTlsUrl}&ssl=${ssl}` });
    rejected.push({ DATABASE_URL: `${tlsTestUrl}?ssl=${ssl}`, PGSSLMODE: "verify-full" });
  }
  for (const settings of rejected) {
    assert.throws(() => validateProductionDatabaseTls({ NODE_ENV: "production", ...settings }), (error) => {
      assert.match(error.message, /Production database TLS configuration rejected:/);
      assert.doesNotMatch(error.stack, /test-user|test-password|db\.example\.test|test-db|postgresql:\/\//);
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test("URL normalization cannot turn an approved encoded SSL mode into plaintext", () => {
  const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
  const { Client } = require("pg");
  const urlFor = (password) => `postgresql://test-user:${password}@db.example.test/test-db?ssl%6dode=verify-full`;
  // The driver re-encodes the whole URL for these inputs; unlike WHATWG URL,
  // it no longer recognizes the encoded sslmode query key.
  for (const password of ["pass%xx", "pass%2x", "pass word"]) {
    const DATABASE_URL = urlFor(password);
    assert.throws(() => validateProductionDatabaseTls({ NODE_ENV: "production", DATABASE_URL }), /valid percent encoding/);
    const ssl = new Client({ connectionString: DATABASE_URL, ssl: false }).connectionParameters.ssl;
    assert.equal(ssl, false, "The guard must reject URL forms the driver interprets as plaintext");
  }
  // URL also strips raw tabs/newlines and surrounding whitespace; reject them
  // even where the installed driver does not perform its own re-encoding.
  for (const DATABASE_URL of [urlFor("pass\tword"), urlFor("pass\nword"), ` ${safeTlsUrl}`, `${safeTlsUrl}\n`, urlFor("pass%"), urlFor("pass%2")]) {
    assert.throws(() => validateProductionDatabaseTls({ NODE_ENV: "production", DATABASE_URL }), /valid percent encoding/);
  }
  for (const DATABASE_URL of [urlFor("pass%25xx"), urlFor("pass%20word"), safeTlsUrl]) {
    assert.doesNotThrow(() => validateProductionDatabaseTls({ NODE_ENV: "production", DATABASE_URL }));
    const ssl = new Client({ connectionString: DATABASE_URL, ssl: false }).connectionParameters.ssl;
    assert.ok(ssl, "Accepted URLs must enable TLS in the real driver");
    assert.notEqual(ssl.rejectUnauthorized, false);
    assert.equal(ssl.checkServerIdentity, undefined);
  }
});

test("non-production database settings keep their existing behavior", () => {
  for (const NODE_ENV of [undefined, "development", "test"]) {
    assert.doesNotThrow(() => validateProductionDatabaseTls({
      NODE_ENV, DATABASE_URL: `${tlsTestUrl}?sslmode=disable`,
      PGSSLMODE: "no-verify", NODE_TLS_REJECT_UNAUTHORIZED: "0",
    }));
    assert.doesNotThrow(() => validateProductionDatabaseTls({ NODE_ENV }));
  }
});

test("secret-loaded and ECS settings are rejected before the wrapper imports the app", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "startup-tls-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, "dist"));
  await writeFile(join(dir, "load-secrets.mjs"), await readFile(new URL("../load-secrets.mjs", import.meta.url)));
  await build({
    entryPoints: [fileURLToPath(new URL("../../../lib/db/src/validate-tls.ts", import.meta.url))],
    outfile: join(dir, "dist/validate-tls.mjs"), bundle: true, platform: "node", format: "esm",
  });
  await writeFile(join(dir, "dist/index.mjs"), 'console.log("APP_IMPORTED");');
  await build({
    entryPoints: [fileURLToPath(new URL("../../../lib/db/src/connection-diagnostics.ts", import.meta.url))],
    outfile: join(dir, "dist/connection-diagnostics.mjs"), bundle: true, platform: "node", format: "esm",
    banner: { js: "import { createRequire } from 'node:module'; globalThis.require = createRequire(import.meta.url);" },
  });
  // Mock only AWS transport. Execute the real wrapper and real validator.
  const loader = join(dir, "aws-loader.mjs");
  await writeFile(loader, `
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "@aws-sdk/client-secrets-manager") {
        const source = 'export class GetSecretValueCommand {};' +
          'export class SecretsManagerClient { async send() { return { SecretString: process.env.TEST_SECRET_JSON }; } }';
        return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
      }
      return nextResolve(specifier, context);
    }
  `);
  const env = { ...process.env };
  for (const key of ["DATABASE_URL", "PGSSLMODE", "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_OPTIONS", "APP_SECRET_ARN"]) delete env[key];
  const run = (settings, secrets) => spawnSync(process.execPath,
    ["--loader", loader, join(dir, "load-secrets.mjs")], {
      env: { ...env, NODE_ENV: "production", ...settings,
        ...(secrets ? { APP_SECRET_ARN: "test-secret", TEST_SECRET_JSON: JSON.stringify(secrets) } : {}) },
      encoding: "utf8",
    });
  for (const secrets of [
    { DATABASE_URL: safeTlsUrl, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: `${tlsTestUrl}?sslmode=no-verify` },
    { DATABASE_URL: safeTlsUrl, PGSSLMODE: "verify-ca" },
    { DATABASE_URL: "postgresql://test-user:pass%xx@db.example.test/test-db?ssl%6dode=verify-full" },
  ]) {
    const result = run({}, secrets);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Production database TLS configuration rejected/);
    assert.doesNotMatch(result.stdout, /APP_IMPORTED/);
    assert.doesNotMatch(result.stdout + result.stderr, /test-password|test-user|db\.example\.test/);
  }
  // ECS has precedence over Secrets Manager, including an empty value.
  for (const settings of [
    { DATABASE_URL: `${tlsTestUrl}?sslmode=disable` },
    { PGSSLMODE: "" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  ]) {
    const result = run(settings, { DATABASE_URL: safeTlsUrl, PGSSLMODE: "verify-full" });
    assert.equal(result.status, 1, result.stderr);
    assert.doesNotMatch(result.stdout, /APP_IMPORTED/);
  }
  for (const [settings, secrets] of [
    [{ DATABASE_URL: safeTlsUrl }, undefined],
    [{}, { DATABASE_URL: safeTlsUrl }],
    [{}, { DATABASE_URL: tlsTestUrl, PGSSLMODE: "verify-full" }],
    [{ DATABASE_URL: safeTlsUrl }, { DATABASE_URL: `${tlsTestUrl}?sslmode=disable` }],
    [{ NODE_ENV: "development", DATABASE_URL: `${tlsTestUrl}?sslmode=disable` }, undefined],
  ]) {
    const result = run(settings, secrets);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /APP_IMPORTED/);
    const diagnostic = result.stdout.split("\n").filter(line => line.startsWith("{")).map(line => JSON.parse(line))
      .find(line => line.msg === "Effective database connection (password redacted)");
    assert.equal(diagnostic.source, settings.DATABASE_URL === undefined ? "aws-secrets-manager" : "container-environment");
    assert.equal(diagnostic.database.username, "test-user");
    assert.doesNotMatch(result.stdout, /test-password/);
  }
});

test("direct database initialization validates production settings before constructing the pool", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "db-startup-tls-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const script = join(dir, "db.mjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../../../lib/db/src/index.ts", import.meta.url))],
    outfile: script, bundle: true, platform: "node", format: "esm",
    plugins: [{
      name: "observe-pool-without-connecting",
      setup(build) {
        build.onResolve({ filter: /^(pg|drizzle-orm\/node-postgres)$/ }, ({ path }) => ({ path, namespace: "test-db" }));
        build.onLoad({ filter: /.*/, namespace: "test-db" }, ({ path }) => ({
          contents: path === "pg"
            ? `export default { Pool: class { constructor(config) {
                if (config.connectionString !== process.env.DATABASE_URL) throw new Error("Database was changed");
                console.log("POOL_CONSTRUCTED");
              } } };`
            : "export function drizzle() { return {}; }",
        }));
      },
    }],
  });
  const env = { ...process.env };
  for (const key of ["DATABASE_URL", "PGSSLMODE", "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_OPTIONS"]) delete env[key];
  const run = (settings) => spawnSync(process.execPath, [script], {
    env: { ...env, NODE_ENV: "production", ...settings }, encoding: "utf8",
  });
  for (const settings of [
    { DATABASE_URL: `${tlsTestUrl}?sslmode=disable` },
    { DATABASE_URL: tlsTestUrl },
    { DATABASE_URL: safeTlsUrl, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { DATABASE_URL: "postgresql://test-user:pass word@db.example.test/test-db?ssl%6dode=verify-full" },
  ]) {
    const result = run(settings);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production database TLS configuration rejected/);
    assert.doesNotMatch(result.stdout, /POOL_CONSTRUCTED/);
    assert.doesNotMatch(result.stderr, /test-password|test-user|db\.example\.test/);
  }
  for (const settings of [
    { DATABASE_URL: safeTlsUrl },
    { DATABASE_URL: tlsTestUrl, PGSSLMODE: "verify-full" },
    { NODE_ENV: "development", DATABASE_URL: `${tlsTestUrl}?sslmode=disable` },
  ]) {
    const result = run(settings);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /POOL_CONSTRUCTED/);
  }
});

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