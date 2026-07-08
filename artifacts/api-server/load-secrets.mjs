/**
 * Startup wrapper — runs before the Express app.
 *
 * If APP_SECRET_ARN is set, it fetches that secret from AWS Secrets Manager,
 * parses the JSON value, and injects each key into process.env.  The app then
 * reads process.env.DATABASE_URL, process.env.SESSION_SECRET, etc. exactly as
 * it does today — no other code changes are required.
 *
 * Secret format in AWS Secrets Manager (SecretString):
 *   {
 *     "DATABASE_URL":    "postgres://...",
 *     "SESSION_SECRET":  "...",
 *     "DEFAULT_OBJECT_STORAGE_BUCKET_ID": "...",
 *     "PRIVATE_OBJECT_DIR": "...",
 *     "PUBLIC_OBJECT_SEARCH_PATHS": "..."
 *   }
 *
 * Environment variables:
 *   APP_SECRET_ARN  — ARN of the Secrets Manager secret (required in production)
 *   AWS_REGION      — AWS region (default: us-east-1)
 *
 * Local development: omit APP_SECRET_ARN and supply a .env file (or set env
 * vars directly). The app starts immediately without hitting AWS.
 */

const secretArn = process.env.APP_SECRET_ARN;

if (secretArn) {
  const region = process.env.AWS_REGION ?? "us-east-1";

  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );

  const client = new SecretsManagerClient({ region });

  let secretString;
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );
    secretString = response.SecretString;
  } catch (err) {
    console.error(
      `[load-secrets] Failed to fetch secret "${secretArn}" from AWS Secrets Manager:`,
      err.message
    );
    process.exit(1);
  }

  if (!secretString) {
    console.error("[load-secrets] Secret exists but has no SecretString value.");
    process.exit(1);
  }

  let secrets;
  try {
    secrets = JSON.parse(secretString);
  } catch {
    console.error("[load-secrets] Secret is not valid JSON.");
    process.exit(1);
  }

  let loaded = 0;
  for (const [key, value] of Object.entries(secrets)) {
    // Env vars already set in the task definition take precedence
    if (process.env[key] === undefined) {
      process.env[key] = String(value);
      loaded++;
    }
  }

  console.log(
    `[load-secrets] Injected ${loaded} secret(s) from ${secretArn} (region: ${region})`
  );
}

// Hand off to the real application
await import("./dist/index.mjs");
