---
name: External hosting authentication
description: Replit-managed authentication provisioning does not automatically follow this app to AWS.
---

Do not assume Replit-managed Clerk configuration is available in AWS ECS merely because the same code works in the workspace.

**Why:** The AWS deployment lacked Clerk credentials while the Replit workspace was configured. The documentation consulted during troubleshooting says managed Clerk does not support exporting its keys into an external Secrets Manager.

**How to apply:** Recheck the current Clerk management status and official documentation before promising external-hosted reuse. Establish an explicitly supported authentication setup for the external host; do not copy or rotate managed keys or disable authentication as a workaround. Process liveness alone is not evidence that sign-in works.