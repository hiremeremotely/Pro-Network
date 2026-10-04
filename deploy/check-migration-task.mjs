import { spawnSync } from "node:child_process";
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const safeText = value => String(value ?? "").replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]").slice(0, 2000);

export function awsJson(args) {
  const result = spawnSync("aws", [...args, "--output", "json", "--no-cli-pager"], {
    encoding: "utf8", timeout: 45_000, maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) {
    // Do not echo CLI arguments or returned task definitions/environment.
    throw new Error(safeText(result.stderr || "AWS CLI failed or timed out."));
  }
  return JSON.parse(result.stdout);
}

export function migrationResult(description) {
  const task = description.tasks?.[0];
  const containers = task?.containers?.filter(container => container.name === "api-server") ?? [];
  return {
    success: !description.failures?.length && description.tasks?.length === 1
      && task.lastStatus === "STOPPED" && containers.length === 1 && containers[0].exitCode === 0,
    status: task?.lastStatus ?? "UNKNOWN",
    stopCode: safeText(task?.stopCode),
    stoppedReason: safeText(task?.stoppedReason),
    failures: (description.failures ?? []).map(item => ({ reason: safeText(item.reason), detail: safeText(item.detail) })),
    containers: (task?.containers ?? []).map(item => ({
      name: item.name, status: item.lastStatus, exitCode: item.exitCode, reason: safeText(item.reason),
    })),
  };
}

// Only known structured migration messages are copied from CloudWatch.
// No raw log dump, exception objects, passwords, URL queries or TLS keys.
export function safeMigrationLogs(events) {
  const lines = [];
  for (const event of events ?? []) {
    let entry;
    try { entry = JSON.parse(event.message); } catch {
      const message = String(event.message ?? "");
      if (message.startsWith("[load-secrets] Failed to fetch secret ")) {
        lines.push({ message: "AWS Secrets Manager fetch failed", startupFailure: "secret-access" });
      } else if (message.startsWith("[load-secrets] Production database TLS configuration rejected:")) {
        lines.push({ message: safeText(message), startupFailure: "tls-configuration" });
      } else if (message.startsWith("[load-secrets] Secret is not valid JSON.")
        || message.startsWith("[load-secrets] Secret exists but has no SecretString value.")) {
        lines.push({ message: safeText(message), startupFailure: "secret-format" });
      }
      continue;
    }
    if (entry.msg === "Effective database connection (password redacted)") {
      const db = entry.database ?? {};
      lines.push({
        message: entry.msg, source: entry.source, secretArn: entry.secretArn, secretVersionId: entry.secretVersionId,
        database: {
          host: safeText(db.host), port: db.port, database: safeText(db.database), username: safeText(db.username),
          configured: db.configured === true, parseError: db.parseError === true,
          passwordConfigured: db.passwordConfigured === true, password: "[REDACTED]", sslEnabled: db.sslEnabled === true,
        },
      });
    } else if (entry.msg === "Database migration failed; deployment blocked. Check migration SQL and database permissions.") {
      lines.push({ message: entry.msg, code: safeText(entry.code), reason: safeText(entry.reason) });
    } else if (entry.msg === "Database migrations committed") {
      lines.push({ message: entry.msg, count: entry.count });
    } else if (entry.msg === "Migration exceeded its 18-minute limit; aborting the task.") {
      lines.push({ message: entry.msg });
    }
  }
  return lines;
}

export function explainMigrationFailure(lines, result) {
  const startupFailure = lines.find(line => line.startupFailure)?.startupFailure;
  if (startupFailure === "secret-access") return "The migration container could not fetch the application secret. Check APP_SECRET_ARN, task-role secretsmanager:GetSecretValue, KMS permissions and network access to Secrets Manager.";
  if (startupFailure === "tls-configuration") return "The startup TLS guard rejected the database settings. Keep sslmode=verify-full and the image's RDS certificate bundle; check the setting named above.";
  if (startupFailure === "secret-format") return "The application secret is missing a JSON SecretString or contains invalid JSON.";
  const code = lines.find(line => line.code)?.code;
  if (code === "28P01") return "RDS rejected the database password (SQLSTATE 28P01). Compare the logged endpoint/username and secret version with DBeaver; check ECS overrides and password URL encoding.";
  if (code === "28000") return "RDS rejected database authorization (SQLSTATE 28000). Check the database role and authentication configuration.";
  if (code === "42501") return "The database user lacks privileges for the migration or migration ledger (SQLSTATE 42501).";
  if (code === "42P01") return "A required baseline table is missing (SQLSTATE 42P01). This runner migrates an existing application database, not an empty database.";
  if (code === "42703") return "Migration SQL refers to a missing column (SQLSTATE 42703). Review the baseline and migration order.";
  if (code === "55P03") return "Migration lock timeout (SQLSTATE 55P03). Check for competing migrations or database locks.";
  if (code === "57014") return "Migration statement timeout or cancellation (SQLSTATE 57014). Inspect database load/locks before retrying.";
  if (code) return `Migration failed with SQLSTATE ${code}. Check the migration filename/reason above and its SQL.`;
  if (result.stopCode === "TaskFailedToStart") return "ECS could not start the migration container. Check the stopped/container reasons above for image pull, execution-role, secret access or networking failures.";
  return "Migration did not finish successfully. Inspect the stopped/container reasons and the linked CloudWatch stream; the API rollout remains blocked.";
}

export async function checkMigrationTask({ cluster, taskArn, taskDefinition }, {
  aws = awsJson, now = Date.now, delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
  report = console.log, timeoutMs = 20 * 60_000,
} = {}) {
  const deadline = now() + timeoutMs;
  let result;
  let timedOut = false;
  let previousStatus;
  try {
    while (true) {
      result = migrationResult(await aws(["ecs", "describe-tasks", "--cluster", cluster, "--tasks", taskArn]));
      if (result.status !== previousStatus) {
        report(`Migration task status: ${result.status}`);
        previousStatus = result.status;
      }
      if (result.status === "STOPPED" || result.failures.length) break;
      if (now() >= deadline) { timedOut = true; break; }
      await delay(10_000);
    }
  } catch (error) {
    report(`Cannot inspect migration task: ${safeText(error.message)}`);
    return { success: false, explanation: "ECS task status could not be verified. Check ecs:DescribeTasks permission and AWS availability. Deployment blocked." };
  }
  report(`Migration task: ${taskArn}`);
  report(`ECS result: ${JSON.stringify(result)}`);
  const logOptions = taskDefinition.containerDefinitions?.find(item => item.name === "api-server")
    ?.logConfiguration?.options;
  const group = logOptions?.["awslogs-group"];
  const prefix = logOptions?.["awslogs-stream-prefix"];
  const stream = prefix && `${prefix}/api-server/${taskArn.split("/").at(-1)}`;
  let lines = [];
  if (group && stream) {
    report(`CloudWatch log group: ${group}; stream: ${stream}`);
    // Recently stopped tasks can have a short CloudWatch ingestion delay.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const logs = await aws(["logs", "get-log-events", "--log-group-name", group,
          "--log-stream-name", stream, "--limit", "100",
          ...(logOptions["awslogs-region"] ? ["--region", logOptions["awslogs-region"]] : [])]);
        lines = safeMigrationLogs(logs.events);
        if (lines.some(line => line.code || line.startupFailure || line.message === "Database migrations committed")) break;
      } catch (error) {
        report(`Could not read CloudWatch logs: ${safeText(error.message)}`);
        report("For automatic log reporting, grant the GitHub AWS principal logs:GetLogEvents on this migration log group. Otherwise inspect the stream in AWS.");
      }
      if (attempt < 2) await delay(3000);
    }
  }
  for (const line of lines) report(`Migration log: ${JSON.stringify(line)}`);
  const success = result.success && !timedOut;
  const explanation = success ? "Migration container exited with code 0; API rollout may proceed."
    : timedOut ? "Migration did not stop within 20 minutes. Deployment blocked; inspect the task before retrying."
    : explainMigrationFailure(lines, result);
  report(explanation);
  return { success, explanation };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const messages = [];
  try {
    const [cluster, taskArn, definitionFile] = process.argv.slice(2);
    if (!cluster || !taskArn || !definitionFile) throw new Error("Missing migration task arguments.");
    const taskDefinition = JSON.parse(await readFile(definitionFile, "utf8"));
    const result = await checkMigrationTask({ cluster, taskArn, taskDefinition }, {
      report: message => { console.log(message); messages.push(message); },
    });
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY,
        `\n### RDS migration ${result.success ? "passed" : "failed"}\n\n<pre>${messages.join("\n").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>\n`);
    }
    if (!result.success) process.exitCode = 1;
  } catch (error) {
    console.error(`Migration verification failed: ${safeText(error.message)}`);
    process.exitCode = 1;
  }
}