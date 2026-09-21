---
name: API codegen compatibility
description: Orval 8 output needs compatibility post-processing in this Zod 3 workspace
---

**Rule:** Run the API spec package's codegen script rather than invoking Orval directly.

**Why:** Orval 8 emits Zod 4 shorthand and DOM-iterable assumptions that do not match this workspace's Zod 3 and TypeScript configuration. It can also create duplicate barrel exports.

**How to apply:** Keep code generation behind the package script's compatibility post-processing until the workspace upgrades its underlying Zod and TypeScript library assumptions together.
