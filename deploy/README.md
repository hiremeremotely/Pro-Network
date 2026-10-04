# AWS authentication deployment

The app uses its own email/password authentication and PostgreSQL-backed,
HTTP-only cookie sessions. It no longer uses Clerk, its proxy, or its keys.
Deploy **both frontend and API** so browsers receive the updated sign-in code.

## Runtime settings

- `DATABASE_URL`: the existing PostgreSQL connection.
- `SESSION_SECRET`: the existing strong, stable session-signing secret. Do not
  change it on each deploy or committed code push.
- `ALLOWED_ORIGINS`: the exact HTTPS frontend origin (comma-separated if needed),
  e.g. `https://YOUR-DISTRIBUTION.cloudfront.net`. No paths or wildcards.
- `PUBLIC_APP_URL`: the frontend's public HTTPS URL, used to build verification
  and password-reset links. This must not be an ALB HTTP address.
- `SES_FROM_EMAIL`: a sender address/identity verified in Amazon SES.
- `AWS_REGION`: the region containing that SES identity.

The ECS task role needs `ses:SendEmail` permission for the verified sender.
SES sandbox accounts can send only to verified recipients until AWS grants
production access. Sending uses the task role, not hardcoded AWS access keys.

## PostgreSQL certificate trust

The API runtime image includes Amazon RDS's official CA bundle and loads it
through `NODE_EXTRA_CA_CERTS` before Node starts. This preserves TLS certificate
verification while trusting RDS-issued certificates.

Use `sslmode=verify-full` in the PostgreSQL URL to request explicit certificate
and hostname verification. Connect using the actual RDS endpoint, not a custom
alias that does not match its certificate. Do not use `sslmode=no-verify`,
`rejectUnauthorized=false`, or `NODE_TLS_REJECT_UNAUTHORIZED=0`.

After adding or changing the image's CA bundle, rebuild and deploy the API
image. Restarting an old image will not install the certificates.

Before pushing either image tag or updating ECS, `.github/workflows/deploy.yml`
runs `/app/check-runtime-ca.mjs` in the **actual final runtime image**. This
offline smoke check uses the image's inherited environment, with no host
certificate mount, AWS credentials, or database connection. It requires
`NODE_EXTRA_CA_CERTS` to point to a readable, nonempty PEM file containing valid
CA certificates, then compares those certificates with Node's startup-loaded
extra and default trust stores. Merely parsing a file is not enough: a bundle
configured too late for Node to load fails the check. Disabled TLS verification
also fails. A nonzero exit stops CI before either push or ECS deployment.

To repeat the check on a built image locally:

```sh
docker run --rm --network none --entrypoint node YOUR_API_IMAGE /app/check-runtime-ca.mjs
```

This checks image trust roots, not live RDS connectivity. In production, the
startup wrapper additionally validates the **final environment after secret
loading**, before importing the application. The database library repeats the
same guard before constructing its pool, including when the app is started
directly without the wrapper.

Startup exits with a nonzero status if `NODE_TLS_REJECT_UNAUTHORIZED=0`, if
`PGSSLMODE` is set to anything except `verify-full` (including an empty value),
or if the database URL contains an SSL mode other than `verify-full`.
`disable`, `no-verify`, `allow`, `prefer`, `require`, and `verify-ca` are not
accepted, even when the installed driver currently treats a mode as a stronger
alias. Explicit `sslmode=verify-full` in `DATABASE_URL` or
`PGSSLMODE=verify-full` is required; conflicting or duplicate unsafe URL
parameters, TLS-disabling `ssl` values, certificate-verification bypasses, and
hostname-verification overrides are rejected. A PostgreSQL TCP endpoint is
required, not a Unix socket URL.
URLs with raw whitespace/control characters or malformed percent escapes are
also rejected: the driver's normalization can otherwise change the meaning of
encoded SSL parameters. Percent-encode spaces and literal percent signs in
credentials (for example, `%20` and `%25`) rather than inserting them raw.

Diagnostics name the rejected setting, never the database URL or its
credentials. These guards do not rewrite settings, replace the configured
database, or connect to it to test TLS. Non-production behavior is unchanged.
For an existing production URL without an explicit mode, add
`sslmode=verify-full` (using `?` or `&` as appropriate), or set
`PGSSLMODE=verify-full`, keeping the same endpoint, database, and credentials.

## Secret loading

The startup wrapper loads the JSON secret referenced by `APP_SECRET_ARN`.
Values already present in the ECS task definition take precedence, even if
empty. New tasks must be started after changing runtime settings.

After secret loading and TLS validation, both API and migration tasks log
`Effective database connection (password redacted)` before attempting to connect.
The log shows the driver's effective host, port, database and username, whether
a password is configured, and a reconstructed URL with its password redacted and
all query parameters omitted. It also identifies container-environment versus
Secrets Manager configuration and, for the latter, the secret ARN/version.
It never logs the password, a password hash, TLS keys, or the original URL.
This identifies configuration mismatches; it does not prove the password is valid.

Clerk settings, including `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`,
`VITE_CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PROXY_URL`, are unused and no longer
needed for either build or runtime. Existing workspace secrets were not deleted.

## CloudFront and secure cookies

Keep the `/api/*` behavior pointed to the ALB, with caching disabled and request
headers, cookies, query strings, and all API methods forwarded. Leave the origin
path blank. Do not convert API 401/403 responses to the SPA's HTML page.

Production session cookies are always Secure. With an HTTPS ALB origin and the
correct trusted proxy configuration, `X-Forwarded-Proto: https` is sufficient.

For the existing **HTTP CloudFront-to-ALB origin**, configure the origin-request
policy to include the CloudFront-generated `CloudFront-Forwarded-Proto` header.
Only after restricting direct ALB access to trusted CloudFront traffic, set
`TRUST_CLOUDFRONT_PROXY=true`. This lets Express recognize the viewer's HTTPS
connection and issue its Secure cookie. Never enable this on an unrestricted
origin that lets callers spoof the protocol header.

## Existing accounts

No profiles or password hashes are deleted. Existing local password accounts
remain usable, with older hashes upgraded after successful sign-in.
Users whose profiles came from Clerk and have no local password must use
**Forgot password** to set one using the emailed link. There is no shared/default
password and no way to retrieve a user's password from Clerk.

Google sign-in was provided solely by Clerk and is no longer offered.
Adding direct Google OAuth is a separate integration; Gmail/Outlook connections
for existing app features were not removed.

## Email behavior and verification

Production verification/reset links are delivered through SES and are never
returned to the requesting browser. Without SES configuration, registration and
recovery return a clear 503 rather than pretend to send an email. Existing
password sign-in still works independently of the email sender.

For local testing only, `DEMO_MODE=true` with non-production `NODE_ENV` allows
links to be returned in API responses. Production cannot enable this bypass.

Session storage is ensured explicitly at startup using idempotent DDL, preserving
existing sessions. `GET /api/healthz` checks process liveness; a 200 is not proof
of email readiness or successful sign-in.

After deployment, verify healthy ALB targets, sign-in, refresh persistence,
company/professional account routing, sign-out, and rejection of protected
requests without a session. Verify actual SES delivery before opening signup.

Run `pnpm --filter @workspace/api-server run test:deployment` locally.

## Missing columns in the external RDS database

The GitHub API deployment workflow now applies pending SQL migrations to AWS
RDS **before updating the API service**:

1. Build the new image, including the SQL files and a migration-only entry point.
2. Read the existing ECS service's current subnets, security groups and public-IP
   setting. No hardcoded subnet list or access from GitHub runners is required.
3. Register a separate `hire-me-remotely-api-migration` task definition using the
   rendered API image and roles, without its HTTP health check or sidecars.
4. Run `node load-secrets.mjs --migrate` as a one-off Fargate task. It loads the
   existing AWS secret and enforces the same RDS TLS verification as the API.
5. Wait for the task to stop and verify that the API container exited with zero.
   Only then update the API service. Failure leaves the service on its old image.

Migration progress/failures appear in the existing ECS CloudWatch log group.
The job never prints database credentials or needs a new database GitHub secret.
Replit's managed database is separate; updating it does not update RDS.

GitHub records the one-off task ARN immediately after launch. The verification
step polls it for up to 20 minutes, prints ECS stopped/container reasons and
exit codes, and copies allowlisted, password-redacted migration diagnostics
from its CloudWatch stream into both the job log and Actions summary.
Database SQLSTATE errors include a readable explanation (for example, `28P01`
means RDS rejected the database password, not a PEM or network timeout).
The previous action's generic `Run task failed: [null]` is no longer the gate.
If log reading is denied, ECS status/exit codes still gate deployment and the
exact log group/stream is shown for manual inspection.

### Required permissions and database baseline

The GitHub AWS principal needs `ecs:DescribeServices`, `ecs:RegisterTaskDefinition`,
`ecs:RunTask`, `ecs:DescribeTasks`, and its existing service-update permissions.
Its `iam:PassRole` permissions must cover the task's existing execution/task roles,
and any task-definition resource restriction must include the migration family.
For automatic failure detail in Actions, additionally allow `logs:GetLogEvents`
on the migration's existing CloudWatch log group/streams. No new repository
secret is required. Missing this optional permission does not turn a successful
migration into a failed deployment, or allow a failed migration to pass.
The existing task role still needs access to the configured Secrets Manager
secret (and its KMS key, if applicable). The database user needs schema/DDL and
ledger-table permissions. Keep RDS's existing ECS-only network access; do not
open port 5432 to GitHub runners or the internet.

This migrates an **existing application database**, not an empty database.
On first use, the runner executes the reviewed, idempotent `0002`–`0005` files in
order, including any manually applied ones, then records them in
`public.hmr_schema_migrations`. Existing accounts are not deleted or reseeded.

All pending files and their ledger entries share one transaction. An advisory
lock prevents concurrent application; connection, lock, statement and overall
task time limits prevent indefinite hangs. A failure rolls back the batch.
Subsequent runs skip recorded files and fail if an applied file's checksum changed
or an applied file is missing from the image. **Never edit or delete an applied
migration; add a new numbered SQL file.** Files must be transaction-compatible,
without their own BEGIN/COMMIT/ROLLBACK or concurrent index creation.

Schema changes must stay compatible with the old API during the rollout. Future
destructive changes need a separately reviewed expand/contract rollout, not a
reset or automatic `drizzle-kit push --force`. Take an RDS snapshot before the
first automatic migration.

### Manual recovery option

If the deployed API reports `interest_requests.expires_at does not exist`,
review the RDS schema and pending migrations, including
`lib/db/migrations/0005_hmr_lifecycle_and_application_consent.sql`. This migration
adds lifecycle/consent columns and fills null expiry timestamps on existing
pending and approved introductions. It does not delete profiles or requests.
Older missing migrations may also need applying in order.

Before changing RDS, confirm the target database, take a backup, and review the
SQL. From a trusted operator environment with a privately configured
`DATABASE_URL` using `sslmode=verify-full` and the official RDS CA file:

```bash
PGSSLROOTCERT=/path/to/aws-rds-global-bundle.pem \
  psql "$DATABASE_URL" --set=ON_ERROR_STOP=1 --single-transaction \
  --file=lib/db/migrations/0005_hmr_lifecycle_and_application_consent.sql
```

Normal API startup never applies SQL migrations; only the deployment's one-off
task does so. The manual command is an operator recovery option. Do not reset or
reseed an existing database to fix missing columns.

Local verification:

```bash
pnpm --filter @workspace/api-server run test:deployment
pnpm --filter @workspace/api-server run test:migrations
```

The migration integration tests require `initdb` and `pg_ctl`. They create and
remove an isolated temporary PostgreSQL cluster on a private Unix socket, never
using the workspace database or RDS.

Introduction expiry maintenance is scoped to `/api/interest-requests` and
`/api/admin/interest-requests`. It must not intercept sign-in, email checks, or
other feature routes. Errors on introduction routes remain visible rather than
silently bypassing expiry or consent enforcement.