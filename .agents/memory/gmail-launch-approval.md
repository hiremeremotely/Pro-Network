---
name: Gmail launch approval
description: Launch constraint for the Gmail job-tracker integration.
---

Do not open the Gmail mailbox integration to the public until Google approves the app for the restricted `gmail.readonly` scope. Keep it limited to approved test users in the meantime. Confirm during review whether Google requires an independent security assessment because the server handles restricted-scope data and OAuth tokens.

**Why:** Google treats `gmail.readonly` as a restricted scope. User consent alone does not authorize an unverified public production launch.

**How to apply:** Before enabling Gmail for general users, verify the production domain and OAuth consent screen, ensure the homepage and Privacy Policy match actual behavior, prepare the scope justification and demonstration video, submit OAuth verification, and complete any security assessment Google requires. This is intentionally deferred for now and should not be started without a future user request.