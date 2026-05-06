# CLAUDE.md — EstimateFlow

This file is the operating manual for any Claude (or human) working on **EstimateFlow**, a web-first AI-assisted estimating SaaS for contractors. Read it before generating code, scaffolding files, or making architectural recommendations.

The full product spec lives at `docs/SPEC.md` — treat it as the source of truth for *what* we're building. This file covers *how* we build it.

---

## Product One-Liner

Help contractors create professional, accurate estimates in under 3 minutes — and get approval or payment with minimal friction. Estimate-first, mobile-first, AI-assisted (never AI-controlled).

See `docs/SPEC.md` for full vision, JTBD, MVP scope, AI rules, and non-goals.

---

## Stack (Locked)

| Layer | Tech |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Auth + DB | Supabase (Postgres + RLS + Auth) |
| Payments | Stripe + Stripe Connect (contractors receive payouts) |
| Email | Resend |
| AI | Anthropic API via Vercel serverless function (`/api/ai/*`) |
| Deployment | Vercel |
| Offline buffer | IndexedDB via `idb-keyval` |
| Drag-and-drop | `@dnd-kit/core` |

**Why Supabase, not Firebase**: relational data, multi-tenant RLS, SQL queries for reporting/analytics, joinable line items.

---

## Non-Negotiable Rules

1. **Multi-tenant from day one.** Every domain table has `organization_id`. Every RLS policy filters on org membership. No exceptions.
2. **Money in integer cents.** Never floats. Use a `Money` utility (`src/utils/money.ts`) for all arithmetic. Display formatting only at the edge.
3. **Server-authoritative totals.** Client computes for UX; server recomputes on save and on send. Never trust client-side totals for invoices or payments.
4. **No `VITE_`-prefixed secrets.** Anything sensitive (Anthropic, Stripe secret, Resend) goes through `/api/*` serverless. Supabase anon key and Supabase URL are safe as `VITE_`.
5. **RLS on every table.** Default deny. Write policies before writing frontend queries.
6. **AI never auto-acts.** AI drafts, suggests, ranges. Contractor sends. See spec §15.
7. **TypeScript strict, no `any`.** Use `unknown` and narrow.

---

## Data Model (Core Entities)

```
organizations          → tenant root
organization_members   → user_id × organization_id × role
clients                → contractor's customers
estimates              → header (status, totals, client_id, org_id)
estimate_sections      → ordered groups within an estimate (position int)
estimate_line_items    → section_id, position, qty, unit_price_cents, markup_pct, optional bool
estimate_options       → Good/Better/Best option groups (post-MVP if needed)
estimate_attachments   → photos linked to section_id or line_item_id
invoices               → generated from approved estimate
payments               → Stripe payment records
ai_usage_events        → tokens, cost_cents, estimate_id, user_id, model
automations            → editable rule rows (reminder schedules, notify prefs)
```

**Position columns** are integers with gaps (10, 20, 30...) so reorder is one update, not a renumber.

**Status enums** live in Postgres types (`estimate_status`, `invoice_status`) to keep DB and TS aligned.

---

## Project Structure

```
estimateflow/
├── api/                    # Vercel serverless (Anthropic, Stripe webhooks, Resend)
├── public/
├── src/
│   ├── components/
│   │   ├── ui/             # Button, Input, Modal, etc.
│   │   ├── estimate/       # Editor, line item row, section, totals bar
│   │   └── client/         # Public estimate view, approval flow
│   ├── pages/              # Route-level (Dashboard, EstimateEdit, ClientView)
│   ├── hooks/              # useAuth, useEstimate, useAutosave, useOffline
│   ├── lib/                # supabase.ts, stripe.ts
│   ├── services/           # estimates.ts, invoices.ts, ai.ts (calls /api)
│   ├── stores/             # Zustand: editorStore, syncQueueStore
│   ├── types/              # Generated from Supabase + hand-written
│   ├── utils/              # money.ts, dates.ts, id.ts
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/         # SQL migrations, numbered
│   └── seed.sql            # local dev seed
├── docs/
│   └── SPEC.md             # full product spec
├── .env.local              # gitignored
├── .env.example            # committed, empty values
├── .nvmrc
├── vercel.json             # SPA rewrite + API route config
└── CLAUDE.md               # this file
```

---

## Editor Architecture (the hardest part)

- **State**: single Zustand store (`editorStore`) holds the current estimate as a normalized tree (sections, line items keyed by id).
- **Autosave**: debounced 800ms after last edit. Writes go through a sync queue (`syncQueueStore`).
- **Offline**: queue persists to IndexedDB. On reconnect, replay in order. Conflicts resolved last-write-wins for MVP — flag for future CRDT consideration.
- **Reorder**: `@dnd-kit` updates `position` locally, queue patches the changed rows only.
- **Server recompute**: every save triggers a `recalculate_estimate_totals(estimate_id)` Postgres function. Client totals are advisory.
- **Photos**: upload to Supabase Storage, store the path in `estimate_attachments`. Thumbnail generated by an Edge Function on insert.

---

## AI Boundaries (Spec §11–17)

- AI calls go to `/api/ai/draft-estimate` and `/api/ai/analyze-photo` only. Never client-side.
- Every AI-generated section is tagged `source: 'ai'` in the DB and rendered with a "Suggested by AI — review before sending" badge.
- AI returns **ranges** (low/typical/high), never a single number.
- Log every call to `ai_usage_events` (tokens in/out, cost_cents, model, latency_ms). This is non-optional — needed for metering and for measuring AI edit-distance (see Success Metrics, spec §20).
- **AI pricing decision pending** (see Open Questions). Schema supports metering either way.

---

## Stripe Connect Notes

- Contractors are **connected accounts** (Express onboarding). Clients pay through the platform; payouts go to contractor's connected account.
- Platform fee configurable per org (default 0% during launch).
- Webhooks land at `/api/stripe/webhook` — verify signature, idempotent handling via `stripe_events` table.
- Never expose `STRIPE_SECRET_KEY` to the client. `STRIPE_PUBLISHABLE_KEY` is fine as `VITE_`.

---

## Quality Gates (before every deploy)

```bash
npm run lint
npm run type-check
npm run build
npm run test          # vitest, once tests exist
```

Plus:
- [ ] No hardcoded secrets in source
- [ ] RLS verified on any new table (run a denied-query test)
- [ ] Vercel preview tested before merge to `main`
- [ ] Migration runs cleanly on a fresh DB

---

## Git Workflow

- `main` always deployable.
- Feature branches: `feature/editor-line-items`, `fix/autosave-race`.
- Commit prefix: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- PR with Vercel preview before merge — even solo.

---

## Open Questions (resolve before they bite)

1. **AI pricing model** — included by default, paid add-on, or usage-tiered? Affects whether we surface usage to the user. Schema is ready either way.
2. **Plan tiers** — what's free vs paid? Spec says "flat tiers, no per-user fees" but doesn't define limits.
3. **Estimate numbering** — per-org sequence or random? Per-org sequence is more professional but needs a sequence table to avoid race conditions.
4. **Tax engine** — Stripe Tax, TaxJar, or hand-rolled ZIP-based lookup? Spec §5.3 needs an answer before launch.
5. **Client approval signature** — typed name only for MVP, or include canvas signature pad? Spec says optional; default off.

---

## What This File Is Not

- Not a substitute for `docs/SPEC.md` — go there for product intent.
- Not a tutorial — assumes the reader knows React, TS, and Supabase.
- Not exhaustive — when in doubt, follow Bob's web dev conventions (see his skill file).

<!-- GSD:project-start source:PROJECT.md -->
## Project

**EstimateFlow**

EstimateFlow is a web-first AI-assisted estimating SaaS for contractors. Contractors create professional estimates in under 3 minutes, get AI-drafted line items they review and approve, and send estimates to clients. MVP ships estimates-only — the contractor-facing product loop — with client approval and payment collection coming in v1.1.

**Core Value:** A contractor can create a complete, accurate estimate in under 3 minutes using AI assistance — and send it the same session.

### Constraints

- **Multi-tenancy**: Every domain table has organization_id; every RLS policy filters on org membership — no exceptions
- **Security**: Anthropic key, Stripe secret, Resend key never exposed to client — go through /api/* only
- **TypeScript**: Strict mode, no `any`. Use `unknown` and narrow.
- **Server authority**: Client computes totals for UX; server recomputes on save. Never trust client totals for business logic.
- **AI autonomy**: AI drafts and suggests only. Contractor sends. AI never auto-acts.
- **Offline**: Sync queue must survive browser close; IndexedDB via idb-keyval.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 6.0.2 - Frontend application and build configuration (strict mode enforced)
- SQL - Postgres database schema and migrations
- JavaScript - Configuration files (eslint.config.js)
- HTML/CSS - UI rendering via React
## Runtime
- Node.js (version managed via `.nvmrc`, not yet created in working branch)
- npm (inferred from package.json structure)
- Lockfile: `package-lock.json` (not visible in exploration, standard for npm)
## Frameworks
- React 18.3.1 - UI framework with strict mode
- React DOM 18.3.1 - DOM rendering
- Vite 8.0.10 - Build tool and dev server
- @vitejs/plugin-react 6.0.1 - React plugin for Vite
- TypeScript 6.0.2 - Type checking and compilation
- Vitest 4.1.5 - Unit test runner (configured in `vite.config.ts`)
- @vitest/ui 4.1.5 - Vitest UI dashboard
- @testing-library/react 16.3.2 - React component testing
- @testing-library/jest-dom 6.9.1 - DOM matchers
- jsdom 29.1.1 - DOM environment for tests
- ESLint 10.2.1 - JavaScript/TypeScript linter (flat config in `eslint.config.js`)
- typescript-eslint 8.58.2 - TypeScript support for ESLint
- @eslint/js 10.0.1 - Core ESLint rules
- eslint-plugin-react-hooks 7.1.1 - React hooks linting
- eslint-plugin-react-refresh 0.5.2 - React Fast Refresh validation
- Supabase CLI 2.98.0 - Database migrations and local development
## Key Dependencies
- @supabase/supabase-js 2.105.1 - Supabase client SDK for database and auth (ONLY stable dependency, pinned to patch version)
- React 18.3.1 - Core UI framework
- Not yet installed: @dnd-kit/core (drag-and-drop, mentioned in CLAUDE.md)
- Not yet installed: zustand (state management, mentioned in CLAUDE.md)
- Not yet installed: idb-keyval (offline IndexedDB, mentioned in CLAUDE.md)
- Not yet installed: @supabase/storage-js (file storage via Supabase Storage, mentioned in CLAUDE.md)
- Not yet installed: stripe (payments SDK, mentioned in CLAUDE.md)
- Not yet installed: tailwind (styling, mentioned in CLAUDE.md)
- Not yet installed: react-router (routing, mentioned in CLAUDE.md as v6)
- @types/react 18.3.23 - React type definitions
- @types/react-dom 18.3.7 - React DOM type definitions
- @types/node 24.12.2 - Node.js type definitions
- globals 17.5.0 - Global variable definitions for ESLint
## Configuration
- Configured via `.env.example` (committed with empty values)
- Secrets stored in `.env.local` (git-ignored)
- `ANTHROPIC_API_KEY` - Anthropic API for AI features (consumed via `/api/*` serverless only)
- `STRIPE_SECRET_KEY` - Stripe secret key (consumed via `/api/*` serverless only)
- `RESEND_API_KEY` - Resend email API key (consumed via `/api/*` serverless only)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `vite.config.ts` - Vite build configuration (React plugin, test environment)
- `tsconfig.json` - TypeScript compiler options with references to `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json` - Application-level TypeScript config (not visible in exploration)
- `tsconfig.node.json` - Build/config TypeScript config (not visible in exploration)
- `eslint.config.js` - ESLint flat configuration (browser globals, React hooks/refresh, TypeScript rules)
## Platform Requirements
- Node.js runtime
- npm for package management
- Supabase CLI for local database development (`supabase start`)
- Vercel account (for serverless functions)
- Vercel deployment platform (via `vercel.json`)
- Postgres database (Supabase)
- S3-compatible storage (Supabase Storage)
## Build Scripts
- All scripts must pass before merge to `main`
- No hardcoded secrets in source
- RLS policies verified on new tables
- Vercel preview tested
## Deployment Configuration
- `vercel.json` file present (SPA rewrite + API route configuration)
- Serverless functions route at `/api/*`
- AI endpoints: `/api/ai/draft-estimate`, `/api/ai/analyze-photo`
- Stripe webhook endpoint: `/api/stripe/webhook`
- Next.js-style routing (Vercel serverless)
- Config: `supabase/config.toml`
- API port: 54321
- DB port: 54322
- Migrations in: `supabase/migrations/` (numbered SQL files)
- Seed data: `supabase/seed.sql`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- TypeScript source files: `camelCase.ts` (e.g., `supabase.ts`, `money.ts`)
- React components: `PascalCase.tsx` (e.g., `App.tsx`)
- Test files: `filename.test.ts` or `filename.test.tsx` (e.g., `money.test.ts`)
- Utility functions: lowercase in `utils/` directory (e.g., `src/utils/money.ts`)
- Export named functions: camelCase (e.g., `dollarsToCents`, `applyMarkup`, `formatCents`)
- Async functions: camelCase with clear intent (e.g., `fetchEstimate`, `saveLineItem`)
- Event handlers in components: `handleEventName` (e.g., `handleClick`, `handleChange`)
- React hooks: `use` prefix (e.g., `useAuth`, `useEstimate`, `useAutosave`, `useOffline`)
- Local variables and parameters: camelCase (e.g., `count`, `unitPriceCents`, `markupPct`)
- Constants: camelCase for non-global, ALL_CAPS for global constants (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
- Money values: suffix with `Cents` when in integer cents (e.g., `unitPriceCents`, `markupPct`)
- Never use floats for money; always use integer cents as per CLAUDE.md rule
- Interfaces and types: PascalCase (e.g., `Database`, `Json`)
- Type exports from Supabase: auto-generated, imported as-is (e.g., `Database` from `src/types/database.types`)
- Generic types: PascalCase (standard convention)
- Enum-like type unions: descriptive, match database enums (e.g., `ai_call_type`)
## Code Style
- No formal Prettier config detected; ESLint is the primary linter
- Indentation: 2 spaces (standard for JavaScript/TypeScript)
- Line length: follow ESLint recommendations (no hardcoded limit found)
- Use semicolons (enforced by ESLint defaults)
- Tool: ESLint 10.2.1 with TypeScript ESLint support
- Config file: `eslint.config.js` (flat config format)
- Extends: `@eslint/js`, `typescript-eslint/recommended`, `react-hooks/recommended`, `react-refresh/vite`
- Ignored: `dist/` directory
- Key rules: React Hooks Rules of Hooks enforced, React Refresh rules enforced
- Strict mode enabled: `strict: true`
- Additional strict checks enabled:
- No `any` type allowed — use `unknown` and narrow types
- Target: ES2023
- JSX mode: `react-jsx` (React 17+ JSX transform)
## Import Organization
- None explicitly configured in tsconfig.app.json; use standard relative paths
- Type-only imports: always use `import type { ... } from '...'` syntax
## Error Handling
- Environment validation: throw `Error` with descriptive message at module load time (see `src/lib/supabase.ts`)
- No try-catch shown in sample code; follow CLAUDE.md rule: **server-authoritative totals** — client computations are advisory
- For async operations in services: assume errors bubble up to caller; use TypeScript strict mode to catch unhandled cases
- Always use integer cents; Math.round() after any multiplication/division (see `src/utils/money.ts`)
- Never trust floating-point money calculations
## Logging
- Use `console.*` for development and debugging (implied)
- Per CLAUDE.md AI section: log `ai_usage_events` to Postgres for all AI calls (tokens in/out, cost_cents, model, latency_ms)
- Per CLAUDE.md: log `stripe_events` table for idempotent webhook handling
- Critical state changes (estimate save, payment received, AI call completed)
- Errors or validation failures
- Performance-sensitive operations (AI latency, sync queue replay)
## Comments
- Avoid obvious comments; code should be self-documenting (strict naming conventions ensure this)
- Comment non-obvious business logic (e.g., why markup is applied before quantity in `lineItemTotal`)
- Comment workarounds or known limitations (e.g., "MVP conflict resolution: last-write-wins — see CRDT consideration in CLAUDE.md")
- Use TSDoc-style comments for public functions and exports
- Document parameters, return types, and side effects
## Function Design
- Use named parameters; if multiple related parameters, consider a parameter object
- Document with TSDoc comments
- TypeScript strict: parameters are required unless marked `?` for optional or union with `| undefined`
- Always return a value or `void` (implicit `undefined` for React components)
- Use `never` for functions that throw
- Use `unknown` for any value type, then narrow with type guards
## Module Design
- Prefer named exports for functions and types
- Default export: used for React components only (e.g., `export default App`)
- Utility modules export all functions as named exports (e.g., `src/utils/money.ts`)
- Not detected in current codebase; create as needed in directories with multiple related exports
- Example: `src/utils/index.ts` could export all utils if re-export is needed
- `src/utils/` — pure utility functions (money.ts, dates.ts, id.ts)
- `src/lib/` — library initialization and clients (supabase.ts, stripe.ts)
- `src/services/` — business logic that calls APIs (estimates.ts, invoices.ts, ai.ts)
- `src/stores/` — Zustand stores (editorStore, syncQueueStore)
- `src/hooks/` — React hooks (useAuth, useEstimate, useAutosave, useOffline)
- `src/components/ui/` — reusable UI components
- `src/components/estimate/` — estimate editor components
- `src/components/client/` — public-facing components
- `src/pages/` — route-level page components
- `src/types/` — generated from Supabase + hand-written types
## React Component Conventions
- Use `function` keyword or arrow function consistently within the codebase
- Use React 18+ hooks (useState, useContext, custom hooks)
- Prefer composition over inheritance
- Define prop interfaces as `PropsWithChildren` if component accepts children
- Use `React.FC<Props>` or explicit return type annotation
- Always use strict TypeScript for props
## Multi-Tenant & Security Conventions
- Public (safe as `NEXT_PUBLIC_`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Secrets (via `/api/*` serverless only): Anthropic API key, Stripe secret key, Resend API key
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Multi-tenant design with organization as root isolation boundary
- Row-level security (RLS) enforces org membership on all queries
- Server-authoritative totals (client computes for UX; server recomputes on save)
- Normalized data model: estimates contain ordered sections, sections contain ordered line items
- Public unauthenticated access via cryptographic tokens (estimate approval links)
- Client-side editor state management (Zustand) with offline sync queue to IndexedDB
- Stripe Connect architecture: contractor accounts, platform fees, webhook-driven reconciliation
## Layers
- Purpose: Render UI, collect user input, display real-time totals
- Location: `src/components/` (future: not yet written)
- Contains: Form components, estimate editor, sections, line items, client approval view
- Depends on: hooks (useEstimate, useAuth), services (estimates, invoices, ai), stores (editorStore)
- Used by: Pages
- Purpose: Hold in-memory estimate state during editing; queue pending writes
- Location: `src/stores/` (future: editorStore, syncQueueStore)
- Contains: Normalized estimate tree (sections keyed by id, line items keyed by id)
- Depends on: nothing (pure state)
- Used by: Components, hooks
- Purpose: Handle estimate operations, auth, data fetching
- Location: `src/hooks/` (useAuth, useEstimate, useAutosave), `src/services/` (estimates.ts, invoices.ts, ai.ts)
- Contains: Query orchestration, mutation triggers, offline queue management
- Depends on: lib (Supabase client), stores, utils (money)
- Used by: Components, pages
- Purpose: Execute RLS-protected queries, manage auth session, trigger server functions
- Location: `src/lib/supabase.ts`
- Contains: Supabase client instance, session management, auth helpers
- Depends on: external (Supabase SDK)
- Used by: Services, hooks
- Purpose: Math, date, ID generation, money arithmetic
- Location: `src/utils/` (money.ts, dates.ts, id.ts)
- Contains: Currency conversions (cents ↔ display), date formatting, UUID helpers
- Depends on: nothing
- Used by: Services, components
- Purpose: Enforce invariants, log usage, orchestrate external APIs
- Location: `supabase/migrations/` (SQL functions), `api/` (Vercel serverless)
- Contains: recalculate_estimate_totals(), next_estimate_number(), AI endpoints, Stripe webhooks, email
- Depends on: Supabase tables, external APIs (Anthropic, Stripe, Resend)
- Used by: Client layer, webhooks
- Purpose: Persistent storage with multi-tenant isolation
- Location: `supabase/migrations/`
- Contains: 16 tables, 38+ RLS policies, 3 Postgres functions, 5 enums
- Entry points: Supabase client queries, service role for webhooks
## Data Flow
- Zustand store holds normalized tree: `{ sections: { [id]: {...} }, lineItems: { [id]: {...} } }`
- On mount, fetch estimate + sections + line items → hydrate store
- On edit, update store locally (instant UI feedback)
- Debounce 800ms, then batch pending changes and execute Supabase mutations
- Totals computed client-side from store; server recomputes on save via `recalculate_estimate_totals()`
## Key Abstractions
- Purpose: Enforce integer-cents arithmetic throughout
- Examples: `src/utils/money.ts` (future)
- Pattern: Never use floats. All monetary values stored as integers (cents). Utilities convert: displayPrice(cents) → string "$123.45"
- Purpose: Represent a complete estimate with sections and line items
- Examples: `estimates`, `estimate_sections`, `estimate_line_items` tables
- Pattern: Estimate is the root; sections and line items are owned children. Deletion cascades.
- Purpose: Enforce multi-tenant isolation
- Examples: `organizations`, `organization_members` tables
- Pattern: Every domain table has `organization_id`. RLS policies check `is_org_member(org_id)`.
- Purpose: Allow clients to view and approve estimates without authentication
- Examples: `estimates.public_token` (24-byte base64), RLS policy "public can read estimate by token"
- Pattern: Token is cryptographically random (not guessable). URL is `/e/{token}`. No user context needed.
- Purpose: Enable single-update reorder (no renumbering)
- Examples: `estimate_sections.position`, `estimate_line_items.position` (integer, gaps: 10, 20, 30...)
- Pattern: Insert at 10, not 1. Reorder by updating affected rows' position only.
- Purpose: Centralize multi-tenant access control
- Examples: `is_org_member(org_id)`, `is_org_owner(org_id)` Postgres functions
- Pattern: All policies call these helpers. They check `organization_members` against `auth.uid()`.
- Purpose: Log every AI call for metering and edit-distance metrics
- Examples: `ai_usage_events` table
- Pattern: Insert on every `/api/ai/*` call with tokens, cost, latency. Non-optional for success metrics.
## Entry Points
- Location: `src/main.tsx` (React root)
- Triggers: Browser visits `{origin}/` or `{origin}/estimate/123` or `{origin}/e/{token}`
- Responsibilities: Mount React router, load auth session, hydrate app state
- Location: `src/pages/Dashboard.tsx` (future)
- Triggers: User navigates to `/` (authenticated)
- Responsibilities: Fetch org's estimates list, display status, provide create/edit/delete buttons
- Location: `src/pages/EstimateEdit.tsx` (future)
- Triggers: User navigates to `/estimate/:estimateId` (authenticated)
- Responsibilities: Load estimate from DB, initialize Zustand store, render editor with sections/line items
- Location: `src/pages/ClientView.tsx` (future)
- Triggers: Unauthenticated user visits `/e/:publicToken`
- Responsibilities: Fetch estimate by token (RLS allows), render sections/items, handle approval form
- Location: `api/ai/draft-estimate.ts` (future, Vercel serverless)
- Triggers: Authenticated POST with description + estimate_id + org_id
- Responsibilities: Call Anthropic, validate output, insert sections/items, trigger recalc, log usage
- Location: `api/stripe/webhook.ts` (future, Vercel serverless)
- Triggers: Stripe sends webhook event (payment.intent.succeeded, etc.)
- Responsibilities: Verify signature, check idempotency, create/update payment and invoice records
## Error Handling
## Cross-Cutting Concerns
- AI calls logged to `ai_usage_events` (mandatory, non-optional)
- Stripe events logged to `stripe_events` (idempotency check)
- Error logs sent to Vercel observability (future setup)
- RLS policies enforce org membership on all reads/writes
- Postgres constraints (UNIQUE, NOT NULL, CHECK, FKs) prevent bad data
- `estimate_status` and `invoice_status` are Postgres ENUMs (enforced at DB layer)
- Monetary totals recomputed by `recalculate_estimate_totals()` function
- Supabase Auth with email + password and magic link
- JWT passed in Authorization header on all API calls
- Session checked on app mount; redirected to login if expired
- `auth.uid()` used in RLS policies to determine current user
- Organization is the isolation root
- All tables have `organization_id` column
- RLS policies check `is_org_member(org_id)` before allowing any CRUD
- Public endpoint (`/e/{token}`) bypasses auth but filters by token, not user
- No cross-org data exposure possible (RLS is default deny)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
