---
name: api-zod duplicate exports after codegen
description: Why api-zod/src/index.ts must only export from ./generated/api and not ./generated/types
---

After running `pnpm --filter @workspace/api-spec run codegen`, orval writes:
- `lib/api-zod/src/generated/api.ts` — Zod validation schemas (the ones api-server imports)
- `lib/api-zod/src/generated/types/` — TypeScript interface types (barrel at `types/index.ts`)

Both files export the same member names (e.g. `CreateProfileBody`). If `lib/api-zod/src/index.ts` re-exports both:
```ts
export * from "./generated/api";    // ✓
export * from "./generated/types";  // ✗ — duplicates everything above
```
TypeScript throws `TS2308: Module has already exported a member` for every shared name.

**Fix:** `lib/api-zod/src/index.ts` should only export from `./generated/api`:
```ts
export * from "./generated/api";
```

**Why:** The TypeScript types in `types/` are consumed by `api-client-react`, not by `api-zod`. The `api-zod` package is exclusively a Zod-schema library for server-side validation.

**How to apply:** Any time codegen is re-run and `typecheck:libs` fails with TS2308 duplicate-export errors, check that `index.ts` hasn't been accidentally expanded to include the types barrel.
