import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";
import { clerkConfigurationGuard } from "./middlewares/clerk-configuration.ts";
import { buildAllowedOrigins } from "./lib/allowed-origins.ts";

test("health is mounted before CORS, credential guard, and Clerk", async () => {
  const source = await readFile(new URL("./app.ts", import.meta.url), "utf8");
  const health = source.indexOf('app.use("/api", healthRouter)');
  assert.ok(health > 0);
  assert.ok(health < source.indexOf("const requestOrigin ="));
  assert.ok(health < source.indexOf("app.use(clerkConfigurationGuard())"));
  assert.ok(health < source.indexOf("clerkMiddleware((req)"));
});

test("missing credentials fail closed with a non-cacheable 503", async (t) => {
  for (const key of [undefined, "", "   "]) {
    const app = express();
    app.use(clerkConfigurationGuard(() => key));
    app.get("/api/private", (_req, res) => res.json({ protectedData: true }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/private`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).code, "AUTH_NOT_CONFIGURED");
  }
});

test("configured credentials continue to authentication, not directly to data", () => {
  let continued = false;
  clerkConfigurationGuard(() => "test-placeholder")({}, {}, () => { continued = true; });
  assert.equal(continued, true);
});

test("AWS origins coexist with Replit origins and are deduplicated", () => {
  assert.deepEqual(buildAllowedOrigins({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: "https://example.cloudfront.net/, https://app.example.com",
    REPLIT_DOMAINS: "app.example.com",
  }), ["https://example.cloudfront.net", "https://app.example.com"]);
  assert.deepEqual(buildAllowedOrigins({ NODE_ENV: "production" }), []);
});

test("production origins reject insecure, wildcard, path, and credential URLs", () => {
  for (const origin of ["http://example.com", "https://*.example.com", "https://example.com/feed", "https://user:password@example.com", "not-a-url"]) {
    assert.throws(() => buildAllowedOrigins({ NODE_ENV: "production", ALLOWED_ORIGINS: origin }));
  }
});