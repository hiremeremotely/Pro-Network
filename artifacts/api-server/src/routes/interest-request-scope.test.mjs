import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

test("missing introduction lifecycle schema cannot break other API routes", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "hmr-route-scope-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const outfile = join(directory, "router.mjs");
  // Load the real router, replacing only its DB dependency. No real database
  // is accessed or changed; expiry queries deliberately fail in every test.
  await build({
    entryPoints: [fileURLToPath(new URL("./interest-requests.ts", import.meta.url))],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [{
      name: "isolated-router-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /^(express|drizzle-orm)$/ }, (args) => ({
          path: import.meta.resolve(args.path),
          external: true,
        }));
        builder.onResolve({ filter: /^@workspace\/db$/ }, () => ({
          path: "unavailable-lifecycle-db",
          namespace: "test-db",
        }));
        builder.onLoad({ filter: /.*/, namespace: "test-db" }, () => ({
          contents: `
            export const db = { select() { throw new Error("Lifecycle schema unavailable"); } };
            export const interestRequestsTable = {};
            export const profilesTable = {};
            export const jobsTable = {};
            export const conversationsTable = {};
            export const messagesTable = {};
            export const notificationsTable = {};
            export const hmrAuditEventsTable = {};
          `,
          loader: "js",
        }));
      },
    }],
  });
  const { default: router } = await import(pathToFileURL(outfile).href);
  const app = express();
  app.use("/api", router);
  app.use((_req, res) => { res.status(204).end(); });
  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error.message });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  for (const path of ["/auth/check-email?email=fixture%40example.test", "/auth/me", "/auth/login", "/profiles/1", "/feed", "/interest-requests-other"]) {
    await t.test(`unrelated ${path.split("?")[0]} skips expiry maintenance`, async () => {
      const response = await fetch(base + path, {
        method: path === "/auth/login" ? "POST" : "GET",
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 204);
    });
  }
  for (const path of ["/interest-requests", "/interest-requests/status", "/interest-requests/candidate", "/admin/interest-requests", "/admin/interest-requests/1/approve"]) {
    await t.test(`introduction ${path} still fails closed on maintenance error`, async () => {
      const response = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 500);
      assert.equal((await response.json()).error, "Lifecycle schema unavailable");
    });
  }
});