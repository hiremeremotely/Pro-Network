# AWS API deployment checks

## Liveness versus authentication

`GET /api/healthz` is a process-liveness check, mounted before Clerk, sessions,
and CORS. A 200 here does not verify Clerk configuration or database readiness.
Do not change ALB health-check success codes to accept failures.

If `CLERK_SECRET_KEY` is absent or blank, other requests fail closed with HTTP
503 and code `AUTH_NOT_CONFIGURED`. Startup logs name the missing setting without
printing its value. Authentication is not disabled and protected routes are not
made public.

The ECS startup wrapper loads the JSON secret referenced by `APP_SECRET_ARN`.
It loads this only when the task starts. Task-definition environment variables,
including empty ones, take precedence over the JSON secret.

This project currently uses Replit-managed Clerk. Its managed credentials and
production provisioning are not automatically transferred to AWS. Do not copy,
rotate, or overwrite managed Replit keys as a workaround. Establish a supported
AWS authentication configuration separately, with matching backend and frontend
Clerk configuration, before expecting sign-in to work.

## Browser origins

Set `ALLOWED_ORIGINS` in the AWS runtime configuration to the exact HTTPS origin
of the frontend, e.g. `https://YOUR-DISTRIBUTION.cloudfront.net`. Multiple origins
may be comma-separated. Do not include paths, wildcards, or credentials.
Replit's existing domain configuration remains supported.

Keep CloudFront's `/api/*` behavior pointed to the ALB with caching disabled and
headers, cookies, and query strings forwarded. Leave the ALB origin path blank.

## Verification after deployment

1. Push the code and allow the API GitHub Action to deploy the image.
2. Confirm the ALB targets become healthy and `/api/healthz` returns 200.
3. Verify an API request through CloudFront returns JSON, not S3 XML or a timeout.
4. Verify authentication configuration errors are absent before testing sign-in.
5. After changing the AWS JSON secret, force a new ECS deployment so tasks reload it.

Locally run `pnpm --filter @workspace/api-server run test:deployment`.