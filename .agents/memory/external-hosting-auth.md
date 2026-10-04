---
name: AWS app-owned authentication
description: The user chose AWS hosting with app-owned authentication, not Clerk.
---

The user chose: “Remove Clerk; use app-owned authentication.” This app is intended to run on AWS.

**Why:** The user wants the app on AWS and explicitly chose to remove the Replit-managed authentication dependency rather than keep Clerk.

**How to apply:** Keep authentication app-owned and deployable on AWS. Do not reintroduce Clerk or Replit Auth just because they are default recommendations in an authentication skill. Preserve existing profiles and password accounts; identity-provider-only accounts need verified password recovery, not shared/default credentials.