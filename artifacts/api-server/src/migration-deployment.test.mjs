import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { prepareMigrationTask } from "../../../deploy/prepare-migration-task.mjs";
import { checkMigrationTask, migrationResult, safeMigrationLogs, explainMigrationFailure } from "../../../deploy/check-migration-task.mjs";

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
  assert.match(migrationStep, /aws ecs run-task/);
  assert.match(migrationStep, /task-arn=.*GITHUB_OUTPUT/);
  assert.match(workflow.slice(verify, deploy), /node deploy\/check-migration-task.mjs/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /continue-on-error: true|push-force|NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.match(await readFile(new URL("../Dockerfile", import.meta.url), "utf8"), /COPY lib\/db\/migrations \.\/migrations/);
  assert.match(await readFile(new URL("../build.mjs", import.meta.url), "utf8"), /migrate:.*src\/migrate\.ts/);
});

const stoppedTask = (exitCode = 0) => ({
  failures: [], tasks: [{
    lastStatus: "STOPPED", stopCode: "EssentialContainerExited", stoppedReason: "Essential container exited",
    containers: [{ name: "api-server", lastStatus: "STOPPED", exitCode }],
  }],
});
const loggedDefinition = {
  containerDefinitions: [{ name: "api-server", logConfiguration: { options: {
    "awslogs-group": "/ecs/fixture", "awslogs-stream-prefix": "ecs", "awslogs-region": "us-east-1",
  } } }],
};

test("migration gate rejects every incomplete or unsuccessful ECS result", () => {
  assert.equal(migrationResult(stoppedTask()).success, true);
  for (const result of [
    stoppedTask(1), stoppedTask(null),
    { failures: [{ reason: "MISSING" }], tasks: [] },
    { failures: [], tasks: [] },
    { failures: [], tasks: [{ lastStatus: "STOPPED", containers: [] }] },
    { failures: [], tasks: [{ lastStatus: "RUNNING", containers: [{ name: "api-server", exitCode: 0 }] }] },
    { failures: [], tasks: [...stoppedTask().tasks, ...stoppedTask().tasks] },
  ]) assert.equal(migrationResult(result).success, false);
});

test("failed migration reports password rejection and redacted effective configuration in CI", async () => {
  const output = [];
  const calls = [];
  const result = await checkMigrationTask({ cluster: "fixture-cluster", taskArn: "arn:fixture/task/id", taskDefinition: loggedDefinition }, {
    aws: args => {
      calls.push(args);
      if (args[0] === "ecs") return stoppedTask(1);
      return { events: [
        { message: JSON.stringify({ msg: "Effective database connection (password redacted)", source: "aws-secrets-manager",
          secretVersionId: "fixture-version", database: { configured: true, host: "db.example.test", username: "alpha", database: "app",
            passwordConfigured: true, sslEnabled: true, password: "NEVER_PRINT_PASSWORD",
            connectionString: "postgresql://alpha:NEVER_PRINT_PASSWORD@db.example.test/app" } }) },
        { message: JSON.stringify({ msg: "Database migration failed; deployment blocked. Check migration SQL and database permissions.", code: "28P01" }) },
        { message: "NEVER_PRINT_RAW_LOG" },
        { message: JSON.stringify({ msg: "Unhandled error", err: { password: "NEVER_PRINT_PASSWORD" } }) },
      ] };
    }, report: message => output.push(message), delay: async () => {},
  });
  assert.equal(result.success, false);
  assert.match(result.explanation, /RDS rejected the database password/);
  assert.match(output.join("\n"), /28P01|fixture-version/);
  assert.doesNotMatch(output.join("\n"), /NEVER_PRINT/);
  assert.ok(calls.some(args => args.includes("ecs/api-server/id")));
  assert.ok(calls.every(args => !args.includes("update-service")));
});

test("task startup failures remain explicit when no CloudWatch stream is readable", async () => {
  const stopped = stoppedTask(null);
  stopped.tasks[0].stopCode = "TaskFailedToStart";
  stopped.tasks[0].stoppedReason = "ResourceInitializationError: unable to pull secrets";
  const output = [];
  const result = await checkMigrationTask({ cluster: "fixture", taskArn: "arn:fixture/task/id", taskDefinition: loggedDefinition }, {
    aws: args => { if (args[0] === "ecs") return stopped; throw new Error("AccessDeniedException: logs:GetLogEvents"); },
    delay: async () => {}, report: line => output.push(line),
  });
  assert.equal(result.success, false);
  assert.match(result.explanation, /could not start/);
  assert.match(output.join("\n"), /ResourceInitializationError|logs:GetLogEvents/);
});

test("successful migrations proceed even without optional log-read permission", async () => {
  const result = await checkMigrationTask({ cluster: "fixture", taskArn: "arn:fixture/task/id", taskDefinition: loggedDefinition }, {
    aws: args => { if (args[0] === "ecs") return stoppedTask(); throw new Error("AccessDenied"); },
    delay: async () => {}, report: () => {},
  });
  assert.equal(result.success, true);
});

test("migration timeout and unavailable task status block rollout", async () => {
  let time = 0;
  const timeout = await checkMigrationTask({ cluster: "fixture", taskArn: "fixture", taskDefinition: {} }, {
    aws: () => ({ failures: [], tasks: [{ lastStatus: "RUNNING", containers: [] }] }),
    now: () => time, delay: async () => { time += 10_000; }, timeoutMs: 10_000, report: () => {},
  });
  assert.equal(timeout.success, false);
  assert.match(timeout.explanation, /did not stop/);
  const unavailable = await checkMigrationTask({ cluster: "fixture", taskArn: "fixture", taskDefinition: {} }, {
    aws: () => { throw new Error("AccessDenied"); }, report: () => {},
  });
  assert.equal(unavailable.success, false);
  assert.match(unavailable.explanation, /DescribeTasks/);
});

test("pending tasks are polled until stopped and startup/SQL errors have readable explanations", async () => {
  let descriptions = 0;
  let delays = 0;
  const result = await checkMigrationTask({ cluster: "fixture", taskArn: "fixture", taskDefinition: {} }, {
    aws: () => ++descriptions === 1 ? { tasks: [{ lastStatus: "PENDING" }], failures: [] } : stoppedTask(),
    delay: async () => { delays++; }, report: () => {},
  });
  assert.equal(result.success, true);
  assert.equal(delays, 1);
  for (const code of ["42501", "42P01", "42703", "55P03", "57014", "28000", "23505"]) {
    assert.match(explainMigrationFailure([{ code }], {}), new RegExp(code));
  }
  for (const message of [
    "[load-secrets] Failed to fetch secret fixture: NEVER_PRINT_PASSWORD",
    "[load-secrets] Production database TLS configuration rejected: Set DATABASE_URL sslmode=verify-full.",
    "[load-secrets] Secret is not valid JSON.",
  ]) {
    const lines = safeMigrationLogs([{ message }]);
    assert.equal(lines.length, 1);
    assert.doesNotMatch(JSON.stringify(lines), /NEVER_PRINT_PASSWORD/);
    assert.match(explainMigrationFailure(lines, {}), /secret|TLS/i);
  }
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