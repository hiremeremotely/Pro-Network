# Hire Me Remotely — Developer Documentation

A LinkedIn-style professional networking platform for remote workers. Users and companies can create profiles, browse and post remote jobs, apply, engage via a social feed, and communicate through direct messaging. Built as a **pnpm monorepo** on Replit with a React frontend, Express API, and PostgreSQL database.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Artifacts](#4-artifacts)
5. [Shared Libraries (`lib/`)](#5-shared-libraries-lib)
6. [Database](#6-database)
   - [Connection Setup](#61-connection-setup)
   - [Schema — All Tables](#62-schema--all-tables)
   - [Running Migrations](#63-running-migrations)
7. [API Server](#7-api-server)
   - [Application Bootstrap](#71-application-bootstrap)
   - [Route Map](#72-route-map)
   - [Authentication Flow](#73-authentication-flow)
   - [Logging](#74-logging)
   - [Build System](#75-build-system)
8. [Frontend (ProConnect)](#8-frontend-proconnect)
   - [Vite Configuration](#81-vite-configuration)
   - [Pages & Routes](#82-pages--routes)
   - [Key Components](#83-key-components)
   - [Auth Context](#84-auth-context)
   - [API Hooks (Codegen)](#85-api-hooks-codegen)
9. [OpenAPI & Code Generation](#9-openapi--code-generation)
10. [TypeScript Configuration](#10-typescript-configuration)
11. [Environment Variables](#11-environment-variables)
12. [Key Commands](#12-key-commands)
13. [Running Locally](#13-running-locally)
14. [Seeded Demo Data](#14-seeded-demo-data)
15. [Access Credentials](#15-access-credentials)

---

## 1. Project Overview

| Feature | Description |
|---|---|
| **Profiles** | Individual & company accounts with avatar upload, bio, links |
| **Jobs** | Companies post remote jobs; users browse and apply |
| **Social Feed** | LinkedIn-style posts with 6 reaction types and nested comments |
| **Messaging** | Full-page inbox + floating widget with direct and team channels |
| **Notifications** | Bell dropdown + notifications page (reactions, comments, messages) |
| **Connections** | Follow/connect with other professionals |
| **Company Dashboard** | HR tools — employee management, contracts, attendance, onboarding |
| **Backoffice** | Admin panel with platform-wide stats and user/job management |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | pnpm workspaces |
| **Runtime** | Node.js 24 |
| **Language** | TypeScript 5.9 |
| **API framework** | Express 5 |
| **Database** | PostgreSQL |
| **ORM** | Drizzle ORM + drizzle-zod |
| **Validation** | Zod (`zod/v4`) |
| **API contract** | OpenAPI 3.1 (`lib/api-spec/openapi.yaml`) |
| **API codegen** | Orval → React Query hooks + Zod schemas |
| **Server build** | esbuild (CJS → ESM bundle) |
| **Frontend build** | Vite 7 |
| **UI framework** | React 19 + Tailwind CSS 4 + shadcn/ui (Radix UI) |
| **Routing (frontend)** | wouter |
| **State / data fetching** | TanStack React Query v5 |
| **Icons** | lucide-react |
| **Fonts** | Plus Jakarta Sans |
| **Object storage** | Google Cloud Storage (presigned uploads) |
| **Logging** | pino + pino-http |

---

## 3. Repository Structure

```
.
├── artifacts/                  # Deployable application services
│   ├── api-server/             # Express REST API (@workspace/api-server)
│   ├── proconnect/             # React + Vite frontend (@workspace/proconnect)
│   └── mockup-sandbox/         # Design canvas preview server
│
├── lib/                        # Shared TypeScript libraries (composite, emit declarations)
│   ├── db/                     # Drizzle schema + PostgreSQL client (@workspace/db)
│   ├── api-spec/               # OpenAPI spec + Orval codegen config (@workspace/api-spec)
│   ├── api-client-react/       # Generated React Query hooks (@workspace/api-client-react)
│   ├── api-zod/                # Generated Zod schemas (@workspace/api-zod)
│   └── object-storage-web/     # Object storage helpers for the browser (@workspace/object-storage-web)
│
├── scripts/                    # Utility scripts (@workspace/scripts)
│   └── src/
│       └── hello.ts
│
├── package.json                # Root — orchestration scripts, shared devDependencies
├── pnpm-workspace.yaml         # Workspace package discovery, catalog pins, overrides
├── tsconfig.json               # Solution-level config (libs only)
├── tsconfig.base.json          # Shared strict TS defaults
└── pnpm-lock.yaml
```

### Naming conventions

- Workspace package names use the `@workspace/` prefix (e.g. `@workspace/db`).
- `lib/*` packages are **composite** (emit declarations via `tsc --build`).
- `artifacts/*` are **leaf** packages (checked with `tsc --noEmit`, never emit).
- The root `tsconfig.json` is a solution file for **libs only** — do not add artifacts to it.

---

## 4. Artifacts

### `artifacts/api-server` — REST API

| Property | Value |
|---|---|
| Package | `@workspace/api-server` |
| Entry point | `src/index.ts` |
| Preview path | `/api` |
| Dev command | `pnpm --filter @workspace/api-server run dev` |
| Port | `$PORT` (injected by Replit workflow) |

The dev script runs `build` (esbuild) then `start` (node). It **must not be called from the workspace root** — use the Replit workflow instead.

---

### `artifacts/proconnect` — React Frontend

| Property | Value |
|---|---|
| Package | `@workspace/proconnect` |
| Entry point | `src/main.tsx` |
| Preview path | `/` |
| Dev command | `pnpm --filter @workspace/proconnect run dev` |
| Port | `$PORT` (injected by Replit workflow) |
| Base path | `$BASE_PATH` (injected by Replit workflow) |

All public pages are served through the Replit reverse proxy at `/`. The Vite config reads `PORT` and `BASE_PATH` from environment at startup and throws if either is missing.

---

### `artifacts/mockup-sandbox` — Design Canvas

| Property | Value |
|---|---|
| Package | `@workspace/mockup-sandbox` |
| Preview path | `/__mockup` |

A design-only sandbox for component previews — not part of the main application runtime.

---

## 5. Shared Libraries (`lib/`)

### `lib/db` — Database Client & Schema

Exports:
- `db` — Drizzle ORM instance connected to PostgreSQL.
- `pool` — raw `pg.Pool` instance (for advanced use).
- All Drizzle table objects and TypeScript types (via barrel `src/schema/index.ts`).

```ts
// lib/db/src/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export * from "./schema";
```

Usage in API routes:

```ts
import { db, profilesTable } from "@workspace/db";

const rows = await db.select().from(profilesTable);
```

---

### `lib/api-spec` — OpenAPI Contract

The single source of truth for the API surface. File: `lib/api-spec/openapi.yaml`.

**Do not change `info.title`** — it is forced to `"Api"` by the Orval transformer and controls the generated filename (`api.ts`). Changing it will break all generated imports.

Run codegen after any spec change:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

### `lib/api-client-react` — Generated React Query Hooks

Auto-generated by Orval from the OpenAPI spec. Contains TanStack React Query hooks for every API operation. **Do not edit generated files** — re-run codegen instead.

---

### `lib/api-zod` — Generated Zod Schemas

Auto-generated by Orval. Contains Zod schemas for request/response types. Used by the frontend for form validation and type-safe API data.

---

### `lib/object-storage-web` — Browser Upload Helpers

Wraps the presigned upload flow for use in the React app (Uppy + GCS).

---

## 6. Database

### 6.1 Connection Setup

The database connection is driven entirely by the `DATABASE_URL` environment variable. The API server will throw at startup if it is missing.

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

On Replit, this variable is automatically injected when a PostgreSQL database is provisioned. The Drizzle config at `lib/db/drizzle.config.ts` also reads `DATABASE_URL` for migrations.

---

### 6.2 Schema — All Tables

All schemas live in `lib/db/src/schema/`. Every table uses `drizzle-zod` to auto-generate insert/update schemas and TypeScript types.

#### `profiles`

The central account table for both individual users and company accounts.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | Auto-increment |
| `account_type` | text | `"individual"` or `"company"` |
| `name` | text NOT NULL | Display name |
| `email` | text UNIQUE | Login email |
| `password_hash` | text | SHA-256 + salt (`hmr_salt_2026`) |
| `headline` | text NOT NULL | Short bio line |
| `bio` | text | Long bio |
| `location` | text | City / country |
| `industry` | text | Industry sector |
| `avatar_url` | text | Profile photo |
| `cover_url` | text | Cover/banner image |
| `website` | text | Personal/company website |
| `linkedin_url` | text | LinkedIn profile |
| `github_url` | text | GitHub profile |
| `twitter_url` | text | X / Twitter profile |
| `interests` | text[] | Array of interest tags |
| `open_to_work` | boolean | Default `false` |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-updated |

---

#### `education`

Work education history for individual profiles.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `profile_id` | integer | FK → `profiles.id` |
| `school` | text | Institution name |
| `degree` | text | Degree title |
| `field` | text | Field of study |
| `start_year` | integer | |
| `end_year` | integer | `null` = present |
| `description` | text | |
| `created_at` | timestamptz | |

---

#### `experience`

Work experience entries linked to a profile.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `profile_id` | integer | FK → `profiles.id` |
| `title` | text | Job title |
| `company` | text | Employer name |
| `location` | text | |
| `start_date` | text | Display string |
| `end_date` | text | `null` = current role |
| `description` | text | |
| `created_at` | timestamptz | |

---

#### `portfolio`

Portfolio project items linked to a profile.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `profile_id` | integer | FK → `profiles.id` |
| `title` | text | Project name |
| `description` | text | |
| `url` | text | Live link |
| `image_url` | text | Screenshot/thumbnail |
| `created_at` | timestamptz | |

---

#### `skills`

Individual skill tags linked to a profile.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `profile_id` | integer | FK → `profiles.id` |
| `name` | text | Skill label |
| `created_at` | timestamptz | |

---

#### `jobs`

Remote job postings created by company profiles.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `company_profile_id` | integer | FK → `profiles.id` (company) |
| `title` | text NOT NULL | |
| `company` | text NOT NULL | Company display name |
| `company_logo_url` | text | |
| `location` | text | e.g. "Remote – US" |
| `description` | text NOT NULL | Full job description |
| `category` | text NOT NULL | Job category |
| `experience_level` | text NOT NULL | e.g. `entry`, `mid`, `senior` |
| `salary_min` | integer | Annual salary (USD by default) |
| `salary_max` | integer | |
| `currency` | text | Default `"USD"` |
| `tags` | text[] | Skill/tech tags |
| `featured` | boolean | Default `false` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

#### `applications`

Job applications linking a profile to a job.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `job_id` | integer | FK → `jobs.id` (cascade delete) |
| `profile_id` | integer | FK → `profiles.id` (cascade delete) |
| `cover_letter` | text | Optional |
| `status` | text | `pending` / `reviewing` / `rejected` / `accepted` |
| `applied_at` | timestamptz | Auto-set |

---

#### `posts`

Social feed posts.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `profile_id` | integer NOT NULL | Author |
| `content` | text NOT NULL | Post body (supports JSON for shared posts/jobs) |
| `image_url` | text | Attached image |
| `likes_count` | integer | Denormalised counter |
| `comments_count` | integer | Denormalised counter |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

#### `post_reactions`

Reactions on posts (one per user per post, enforced by unique constraint).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `post_id` | integer | FK → `posts.id` (cascade delete) |
| `profile_id` | integer | Reactor |
| `reaction_type` | varchar(20) | `like`, `celebrate`, `support`, `love`, `insightful`, `funny` |
| `created_at` | timestamptz | |

Unique constraint: `(post_id, profile_id)` — one reaction per user per post.

---

#### `post_comments`

Comments on posts.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `post_id` | integer | FK → `posts.id` (cascade delete) |
| `profile_id` | integer | Commenter |
| `content` | text NOT NULL | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

#### `notifications`

LinkedIn-style notifications (reactions, comments, messages, connections).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `recipient_profile_id` | integer | Who receives the notification |
| `actor_profile_id` | integer | Who triggered it |
| `type` | varchar(20) | `reaction`, `comment`, `message`, `connection` |
| `post_id` | integer | Related post (nullable) |
| `conversation_id` | integer | Related conversation (nullable) |
| `reaction_type` | varchar(20) | Reaction type (nullable) |
| `message` | text NOT NULL | Human-readable message |
| `is_read` | boolean | Default `false` |
| `created_at` | timestamptz | |

---

#### `conversations`

Direct and team messaging conversations.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `participant1_id` | integer NOT NULL | Always the lower of the two IDs (direct) |
| `participant2_id` | integer NOT NULL | Always the higher of the two IDs (direct) |
| `last_message_at` | timestamptz | Updated on new message |
| `last_message_preview` | text | Truncated latest message |
| `type` | text | `"direct"` or `"team"` |
| `company_profile_id` | integer | Set for team channels |
| `created_at` | timestamptz | |

> **Important:** `participant1_id < participant2_id` is enforced via `orderedPair()` helper before any insert to prevent duplicate conversations.

---

#### `conversation_members`

Members of a conversation (used for team channels / multi-participant convs).

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `conversation_id` | integer NOT NULL | |
| `profile_id` | integer NOT NULL | |
| `joined_at` | timestamptz | |

Unique constraint: `(conversation_id, profile_id)`.

---

#### `messages`

Individual messages within a conversation.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `conversation_id` | integer NOT NULL | |
| `sender_profile_id` | integer NOT NULL | |
| `content` | text NOT NULL | Plain text or JSON (shared post/job) |
| `is_read` | boolean | Default `false` |
| `is_deleted` | boolean | Default `false` (soft delete) |
| `edited_at` | timestamptz | Set on edit |
| `created_at` | timestamptz | |

---

#### `connections`

Follow / connection requests between profiles.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `follower_id` | integer NOT NULL | Requester |
| `following_id` | integer NOT NULL | Target |
| `status` | text | `pending`, `accepted`, `rejected` |
| `request_message` | text | Optional note |
| `created_at` | timestamptz | |

Unique constraint: `(follower_id, following_id)`.

---

#### `bookmarks`

Saved items (jobs, posts) per user.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `profile_id` | integer NOT NULL | |
| `item_type` | text NOT NULL | `"job"` or `"post"` |
| `item_id` | integer NOT NULL | ID of the bookmarked item |
| `created_at` | timestamptz | |

Unique constraint: `(profile_id, item_type, item_id)`.

---

#### `employees`

Links an individual profile to a company as an employee.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `company_profile_id` | integer | FK → `profiles.id` (cascade delete) |
| `individual_profile_id` | integer | FK → `profiles.id` (cascade delete) |
| `job_id` | integer | FK → `jobs.id` (set null on delete) |
| `role` | text NOT NULL | Job title within company |
| `salary` | integer | Annual salary |
| `currency` | text | Default `"USD"` |
| `start_date` | timestamptz | Employment start |
| `status` | text | `active`, `inactive`, `terminated` |
| `created_at` / `updated_at` | timestamptz | |

---

#### `contracts`

Employment contracts linked to an employee record.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `employee_id` | integer | FK → `employees.id` (cascade delete) |
| `type` | text | `full-time`, `part-time`, `contract`, `freelance` |
| `start_date` | timestamptz | |
| `end_date` | timestamptz | `null` = open-ended |
| `rate` | numeric(12,2) | Hourly / monthly rate |
| `currency` | text | Default `"USD"` |
| `payment_status` | text | `paid`, `pending`, `overdue` |
| `notes` | text | |
| `created_at` / `updated_at` | timestamptz | |

---

#### `work_logs`

Daily hours logged by an employee.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `employee_id` | integer | FK → `employees.id` (cascade delete) |
| `date` | date NOT NULL | Work date |
| `hours` | numeric(5,2) | Hours worked |
| `description` | text | Work summary |
| `created_at` | timestamptz | |

---

#### `time_off_requests`

Employee time-off / leave requests.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `employee_id` | integer | FK → `employees.id` (cascade delete) |
| `start_date` | date NOT NULL | |
| `end_date` | date NOT NULL | |
| `reason` | text | |
| `status` | text | `pending`, `approved`, `rejected` |
| `reviewed_at` | timestamptz | Set when reviewed |
| `review_note` | text | Manager feedback |
| `created_at` | timestamptz | |

---

#### `onboarding_tasks`

Checklist items for a new employee's onboarding.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `employee_id` | integer | FK → `employees.id` (cascade delete) |
| `title` | text NOT NULL | Task description |
| `completed` | boolean | Default `false` |
| `completed_at` | timestamptz | Set when completed |
| `order` | integer | Display order |
| `created_at` | timestamptz | |

---

#### `employee_documents`

File attachments (contracts, IDs, etc.) stored in object storage.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `employee_id` | integer | FK → `employees.id` (cascade delete) |
| `file_name` | text NOT NULL | Original filename |
| `object_path` | text NOT NULL | GCS object key |
| `uploaded_at` | timestamptz | |
| `document_type` | text | `contract`, `id`, `other` |

---

### 6.3 Running Migrations

Drizzle uses `push` (schema sync) rather than migration files in development:

```bash
# Push schema changes to the dev database
pnpm --filter @workspace/db run push

# Force push (bypass confirmation prompts — use with care)
pnpm --filter @workspace/db run push-force
```

> Do **not** run push against production. For production, generate and review SQL migration files manually.

---

## 7. API Server

### 7.1 Application Bootstrap

```
artifacts/api-server/src/
├── index.ts          # Port binding — reads $PORT, starts Express
├── app.ts            # Express app setup: CORS, JSON, pino-http, /api router
├── routes/
│   ├── index.ts      # Combines all routers under /api
│   ├── auth.ts       # POST /auth/register, POST /auth/login
│   ├── profiles.ts   # CRUD for profiles
│   ├── education.ts  # CRUD for education entries
│   ├── experience.ts # CRUD for experience entries
│   ├── portfolio.ts  # CRUD for portfolio items
│   ├── skills.ts     # CRUD for skills
│   ├── jobs.ts       # Job listings CRUD
│   ├── applications.ts # Job applications
│   ├── feed.ts       # Social feed + link preview
│   ├── posts.ts      # Post CRUD + reactions + comments
│   ├── messaging.ts  # Conversations + messages
│   ├── notifications.ts # Notification read/list
│   ├── connections.ts  # Follow/connect operations
│   ├── bookmarks.ts  # Save/unsave items
│   ├── analytics.ts  # Dashboard analytics
│   ├── employees.ts  # Company employee management
│   ├── onboarding.ts # Onboarding tasks + documents
│   ├── contracts.ts  # Employment contracts
│   ├── attendance.ts # Work logs + time-off requests
│   ├── salary.ts     # Salary data
│   ├── storage.ts    # Presigned GCS upload + object serve
│   ├── admin.ts      # Backoffice admin endpoints
│   ├── health.ts     # GET /healthz
│   └── events.ts     # Server-sent events
├── lib/
│   └── logger.ts     # Pino singleton logger
└── middlewares/      # Shared Express middleware
```

All routes are mounted at `/api` in `app.ts`.

---

### 7.2 Route Map

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Authenticate and return profile |
| `GET` | `/api/profiles` | List all profiles |
| `GET` | `/api/profiles/:id` | Get single profile |
| `PATCH` | `/api/profiles/:id` | Update profile |
| `GET` | `/api/profiles/:id/education` | List education entries |
| `POST` | `/api/profiles/:id/education` | Add education entry |
| `PATCH` | `/api/education/:id` | Update education entry |
| `DELETE` | `/api/education/:id` | Delete education entry |
| *(same pattern)* | `/api/.../experience` | Work experience CRUD |
| *(same pattern)* | `/api/.../portfolio` | Portfolio CRUD |
| *(same pattern)* | `/api/.../skills` | Skills CRUD |
| `GET` | `/api/jobs` | List job postings |
| `GET` | `/api/jobs/:id` | Get job detail |
| `POST` | `/api/jobs` | Create job |
| `POST` | `/api/applications` | Apply for a job |
| `GET` | `/api/applications` | List applications (by profile or job) |
| `GET` | `/api/feed` | Social feed |
| `GET` | `/api/feed/link-preview` | Fetch OG metadata for a URL |
| `GET` | `/api/posts` | List posts |
| `POST` | `/api/posts` | Create post |
| `POST` | `/api/posts/:id/reactions` | React to a post |
| `POST` | `/api/posts/:id/comments` | Comment on a post |
| `GET` | `/api/conversations` | List conversations |
| `POST` | `/api/conversations` | Start a conversation |
| `GET` | `/api/conversations/:id/messages` | Get messages |
| `POST` | `/api/conversations/:id/messages` | Send a message |
| `PATCH` | `/api/conversations/:id/messages/:msgId` | Edit a message |
| `DELETE` | `/api/conversations/:id/messages/:msgId` | Soft-delete a message |
| `PATCH` | `/api/conversations/:id/read` | Mark conversation as read |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `GET` | `/api/notifications` | List notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark notification read |
| `GET` | `/api/connections` | List connections |
| `POST` | `/api/connections` | Send connection request |
| `PATCH` | `/api/connections/:id` | Accept / reject |
| `POST` | `/api/storage/uploads/request-url` | Get presigned upload URL |
| `GET` | `/api/storage/objects/:objectPath` | Serve private object |
| `GET` | `/api/admin/*` | Admin operations (stats, user management) |

---

### 7.3 Authentication Flow

There is no session middleware or JWT — authentication is a simple stateless check:

1. **Registration** — `POST /api/auth/register`
   - Accepts `name`, `email`, `password`, `accountType`, and optional profile fields.
   - Password is hashed with **SHA-256 + salt** (`hmr_salt_2026`).
   - Returns the created profile (without `passwordHash`).

2. **Login** — `POST /api/auth/login`
   - Looks up profile by email, compares hash.
   - Returns the profile on success.
   - HTTP 401 on mismatch.

3. **Frontend session** — The React app stores the returned profile object in `localStorage` under the key `app_user_session`. The `AppAuthProvider` / `useAppAuth()` hook reads and writes this key.

4. **Company login** — A separate `/login` flow validates that `accountType === "company"` before writing the session.

5. **Backoffice** — Hardcoded credentials (`admin@hiremeremotely.com` / `Admin@2026`), session stored in `sessionStorage` under `bo_admin_session`.

> **Security note:** This is a demo-grade auth implementation — no HTTPS-only cookies, no token rotation, no CSRF protection. Do not use in production without replacing it with a proper auth layer.

---

### 7.4 Logging

**Never use `console.log` in server code.**

Use the Pino-based helpers instead:

```ts
// In route handlers — request-scoped logger
router.get("/example", (req, res) => {
  req.log.info({ userId: 1 }, "handling request");
});

// Outside request context — singleton logger
import { logger } from "../lib/logger";
logger.error({ err }, "something went wrong");
```

In development, pino-pretty formats output for readability. In production the output is structured JSON.

---

### 7.5 Build System

The API server is bundled with **esbuild** into a single ESM file (`dist/index.mjs`):

```bash
# Full build (typecheck + esbuild)
pnpm --filter @workspace/api-server run build

# Run the built output
pnpm --filter @workspace/api-server run start

# Dev: build + start (no watch)
pnpm --filter @workspace/api-server run dev
```

The build script (`build.mjs`) externalises native binaries and packages that cannot be bundled (e.g. `pg-native`, `sharp`, `@google-cloud/*`). A CJS-compatibility banner is injected so CommonJS packages like Express work inside an ESM output.

---

## 8. Frontend (ProConnect)

### 8.1 Vite Configuration

| Setting | Value |
|---|---|
| Framework | React + `@vitejs/plugin-react` |
| CSS | Tailwind CSS 4 via `@tailwindcss/vite` |
| Port | `$PORT` env var (required) |
| Base path | `$BASE_PATH` env var (required) |
| Path alias `@` | `artifacts/proconnect/src` |
| Path alias `@assets` | `attached_assets/` (at workspace root) |
| Build output | `artifacts/proconnect/dist/public` |
| Allowed hosts | `true` (required for Replit proxy) |

Both `PORT` and `BASE_PATH` **must** be set before starting Vite; the config throws otherwise.

---

### 8.2 Pages & Routes

All app pages are wrapped in the `<Layout>` component (top navigation bar). The landing page has its own standalone header.

| Route | File | Description |
|---|---|---|
| `/` | `landing.tsx` | Marketing landing page |
| `/login` | `login.tsx` | Individual sign-in |
| `/company-login` | `company-login.tsx` | Company sign-in |
| `/signup` | `signup.tsx` | Registration |
| `/feed` | `feed.tsx` | LinkedIn-style social feed |
| `/profiles` | `profiles.tsx` | Network — grid/list/table toggle |
| `/profiles/:id` | `profile-detail.tsx` | Public profile + inline editing |
| `/profile/edit` | `profile-edit.tsx` | Edit current user profile |
| `/jobs` | `jobs.tsx` | Job listings — grid/list/table toggle |
| `/jobs/:id` | `job-detail.tsx` | Full job page with apply modal |
| `/applications` | `applications.tsx` | Applicant's application tracker |
| `/notifications` | `notifications.tsx` | Notification inbox with filter tabs |
| `/messaging` | `messaging.tsx` | Full-page chat inbox |
| `/company-dashboard` | `company-dashboard.tsx` | Company home + HR tools |
| `/my-work` | `my-work.tsx` | Employee portal |
| `/analytics` | `analytics.tsx` | Analytics dashboard |
| `/salary-estimator` | `salary-estimator.tsx` | Salary insights |
| `/my-items` | `my-items.tsx` | Bookmarked jobs and posts |
| `/bo` | `bo-login.tsx` | Backoffice admin login |
| `/bo/dashboard` | `admin.tsx` | Admin panel (stats, user/job management) |
| `*` | `not-found.tsx` | 404 page |

---

### 8.3 Key Components

| Component | File | Description |
|---|---|---|
| `Layout` | `components/layout.tsx` | App shell — top nav, notification bell, messaging widget mount |
| `MessagingWidget` | `components/messaging-widget.tsx` | Floating chat widget (bottom-right). Hidden on `/messaging` to avoid duplication |
| `NotificationBell` | `components/notification-bell.tsx` | Bell icon with unread badge and dropdown |
| `ProfileCard` | `components/profile-card.tsx` | Profile tile used in the network grid |
| `JobCard` | `components/job-card.tsx` | Job listing card |
| `ViewToggle` | `components/view-toggle.tsx` | Reusable Grid / List / Table switcher |
| `LoadingState` / `ErrorState` | `components/loading-state.tsx` | Consistent loading and error UIs |
| `HRInsightsWidget` | `components/hr-insights-widget.tsx` | HR analytics widget for company dashboard |

---

### 8.4 Auth Context

`src/contexts/app-auth.tsx` exports:

```ts
// Hook — use anywhere inside the app tree
const { user, login, signup, logout } = useAppAuth();

// user shape
interface AppUser {
  id: number;
  name: string;
  email: string;
  accountType: "individual" | "company";
  headline: string;
  avatarUrl?: string | null;
}
```

**Session persistence** — the user object is JSON-serialised into `localStorage["app_user_session"]`. On page load the provider reads this key to restore the session instantly.

**Password hashing** — done server-side: `SHA-256(password + "hmr_salt_2026")`.

---

### 8.5 API Hooks (Codegen)

Generated React Query hooks from `@workspace/api-client-react` are available for all endpoints defined in the OpenAPI spec. Example:

```ts
import { useGetProfiles } from "@workspace/api-client-react";

const { data, isLoading, error } = useGetProfiles();
```

For endpoints not yet in the spec, use `fetch` directly with `BASE_URL`:

```ts
const BASE = import.meta.env.BASE_URL;
const res = await fetch(`${BASE}api/conversations?profileId=${user.id}`);
```

> Use `${BASE}api/...` not `/api/...` — the `BASE_URL` already includes the correct path prefix for the Replit proxy.

---

## 9. OpenAPI & Code Generation

The contract-first workflow:

```
lib/api-spec/openapi.yaml          ← Edit this
         │
         ▼
pnpm --filter @workspace/api-spec run codegen
         │
         ├──► lib/api-client-react/src/generated/   (React Query hooks)
         └──► lib/api-zod/src/generated/             (Zod schemas)
```

After codegen, run `pnpm run typecheck:libs` to verify the lib declarations are up to date before checking leaf packages.

**Orval config** (`lib/api-spec/orval.config.ts`):
- Generates **React Query** hooks (client: `react-query`) into `lib/api-client-react`.
- Generates **Zod schemas** (client: `zod`) into `lib/api-zod`.
- Uses a custom `customFetch` mutator from `lib/api-client-react/src/custom-fetch.ts` for all requests.
- Coerces query/param strings to `boolean` and `number` automatically.

---

## 10. TypeScript Configuration

```
tsconfig.base.json        ← Shared strict compiler options (all packages extend this)
tsconfig.json             ← Solution file (libs only) for tsc --build
lib/*/tsconfig.json       ← composite: true, emitDeclarationOnly: true
artifacts/*/tsconfig.json ← noEmit: true (leaf, never emit)
```

Key options in `tsconfig.base.json`:

| Option | Value | Why |
|---|---|---|
| `strict` (subset) | Various `strict*: true` | Type safety |
| `target` | `es2022` | Node 24 / modern browsers |
| `module` | `esnext` | ESM throughout |
| `moduleResolution` | `bundler` | Works with Vite + esbuild |
| `noImplicitAny` | `true` | No silent `any` |
| `strictNullChecks` | `true` | Null safety |
| `skipLibCheck` | `true` | Avoid errors in generated `.d.ts` |
| `customConditions` | `["workspace"]` | Resolves `exports` with the `workspace` condition |

---

## 11. Environment Variables

| Variable | Required by | Description |
|---|---|---|
| `DATABASE_URL` | `@workspace/db`, `@workspace/api-server` | PostgreSQL connection string |
| `PORT` | `@workspace/api-server`, `@workspace/proconnect` | HTTP port to bind (injected by Replit workflow) |
| `BASE_PATH` | `@workspace/proconnect` | Vite base URL prefix (injected by Replit workflow) |
| `NODE_ENV` | API server, Vite | `development` or `production` |
| `REPL_ID` | Vite config | Enables Replit-specific Vite plugins when set |
| `GOOGLE_CLOUD_*` | `@workspace/api-server` | GCS credentials for object storage (presigned uploads) |

On Replit, `DATABASE_URL`, `PORT`, and `BASE_PATH` are automatically provisioned — do not hardcode them.

---

## 12. Key Commands

```bash
# ── Full project ────────────────────────────────────────────────────────────
pnpm run typecheck          # Full typecheck: build libs → check all artifacts
pnpm run typecheck:libs     # Build composite libs only (tsc --build)
pnpm run build              # typecheck + build all packages

# ── API codegen ─────────────────────────────────────────────────────────────
pnpm --filter @workspace/api-spec run codegen
# Regenerates lib/api-client-react and lib/api-zod from openapi.yaml

# ── Database ─────────────────────────────────────────────────────────────────
pnpm --filter @workspace/db run push          # Sync schema to dev DB
pnpm --filter @workspace/db run push-force    # Force sync (skip prompts)

# ── Individual packages ───────────────────────────────────────────────────
pnpm --filter @workspace/api-server run build     # Build API server only
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/proconnect run typecheck
pnpm --filter @workspace/db run push
```

> **Do not** run `pnpm run dev` at the workspace root — there is no root dev script. Individual services are started via Replit workflows.

---

## 13. Running Locally

Services are managed by Replit **workflows** (not manual `pnpm dev`). The workflows inject `PORT`, `BASE_PATH`, and `DATABASE_URL` automatically.

| Workflow name | Command |
|---|---|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |
| `artifacts/proconnect: web` | `pnpm --filter @workspace/proconnect run dev` |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` |

**Proxy routing** — a global reverse proxy routes traffic by path:

| Path prefix | Service |
|---|---|
| `/api` | API server |
| `/` | ProConnect (React app) |
| `/__mockup` | Mockup sandbox |

All services must use `$PORT` from the environment — never hardcode a port. For ad-hoc `curl` requests in the shell, always go through the shared proxy at `localhost:80`, not the service port directly:

```bash
# Correct
curl localhost:80/api/healthz

# Wrong — bypasses proxy
curl localhost:8080/api/healthz
```

---

## 14. Seeded Demo Data

The development database is pre-populated with:

| Type | Count | Examples |
|---|---|---|
| Individual profiles | 3 | Alex Chen, Maria Santos, James Okafor |
| Company profiles | 3 | Linear, Vercel, Figma |
| Jobs | 8 | Various remote roles linked to the companies |
| Social feed posts | 6 | Sample posts from the individual profiles |

---

## 15. Access Credentials

### App — Individual sign-in
Sign up with any email at `/signup`. Existing demo users can be accessed by registering or updating via the API.

### App — Company sign-in
Use the **"For Companies"** option on `/login` or navigate to `/company-login`.

### Backoffice Admin Panel
| Field | Value |
|---|---|
| URL | `/bo` |
| Email | `admin@hiremeremotely.com` |
| Password | `Admin@2026` |

---

## Contributing

1. Define the API contract change in `lib/api-spec/openapi.yaml`.
2. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks/schemas.
3. Implement the route in `artifacts/api-server/src/routes/`.
4. Add the new schema to `lib/db/src/schema/` if needed, then `pnpm --filter @workspace/db run push`.
5. Use the generated hooks on the frontend via `@workspace/api-client-react`.
6. Run `pnpm run typecheck` before committing to catch any type errors.

> Use `zod/v4` (not plain `zod`) in API server route files — the bundling setup requires it.
