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

## Secret loading

The startup wrapper loads the JSON secret referenced by `APP_SECRET_ARN`.
Values already present in the ECS task definition take precedence, even if
empty. New tasks must be started after changing runtime settings.

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