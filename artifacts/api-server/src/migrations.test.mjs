import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readDatabaseMigrations, runDatabaseMigrations } from "../../../lib/db/src/migrations.ts";

const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = require("pg");
const migrationDirectory = fileURLToPath(new URL("../../../lib/db/migrations", import.meta.url));
const fixture = (name, sql) => ({ name, sql, checksum: createHash("sha256").update(sql).digest("hex") });

test("migration files are ordered, checksummed and reject empty or transaction-breaking SQL", async (t) => {
  const migrations = await readDatabaseMigrations(migrationDirectory);
  assert.equal(migrations.length, 4);
  assert.deepEqual(migrations.map(item => item.name), [...migrations.map(item => item.name)].sort());
  for (const migration of migrations) assert.match(migration.checksum, /^[a-f0-9]{64}$/);
  const directory = await mkdtemp(join(tmpdir(), "migration-files-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(readDatabaseMigrations(directory), /No SQL migrations/);
  const filename = join(directory, "0001_test.sql");
  for (const sql of ["", "COMMIT;", "SELECT 1; COMMIT; SELECT 2;", "CREATE INDEX CONCURRENTLY fixture_idx ON fixture(id);"]) {
    await writeFile(filename, sql);
    await assert.rejects(readDatabaseMigrations(directory), /Empty migration|runner-owned transaction/);
  }
});

test("real PostgreSQL migration batch preserves data, skips retries and rolls back failures", async (t) => {
  // Dedicated temporary cluster, private Unix socket, synthetic role; NEVER the
  // workspace DATABASE_URL, RDS, or any existing database.
  const directory = await mkdtemp(join(tmpdir(), "hmr-migration-pg-"));
  const database = join(directory, "data");
  const socket = join(directory, "socket");
  await mkdir(socket, { mode: 0o700 });
  const command = (program, args) => {
    const result = spawnSync(program, args, { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
  };
  let started = false;
  let pool;
  t.after(async () => {
    await pool?.end();
    if (started) command("pg_ctl", ["-D", database, "-m", "fast", "-w", "stop"]);
    await rm(directory, { recursive: true, force: true });
  });
  command("initdb", ["-D", database, "-U", "migration_fixture", "-A", "trust", "--no-locale"]);
  command("pg_ctl", ["-D", database, "-l", join(directory, "postgres.log"),
    "-o", `-c listen_addresses='' -c unix_socket_directories='${socket}'`, "-w", "start"]);
  started = true;
  pool = new Pool({ host: socket, user: "migration_fixture", database: "postgres", connectionTimeoutMillis: 3000 });
  await pool.query(`
    CREATE TABLE profiles (id serial PRIMARY KEY, email text, password text);
    INSERT INTO profiles(email, password) VALUES ('fixture@example.test', 'unchanged-fixture-hash');
    CREATE TABLE portfolio (id serial PRIMARY KEY, profile_id integer NOT NULL REFERENCES profiles(id), title text);
    INSERT INTO portfolio(profile_id, title) VALUES (1, 'Preserved fixture project');
    CREATE TABLE interest_requests (id serial PRIMARY KEY, status varchar(20) NOT NULL DEFAULT 'pending');
    INSERT INTO interest_requests(status) VALUES ('pending'), ('approved'), ('declined');
    CREATE TABLE applications (id serial PRIMARY KEY);
    INSERT INTO applications DEFAULT VALUES;
  `);
  const migrations = await readDatabaseMigrations(migrationDirectory);
  const run = async files => {
    const client = await pool.connect();
    try { return await runDatabaseMigrations(client, files); } finally { client.release(); }
  };
  await t.test("all existing migration files execute against the old schema", async () => {
    assert.deepEqual(await run(migrations), migrations.map(item => item.name));
    const { rows } = await pool.query("SELECT count(*)::integer AS count FROM public.hmr_schema_migrations");
    assert.equal(rows[0].count, 4);
    const { rows: profiles } = await pool.query("SELECT password, email_verified FROM profiles");
    assert.deepEqual(profiles, [{ password: "unchanged-fixture-hash", email_verified: true }]);
    const { rows: portfolio } = await pool.query("SELECT title, source FROM portfolio");
    assert.deepEqual(portfolio, [{ title: "Preserved fixture project", source: "manual" }]);
    const { rows: requests } = await pool.query("SELECT status, expires_at, release_expires_at FROM interest_requests ORDER BY id");
    assert.deepEqual(requests.map(row => row.status), ["pending", "approved", "declined"]);
    assert.ok(requests[0].expires_at > new Date());
    assert.ok(requests[1].release_expires_at > new Date());
    assert.equal(requests[2].expires_at, null);
    const { rows: applications } = await pool.query("SELECT consent_to_share, consent_scope FROM applications");
    assert.deepEqual(applications, [{ consent_to_share: false, consent_scope: [] }]);
  });
  await t.test("retry skips all applied files and preserves existing expiry dates", async () => {
    const before = (await pool.query("SELECT * FROM interest_requests ORDER BY id")).rows;
    assert.deepEqual(await run(migrations), []);
    assert.deepEqual((await pool.query("SELECT * FROM interest_requests ORDER BY id")).rows, before);
  });
  await t.test("an error rolls back earlier pending files and their ledger entries", async () => {
    const pending = [
      ...migrations,
      fixture("0006_fixture_good.sql", "ALTER TABLE profiles ADD COLUMN rollback_fixture text;"),
      fixture("0007_fixture_bad.sql", "SELECT * FROM nonexistent_migration_fixture_table;"),
    ];
    await assert.rejects(run(pending), /Migration SQL failed: 0007_fixture_bad.sql/);
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rollback_fixture'");
    assert.equal(rows.length, 0);
    assert.equal((await pool.query("SELECT count(*)::integer AS count FROM public.hmr_schema_migrations")).rows[0].count, 4);
  });
  await t.test("modified applied SQL blocks migration instead of silently rerunning it", async () => {
    const changed = migrations.map((item, index) => index ? item : { ...item, checksum: "0".repeat(64) });
    await assert.rejects(run(changed), /Applied migration was modified/);
  });
  await t.test("an image missing an already applied file is rejected", async () => {
    await assert.rejects(run(migrations.slice(1)), /applied migration absent from this image/);
  });
  await t.test("concurrent migration tasks apply each pending file exactly once", async () => {
    await pool.query("CREATE TABLE migration_fixture_counter (id serial PRIMARY KEY)");
    const files = [...migrations, fixture("0006_fixture_once.sql",
      "SELECT pg_sleep(0.1); INSERT INTO migration_fixture_counter DEFAULT VALUES;")];
    const results = await Promise.all([run(files), run(files)]);
    assert.equal(results.flat().length, 1);
    assert.equal((await pool.query("SELECT count(*)::integer AS count FROM migration_fixture_counter")).rows[0].count, 1);
  });
});