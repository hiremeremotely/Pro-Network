# Hire Me Remotely

## Project Overview

LinkedIn-style professional networking platform for remote workers. Users and companies can create profiles, browse/post remote jobs, apply, and engage via a social feed.

**Live at:** `/` (landing page) and `/feed` (authenticated app)

---

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, Plus Jakarta Sans font
- **Primary color**: indigo `hsl(243 75% 59%)`

---

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

---

## Architecture

### Artifacts
- `artifacts/api-server` — Express API server (`@workspace/api-server`)
- `artifacts/proconnect` — React + Vite frontend (`@workspace/proconnect`)
- `artifacts/mockup-sandbox` — Canvas mockup preview server

### Packages
- `packages/db` — Drizzle schema + PostgreSQL client
- `packages/api-spec` — OpenAPI spec (source of truth for API)
- `packages/api-client` — Generated Orval fetch client
- `packages/api-client-react` — Generated Orval React Query hooks

---

## Database Schema (8 tables)

| Table | Purpose |
|---|---|
| `profiles` | Individual & company accounts (`accountType`: individual/company) |
| `education` | Education history linked to profiles |
| `experience` | Work experience linked to profiles |
| `portfolio` | Portfolio items linked to profiles |
| `skills` | Skills linked to profiles |
| `jobs` | Remote job postings (linked to company profiles) |
| `applications` | Job applications (profile → job) |
| `posts` | Social feed posts |

### Seeded Data
- 3 individual profiles: Alex Chen, Maria Santos, James Okafor
- 3 company profiles: Linear, Vercel, Figma
- 8 jobs linked to companies
- 6 social feed posts

---

## Frontend Pages

| Route | Page | Notes |
|---|---|---|
| `/` | Landing | Marketing page, no auth, own header |
| `/feed` | Social Feed | 3-column LinkedIn-style layout |
| `/profiles` | Network | Grid/List/Table view toggle |
| `/jobs` | Jobs | Grid/List/Table view toggle |
| `/jobs/:id` | Job Detail | Full job page with apply |
| `/applications` | Applications | List/Grid/Table view toggle |
| `/profiles/:id` | Profile | Public profile view |
| `/profile/edit` | Edit Profile | Edit current user profile |

---

## Key Components

- `components/view-toggle.tsx` — Reusable grid/list/table view switcher
- `components/layout.tsx` — App shell with top nav (LinkedIn-style)
- `components/profile-card.tsx` — Profile tile card
- `components/job-card.tsx` — Job listing card
- `components/loading-state.tsx` — LoadingState + ErrorState

---

## Important Implementation Notes

- **Auth**: No real auth — `CURRENT_PROFILE_ID = 1` hardcoded as "current user"
- **DB queries**: `execute()` returns `{ rows, ... }` — use `result.rows ?? result` pattern
- **API validation**: Use `zod/v4` not plain `zod` in API routes (bundling issue)
- **Logo**: `@assets/hr_1775483051104.png` via Vite alias → `attached_assets/`; also at `public/logo.png`
- **Landing page**: Uses its own header (not wrapped in Layout)
- **App pages**: All wrapped in Layout component

---

## What's Done ✅

- Full PostgreSQL schema + seeded data
- Complete REST API (profiles, education, experience, portfolio, skills, jobs, applications, posts)
- LinkedIn-style social feed at `/feed` with Like/Comment/Share wired to real API
- Marketing landing page at `/` with sign-in options (Google, Apple, Company)
- "For Companies" button in landing navbar
- Branding: "Hire Me Remotely" logo throughout
- View toggle (grid/list/table) on Network, Jobs, and Applications pages

## What's Next (Potential)

- Real authentication (Replit Auth or Clerk)
- Job application flow (cover letter modal, confirmation)
- Notifications page
- Company dashboard for managing job postings
- Profile completion progress indicator
- Direct messaging
