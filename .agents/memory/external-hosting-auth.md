---
name: AWS app-owned authentication
description: The user chose AWS hosting with app-owned authentication, not Clerk.
---

The user chose: “Remove Clerk; use app-owned authentication.” This app is intended to run on AWS.

**Why:** The user wants the app on AWS and explicitly chose to remove the Replit-managed authentication dependency rather than keep Clerk.

**How to apply:** Keep authentication app-owned and deployable on AWS. Do not reintroduce Clerk or Replit Auth just because they are default recommendations in an authentication skill. Preserve existing profiles and password accounts; identity-provider-only accounts need verified password recovery, not shared/default credentials.

Keep authentication independent of unrelated feature maintenance. Privacy-sensitive maintenance must still fail closed on its own feature routes.

**Why:** A missing introduction-lifecycle field in RDS caused public email checks to fail because expiry processing intercepted every API request. Isolating the feature, rather than swallowing its errors, restores authentication without weakening expiry or consent enforcement.

**How to apply:** Scope feature maintenance to that feature's user/admin route prefixes. Do not run it as a side effect of public authentication requests or silently bypass it when its storage is unavailable.