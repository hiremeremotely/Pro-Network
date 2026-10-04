import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  assert.doesNotMatch(runner, /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0|rejectUnauthorized\s*:\s*false/);
});