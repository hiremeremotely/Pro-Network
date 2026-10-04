import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { prepareMigrationTask } from "../../../deploy/prepare-migration-task.mjs";

const service = {
  failures: [],
  services: [{ status: "ACTIVE", networkConfiguration: { awsvpcConfiguration: {
    subnets: ["subnet-aaaa", "subnet-bbbb"],
    securityGroups: ["sg-aaaa"],
    assignPublicIp: "ENABLED",
  } } }],
};
const definition = {
  family: "fixture-api",
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  taskRoleArn: "fixture-task-role",
  executionRoleArn: "fixture-execution-role",
  containerDefinitions: [{
    name: "api-server",
    image: "fixture.example/api:immutable-sha",
    environment: [{ name: "APP_SECRET_ARN", value: "fixture-secret-reference" }],
    logConfiguration: { logDriver: "awslogs" },
    healthCheck: { command: ["CMD-SHELL", "wget fixture-health"] },
  }],
};

test("migration task inherits current network, new image, roles and secret reference without changing API definition", () => {
  const before = structuredClone(definition);
  const prepared = prepareMigrationTask(service, definition);
  assert.equal(prepared.subnets, "subnet-aaaa,subnet-bbbb");
  assert.equal(prepared.securityGroups, "sg-aaaa");
  assert.equal(prepared.assignPublicIp, "ENABLED");
  assert.equal(prepared.taskDefinition.family, "fixture-api-migration");
  assert.equal(prepared.taskDefinition.taskRoleArn, definition.taskRoleArn);
  assert.equal(prepared.taskDefinition.executionRoleArn, definition.executionRoleArn);
  const container = prepared.taskDefinition.containerDefinitions[0];
  assert.equal(container.image, definition.containerDefinitions[0].image);
  assert.deepEqual(container.environment, definition.containerDefinitions[0].environment);
  assert.deepEqual(container.command, ["node", "load-secrets.mjs", "--migrate"]);
  assert.equal(container.healthCheck, undefined);
  assert.deepEqual(definition, before);
  const privateService = structuredClone(service);
  privateService.services[0].networkConfiguration.awsvpcConfiguration.assignPublicIp = "DISABLED";
  assert.equal(prepareMigrationTask(privateService, definition).assignPublicIp, "DISABLED");
});

test("migration preparation rejects unknown services, incomplete networks and dependent containers", () => {
  for (const description of [
    { services: [], failures: [] },
    { services: service.services, failures: [{ reason: "MISSING" }] },
    { services: [{ status: "INACTIVE" }] },
    { services: [{ status: "ACTIVE", networkConfiguration: { awsvpcConfiguration: { subnets: [] } } }] },
  ]) assert.throws(() => prepareMigrationTask(description, definition));
  const dependent = structuredClone(definition);
  dependent.containerDefinitions[0].dependsOn = [{ containerName: "sidecar", condition: "HEALTHY" }];
  assert.throws(() => prepareMigrationTask(service, dependent));
});

test("workflow waits for successful migration before service update and ships SQL plus runner", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const migration = workflow.indexOf("- name: Run RDS migrations inside ECS");
  const verify = workflow.indexOf("- name: Confirm migration completed successfully");
  const deploy = workflow.indexOf("- name: Deploy to ECS");
  assert.ok(migration > 0 && verify > migration && deploy > verify);
  const migrationStep = workflow.slice(migration, verify);
  assert.doesNotMatch(migrationStep, /^\s+service:/m);
  assert.match(migrationStep, /wait-for-task-stopped: true/);
  assert.match(workflow, /exitCode == 0/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /continue-on-error: true|push-force|NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.match(await readFile(new URL("../Dockerfile", import.meta.url), "utf8"), /COPY lib\/db\/migrations \.\/migrations/);
  assert.match(await readFile(new URL("../build.mjs", import.meta.url), "utf8"), /migrate:.*src\/migrate\.ts/);
});

test("secret-loading wrapper selects migration-only mode and propagates failure without starting API", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "migration-wrapper-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "dist"));
  const wrapper = join(directory, "load-secrets.mjs");
  await writeFile(wrapper, await readFile(new URL("../load-secrets.mjs", import.meta.url)));
  await build({
    entryPoints: [fileURLToPath(new URL("../../../lib/db/src/validate-tls.ts", import.meta.url))],
    outfile: join(directory, "dist/validate-tls.mjs"),
    bundle: true, platform: "node", format: "esm",
  });
  await writeFile(join(directory, "dist/index.mjs"), 'process.stdout.write("API_STARTED");');
  await build({
    entryPoints: [fileURLToPath(new URL("../../../lib/db/src/connection-diagnostics.ts", import.meta.url))],
    outfile: join(directory, "dist/connection-diagnostics.mjs"),
    bundle: true, platform: "node", format: "esm",
    banner: { js: "import { createRequire } from 'node:module'; globalThis.require = createRequire(import.meta.url);" },
  });
  await writeFile(join(directory, "dist/migrate.mjs"), 'process.stdout.write("MIGRATION_STARTED");');
  const run = args => spawnSync(process.execPath, [wrapper, ...args], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://fixture:fixture@db.example.test/fixture?sslmode=verify-full",
    },
  });
  const migration = run(["--migrate"]);
  assert.equal(migration.status, 0, migration.stderr);
  assert.match(migration.stdout, /MIGRATION_STARTED$/);
  assert.match(migration.stdout, /Effective database connection \(password redacted\)/);
  assert.match(run([]).stdout, /API_STARTED$/);
  const invalid = run(["--unknown"]);
  assert.equal(invalid.status, 1);
  assert.doesNotMatch(invalid.stdout, /API_STARTED|MIGRATION_STARTED/);
  await writeFile(join(directory, "dist/migrate.mjs"), "process.exitCode = 1;");
  const failed = run(["--migrate"]);
  assert.equal(failed.status, 1);
  assert.doesNotMatch(failed.stdout, /API_STARTED/);
});