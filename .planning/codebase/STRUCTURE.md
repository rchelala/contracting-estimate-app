# Codebase Structure

**Analysis Date:** 2026-05-02

## Directory Layout

Current state: **Stage 1 (Data Layer) Complete**. Frontend and API layers are scaffolded in CLAUDE.md but not yet implemented. Schema migrations are complete and checked into git worktree `.worktrees/stage1-schema/`.

```
estimateflow/
├── .git/                   # Git repository
├── .worktrees/
│   └── stage1-schema/      # Git worktree branch: data layer complete
│       ├── supabase/
│       │   ├── migrations/ # 11 numbered SQL migration files
│       │   └── seed.sql    # Local dev data seed
│       └── CLAUDE.md       # Same as root
├── .planning/
│   └── codebase/           # Architecture & structure docs (this repo)
├── docs/
│   ├── SPEC.md             # Product specification (source of truth)
│   └── superpowers/        # Design tokens / reference (future)
├── CLAUDE.md               # Operating manual (this file + architecture)
└── .gitignore              # Excludes .worktrees, node_modules, dist, .env

**Future structure** (from CLAUDE.md, not yet written):
├── api/                    # Vercel serverless functions
├── public/                 # Static assets
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── .env.local              # (gitignored)
├── .env.example            # Committed, empty values
├── .nvmrc
├── vercel.json
└── package.json
```

---

## Directory Purposes

**`.worktrees/stage1-schema/`**
- Purpose: Isolated git worktree for schema development and review
- Contains: Complete Supabase schema (11 migrations), seed script, CLAUDE.md
- Branch: `stage1-schema` (feature branch off `main`)
- Status: Ready for merge to `main` after review
- Why separate: Allows schema work without blocking UI work; cleaner git history

**`supabase/migrations/`**
- Purpose: Version-controlled SQL migrations for Postgres schema
- Contains: 11 migration files, each numbered by timestamp
- Naming: `20260502HHMMSS_description.sql`
- Why this order:
  1. `000001_enums.sql` — Create Postgres types first
  2. `000002_rls_helpers.sql` — Helper functions for RLS
  3. `000003_organizations.sql` — Tenant root + members
  4. `000004_clients.sql` — Customer directory
  5. `000005_estimates.sql` — Estimate header + sequences
  6. `000006_estimate_sections_line_items.sql` — Nested structure
  7. `000007_estimate_attachments.sql` — Photos
  8. `000008_invoices_payments.sql` — Invoicing + payment records
  9. `000009_ai_automations.sql` — AI logging + automation rules
  10. `000010_tax_rates.sql` — ZIP-based tax lookup table
  11. `000011_functions.sql` — Postgres functions (recalculate, sequence generation)

**`docs/SPEC.md`**
- Purpose: Complete product specification (source of truth)
- Contains: Vision, JTBD, MVP scope, feature specs, success metrics
- Reference: CLAUDE.md defers to this for "what" vs. "how"

**`.planning/codebase/`**
- Purpose: Architecture & structure documentation for code generation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md (added incrementally)
- Consumed by: `/gsd-plan-phase` and `/gsd-execute-phase` commands

---

## Key File Locations

**Schema & Database:**
- `supabase/migrations/20260502000001_enums.sql` — Status enums, role enums, type definitions
- `supabase/migrations/20260502000002_rls_helpers.sql` — `is_org_member()`, `is_org_owner()` Postgres functions
- `supabase/migrations/20260502000003_organizations.sql` — Tenant & member tables with RLS
- `supabase/migrations/20260502000005_estimates.sql` — Estimate header + `recalculate_estimate_totals()` function
- `supabase/migrations/20260502000006_estimate_sections_line_items.sql` — Sections & line items hierarchy
- `supabase/migrations/20260502000008_invoices_payments.sql` — Invoice & payment tables + Stripe event log
- `supabase/migrations/20260502000009_ai_automations.sql` — AI usage events + automation triggers
- `supabase/migrations/20260502000010_tax_rates.sql` — ZIP code tax rate lookup

**Frontend Entry Points (Future):**
- `src/main.tsx` — React root with router setup
- `src/App.tsx` — Route-level component, auth gate
- `src/pages/Dashboard.tsx` — Estimate list & create
- `src/pages/EstimateEdit.tsx` — Estimate editor (heaviest component)
- `src/pages/ClientView.tsx` — Public approval page (`/e/{token}`)

**State Management (Future):**
- `src/stores/editorStore.ts` — Zustand: current estimate + sections + line items (normalized)
- `src/stores/syncQueueStore.ts` — Zustand: pending mutations for offline resilience

**Business Logic (Future):**
- `src/services/estimates.ts` — Estimate CRUD, generate estimate number, trigger recalculate
- `src/services/invoices.ts` — Create invoice from estimate
- `src/services/payments.ts` — Stripe payment intent creation, webhook handling
- `src/services/ai.ts` — Calls `/api/ai/*` endpoints (never direct Anthropic)
- `src/services/email.ts` — Calls `/api/email/*` endpoints (never direct Resend)

**Utilities (Future):**
- `src/utils/money.ts` — Convert cents ↔ display, arithmetic, currency formatting
- `src/utils/dates.ts` — Format dates, relative time ("3 days ago")
- `src/utils/id.ts` — Generate UUIDs, public tokens

**External APIs (Future):**
- `api/ai/draft-estimate.ts` — POST endpoint for AI draft + section/item insertion
- `api/ai/analyze-photo.ts` — POST endpoint for photo analysis suggestions (no auto-insert)
- `api/stripe/create-payment-intent.ts` — POST endpoint for Stripe PaymentIntent creation
- `api/stripe/webhook.ts` — Webhook receiver for payment + account events
- `api/email/estimate-sent.ts` — Email template + send (via Resend)
- `api/email/estimate-approved.ts` — Email template + send
- `api/email/payment-received.ts` — Email template + send

**Configuration:**
- `vercel.json` — Deployment config: SPA rewrite rules, API route config
- `.nvmrc` — Node version (future: locked version)
- `package.json` — Dependencies (React, Supabase, Stripe, Vite, Tailwind, etc.)

---

## Naming Conventions

**Files:**
- React components: PascalCase (`EstimateEditor.tsx`)
- Services/utilities: camelCase (`estimates.ts`, `money.ts`)
- API routes: kebab-case endpoints (`api/ai/draft-estimate.ts`)
- Migrations: timestamp prefix + kebab-case description (`20260502000001_enums.sql`)

**Directories:**
- Feature groups (plural): `components/`, `pages/`, `hooks/`, `services/`, `stores/`
- Subdirectories by feature: `components/estimate/`, `components/ui/`, `components/client/`

**Database:**
- Tables: snake_case, singular where appropriate (`estimates`, `estimate_sections`, `organization_members`)
- Columns: snake_case, all lowercase (`organization_id`, `subtotal_cents`, `markup_pct`)
- Functions: snake_case (`recalculate_estimate_totals`, `next_estimate_number`)
- Enums: snake_case (`estimate_status`, `line_item_source`)

**Variables & Functions (TypeScript):**
- Functions: camelCase (`fetchEstimate`, `calculateTotal`)
- Constants: UPPER_SNAKE_CASE if truly immutable (`STRIPE_API_VERSION`, `MAX_FILE_SIZE_MB`)
- Types: PascalCase (`Estimate`, `Organization`, `LineItem`)

---

## Where to Add New Code

**New Feature (e.g., "Estimate comments"):**
1. Schema changes → new migration in `supabase/migrations/` (add RLS policies)
2. Generate types via Supabase CLI
3. Service layer → new file or extend `src/services/estimates.ts`
4. Hooks → `src/hooks/useComments.ts` (if needed)
5. Components → new file in `src/components/estimate/Comments.tsx`
6. API endpoint → new file in `api/comments/` if server-side logic required

**New Component (e.g., "Tax Override Modal"):**
- Implementation: `src/components/estimate/TaxOverrideModal.tsx`
- Test: `src/components/estimate/TaxOverrideModal.test.tsx` (co-located)
- Integrate: Import in parent component (e.g., `EstimateEditor.tsx`)

**New Utility:**
- General-purpose (e.g., "format phone"): `src/utils/phone.ts`
- Domain-specific (e.g., "calculate line item total"): could go in `src/services/estimates.ts` or `src/utils/estimate.ts`

**New API Endpoint:**
- Vercel serverless function: `api/{feature}/{action}.ts`
- Example: `api/automations/trigger-expiry-reminder.ts`
- Must validate JWT, check org membership, call Supabase service role client

---

## Special Directories

**`.worktrees/stage1-schema/`**
- Purpose: Isolated git worktree for schema development
- Generated: No (manually created with `git worktree add`)
- Committed: Yes (worktree list managed in git config)
- Lifecycle: Merge back to `main` when ready; optionally delete worktree

**`supabase/`**
- Purpose: Supabase project config and migrations
- Generated: Migration files are hand-written; types generated from schema
- Committed: Yes (migrations in git; types in git; secrets in .env, not git)

**`.planning/codebase/`**
- Purpose: Architecture documentation for code generation
- Generated: No (hand-written by `/gsd-map-codebase`)
- Committed: Yes (safe to commit; no secrets)

**`node_modules/`**
- Excluded from git via `.gitignore`
- Populated by `npm install` or `pnpm install`

---

## Stage Progression (Reference)

**Stage 1 (Current): Data Layer ✓**
- Postgres schema: 16 tables, 38+ RLS policies, 5 enums, 3 Postgres functions
- Multi-tenant org structure: organizations + organization_members
- Estimate model: estimates + estimate_sections + estimate_line_items
- Supporting tables: clients, invoices, payments, estimate_attachments, ai_usage_events, automations, tax_rates
- Migration files numbered, in git worktree `stage1-schema`

**Stage 2 (Next): Frontend Core**
- React app scaffolding, router setup, auth flow
- Estimate dashboard (list, filter, create)
- Estimate editor (sections, line items, drag-and-drop)
- API layer: Supabase client, hooks, services

**Stage 3: Public & Payment**
- Client approval view (`/e/{token}`)
- Stripe payment form integration
- Email notifications (Resend)

**Stage 4: AI Integration**
- `/api/ai/draft-estimate` endpoint
- `/api/ai/analyze-photo` endpoint
- AI usage logging, metering UI

---

*Structure analysis: 2026-05-02*
