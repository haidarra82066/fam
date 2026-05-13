# Family App Architecture Plan

## 1) Current Repository Scan

### Repository contents
- `server.js`: Single Express server with inline SQLite schema setup and API routes.
- `database.sqlite`: Local SQLite database file committed in repository.
- `frontend/index.html`: Static HTML shell.
- `frontend/app.js`: Vanilla JS UI logic and API calls.
- `frontend/style.css`: Basic styling.
- `package.json` + `package-lock.json`: Node package metadata/lockfile.
- `README.md`: Minimal environment note.

### Current runtime architecture
- **Backend**: Node.js + Express in one file (`server.js`).
- **Data**: SQLite with one `users` table:
  - `id`, `username`, `tree` (JSON string), `session_token`.
- **Auth model**:
  - Pseudo-login via `POST /login` with username only.
  - Server generates a random session token and stores it on user row.
  - No password, no email verification, no roles, no approval workflow.
- **API surface**:
  - `POST /login`: create or fetch user and issue session token.
  - `POST /save`: save full tree blob for user if token matches.
- **Frontend**:
  - Static page with a button to add people.
  - Uses `prompt()` for username and person name.
  - Renders people as plain divs, no relationship edges.
  - Saves entire in-memory array on each add.

### Current limitations/gaps vs production target
- No framework-level routing or server/client separation.
- No TypeScript, no typed API contracts, no schema validation library.
- No real authentication or session lifecycle management.
- No authorization/row-level ownership rules.
- No admin approval or user onboarding flow.
- Single-table denormalized data model (`tree` JSON blob) not suitable for collaboration/querying.
- No file/media storage pipeline.
- No visual graph/canvas tooling (React Flow).
- No auto layout for genealogy relationships.
- No migration strategy, no test strategy, no CI/CD.

---

## 2) Files to Replace or Migrate

## Files to replace entirely
- `server.js` → replaced by Next.js App Router (`app/` routes + server actions where appropriate).
- `frontend/index.html` → replaced by `app/(public)/...` and app layout components.
- `frontend/app.js` → replaced by React + TypeScript components/hooks.
- `frontend/style.css` → replaced by Tailwind CSS + shadcn/ui tokens/components.

## Files to migrate/transform
- `package.json` / `package-lock.json`
  - Convert scripts/dependencies for Next.js, TypeScript, Tailwind, shadcn/ui, Supabase clients, React Flow, Zod.
- `README.md`
  - Expand into setup/run/deploy docs for Next.js + Supabase + Vercel.
- `database.sqlite`
  - **Do not carry forward as runtime DB**.
  - Migrate legacy user/tree data into Supabase Postgres via one-time migration script.

## New major files/directories expected
- `app/` (App Router pages, route handlers).
- `components/` (UI + graph/editor components).
- `lib/` (Supabase clients, auth helpers, validators, layout utilities).
- `types/` (domain types).
- `supabase/` (SQL migrations, RLS policies, seed scripts).
- `docs/` (architecture, operations, migration runbooks).

---

## 3) Target Architecture (Proposed)

## Frontend/Application layer
- **Next.js App Router + TypeScript**.
- **Tailwind CSS** for styling and design tokens.
- **shadcn/ui** for consistent primitives (forms, dialogs, tables, toasts, cards).
- **React Flow** for interactive family tree canvas (nodes=bubbles, edges=relations).
- **State/data strategy**:
  - Server Components for initial data loading where possible.
  - Client Components for canvas/editor interactions.
  - Typed DTOs + Zod parsing at all client/server boundaries.

## Auth & user lifecycle
- **Supabase Auth** (email/password or magic link, configurable).
- New user status flow:
  1. User signs up.
  2. Profile created with status `pending`.
  3. Admin reviews and sets status `approved` or `rejected`.
  4. Only approved users can create/edit trees.
- Route/middleware guards in Next.js to enforce approval gates.

## Data layer (Supabase Postgres)
Suggested normalized schema:
- `profiles` (`id` = auth user id FK, display_name, role, approval_status, timestamps).
- `families` (id, owner_id, name, description, visibility, timestamps).
- `family_members` (id, family_id, created_by, first_name, last_name, birth/death metadata, notes, avatar_path, x/y optional manual overrides).
- `relationships` (id, family_id, from_member_id, to_member_id, relation_type e.g. parent/partner/adoptive_parent, metadata).
- `tree_views` or `tree_layouts` (optional persisted layout snapshots/settings).
- `audit_logs` (optional but recommended for admin actions).

## Authorization & security
- **Supabase Row Level Security (RLS)** on all user-generated tables.
- Policies by role and ownership/membership:
  - Pending users: read minimal own-profile only.
  - Approved users: CRUD on families they own or are granted collaborator access to.
  - Admin users: moderation + approval + broader read.
- Use server-side Supabase client for privileged operations only.

## Storage layer
- **Supabase Storage** buckets:
  - `avatars` (member profile images).
  - optional `documents` (family docs).
- Bucket-level policies aligned with table ownership and RLS semantics.

## Validation
- **Zod** for:
  - form validation (client).
  - route handler/server action validation (server).
  - inferred TypeScript types from schema.

## Genealogy layout engine
- Start with **Dagre** layered layout for deterministic initial placement.
- Provide custom post-processing rules for genealogy-specific spacing:
  - same-generation alignment,
  - partner proximity,
  - parent-child vertical ordering,
  - avoidance of crossing edges where possible.
- Persist user-adjusted positions to DB as overrides.

---

## 4) Migration Plan

## Data migration
1. Export legacy SQLite users and serialized tree JSON.
2. Map each legacy user to Supabase auth identity (manual/admin-assisted bootstrap may be required since legacy has no passwords/emails).
3. Transform legacy `tree` array entries into `family_members` rows.
4. If legacy records contain only names (no edges), initialize as unconnected nodes in a default family per user.
5. Verify counts and referential integrity.

## App migration
1. Scaffold Next.js TypeScript app in-repo.
2. Introduce Tailwind + shadcn/ui.
3. Add Supabase clients and environment configuration.
4. Implement auth pages + middleware + approval gating.
5. Implement admin approval dashboard.
6. Implement family CRUD + member/relationship CRUD APIs.
7. Build React Flow editor with Dagre auto-layout and manual drag persistence.
8. Add storage upload flows for avatars.
9. Remove/retire Express static app and SQLite runtime.

---

## 5) Risks and Mitigations

- **Identity migration risk** (legacy users lack strong identity attributes).
  - Mitigation: admin-assisted account linking/import script and forced credential setup.
- **RLS policy complexity** can block legitimate queries.
  - Mitigation: incremental policy rollout + policy test matrix.
- **Graph layout correctness** for non-trivial family structures.
  - Mitigation: staged layout support (baseline Dagre then genealogy refinements).
- **Performance risk** with large trees in browser.
  - Mitigation: viewport virtualization patterns, memoization, paged fetching, edge simplification.
- **Operational risk** from mixed old/new stack during transition.
  - Mitigation: feature-flagged rollout and clear cutover checkpoint.

---

## 6) Phased Implementation Tasks

## Phase 0 — Foundation
- Initialize Next.js App Router + TypeScript.
- Add linting/formatting/test baseline.
- Add Tailwind + shadcn/ui.
- Configure environment variables and secrets handling.

## Phase 1 — Auth + Approval Workflow
- Supabase Auth integration.
- `profiles` table + trigger for profile bootstrap.
- Approval status workflow + admin UI.
- Middleware/guards for protected routes.

## Phase 2 — Domain Data Model + RLS
- Create Postgres schema for families/members/relationships.
- Implement and test RLS policies.
- Build typed data access layer.

## Phase 3 — Tree Editor
- React Flow canvas with custom node/edge components.
- CRUD interactions for members/relationships.
- Dagre auto-layout + position persistence.

## Phase 4 — Storage + Media
- Supabase Storage bucket setup.
- Avatar upload/replace/delete flows.
- Secure URL strategy and policies.

## Phase 5 — Legacy Migration + Cutover
- Build one-time SQLite export/import tooling.
- Data validation reports.
- Switch traffic to Next.js app and archive old stack.

## Phase 6 — Hardening
- E2E tests for signup→approval→tree editing.
- Monitoring/logging/error tracking.
- Accessibility and performance passes.

---

## 7) Deployment Plan (Vercel + Supabase)

## Supabase setup
- Create Supabase project (prod + staging recommended).
- Apply SQL migrations for schema/RLS.
- Configure Auth providers and redirect URLs.
- Create storage buckets/policies.

## Vercel setup
- Connect GitHub repo to Vercel.
- Set environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - additional app secrets.
- Configure Preview + Production environments.

## CI/CD workflow
- On PR: run typecheck, lint, unit tests, and migration checks.
- On merge to main: deploy to Vercel production.
- Run post-deploy smoke checks (auth, approved-user access, tree load/save).

## Rollback strategy
- Keep previous production deployment in Vercel for instant rollback.
- Use forward-only DB migrations with compensating migrations documented.
- Gate risky features with flags to disable without full rollback.
