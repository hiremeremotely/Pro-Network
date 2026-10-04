---
name: AWS deployment migration policy
description: The user wants RDS migrations in GitHub Actions, with a fail-closed gate before API rollout.
---

Keep RDS schema migrations in this project's GitHub Actions deployment flow.

**Why:** The user explicitly requested this after AWS's schema lagged the API and blocked email checks. Manual-only schema instructions were not the desired deployment process.

**How to apply:** Preserve a successful migration gate before updating the API service. Run inside the existing AWS network using the API's configured database and secret-loading policy, not Replit's separate managed database or internet-wide RDS ingress.

Migrations must remain compatible with the old API while it is still serving.

**Why:** Schema changes happen before the new service rollout; a failed migration must leave the existing service available rather than replace it with a failing image.

**How to apply:** Prefer additive, reviewed SQL and tracked forward-only migrations. Any future destructive schema changes require a separate expand/contract rollout, not a schema reset or forced push.

Do not interpret the ECS deployment action's `Run task failed: [null]` as a database diagnosis.

**Why:** A failed migration task produced this generic output without exposing its application error; an ordinary nonzero container exit may have no ECS container reason. The user needs actionable failure details in GitHub, not only a link back to AWS.

**How to apply:** Preserve the task identity before waiting, gate on actual stopped status and exit code, and report ECS stop reasons alongside allowlisted CloudWatch diagnostics. A missing optional log-read permission must neither block a successful migration nor permit a failed one.