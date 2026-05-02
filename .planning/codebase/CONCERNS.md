# Codebase Concerns

**Analysis Date:** 2026-05-02

## Overview

EstimateFlow is currently in **Stage 1 (data layer only)**. The complete Supabase schema has been created with migrations, but the frontend application, API routes, and business logic remain unimplemented. This document identifies technical debt, known gaps, and architectural risks.

---

## Critical Path Blockers

**These must be resolved before proceeding to Stage 2:**

### 1. Unresolved Open Questions (CLAUDE.md, §Open Questions)

**AI pricing model** — Not decided

- **Impact:** Schema supports metering, but no decision on whether to surface usage to users, charge per-call, or bundle unlimited AI calls.
- **Files:** `supabase/migrations/20260502000009_ai_automations.sql` (ai_usage_events table), future `/api/ai/*` routes
- **Blocking:** Any implementation of `/api/ai/draft-estimate` or `/api/ai/analyze-photo` must handle cost attribution and user visibility.
- **Fix approach:** Stakeholder alignment required. Schema is ready for either model. Decision must come before implementing the AI endpoints.

**Plan tiers definition** — Underspecified

- **Problem:** SPEC.md §19 defines Free (5 estimates/mo, 10 AI calls) and Pro ($29/mo, unlimited), but enforcement logic is missing.
- **Files:** `supabase/migrations/20260502000003_organizations.sql` (plan column exists), no enforcement in `/api/*`
- **Impact:** Cannot gate estimate creation, AI usage, or custom branding without plan-checking logic.
- **Fix approach:** Define enforcement rules (quota checks on estimate creation, AI call counting, feature gates), implement in serverless functions and RLS policies.

**Estimate numbering strategy** — Not chosen

- **Problem:** Per-org sequence table created (`estimate_sequences`), but per-org vs. random numbering not decided.
- **Files:** `supabase/migrations/20260502000005_estimates.sql` (estimate_sequences), function `next_estimate_number(p_org_id)` in `20260502000011_functions.sql`
- **Considerations:** Per-org sequence is more professional; random is simpler but less branded. Per-org needs race-condition-safe sequence generation (already implemented via UPSERT + RETURNING).
- **Fix approach:** If per-org sequence chosen, use the existing function. If random, replace with `encode(gen_random_bytes(8), 'hex')`. Decision needed before building the estimate creation flow.

**Tax engine choice** — Not finalized

- **Problem:** ZIP-based lookup table (`tax_rates`) created for MVP, but Stripe Tax or TaxJar integration is post-MVP. No bootstrap data for ZIP codes.
- **Files:** `supabase/migrations/20260502000010_tax_rates.sql` (empty table structure only)
- **Impact:** MVP cannot calculate tax without pre-loading `tax_rates` table from a public US tax dataset.
- **Fix approach:** Before launch, seed tax_rates table with a public dataset (e.g., TaxFoundation, state tax board sources, or a paid dataset). Alternatively, evaluate Stripe Tax for real-time accuracy.

**Client approval signature** — Feature scope unclear

- **Problem:** Spec §6 says approval is typed name only for MVP, but mentions canvas signature as optional post-MVP. UI and DB schema need to match final decision.
- **Files:** `supabase/migrations/20260502000005_estimates.sql` (only `approved_by_name`, `approved_client_ip`, `approved_user_agent` columns present)
- **Impact:** If signature pad needed at launch, schema and React components will need rework.
- **Fix approach:** Lock decision now. Typed-name-only (current schema) is MVP-ready. Signature pad requires additional component and optional schema changes post-MVP.

---

## Known Technical Gaps

### 2. Frontend Scaffolding Missing (Stage 2 blocker)

**Current state:** Only `src/App.tsx` exists as Vite boilerplate. All production components and pages are missing.

- **What's missing:**
  - `src/components/ui/*` — Base UI components (Button, Input, Modal, etc.)
  - `src/components/estimate/*` — Estimate editor, line item rows, section cards, totals bar
  - `src/components/client/*` — Public estimate view, approval flow, payment form
  - `src/pages/*` — Dashboard, EstimateEdit, ClientView, OrgSetup, etc.
  - `src/hooks/*` — useAuth, useEstimate, useAutosave, useOffline
  - `src/services/*` — estimates.ts (calls `/api/*`), invoices.ts, ai.ts
  - `src/stores/*` — Zustand stores: editorStore (normalized estimate tree), syncQueueStore (offline queue)

- **Files:** `src/App.tsx` (currently boilerplate)

- **Impact:** No estimates can be created, edited, or sent. AI features cannot be called. Auth flow not implemented.

- **Fix approach:** Stage 2 is frontend scaffolding. Start with layout components, auth guard, then estimate editor (the hardest part per CLAUDE.md §Editor Architecture).

### 3. API Routes Not Implemented

**Current state:** No `/api/` directory exists.

- **Missing endpoints:**
  - `/api/ai/draft-estimate` — Calls Anthropic Claude to generate estimate from text
  - `/api/ai/analyze-photo` — Calls Claude with vision to suggest line items from photo
  - `/api/stripe/create-payment-intent` — Creates Stripe PaymentIntent for deposit/full payment
  - `/api/stripe/webhook` — Handles `payment_intent.succeeded`, `account.updated`, etc.
  - `/api/email/send-*` — Resend integration (estimate sent, approved, payment received)

- **Impact:** No AI features, no payments, no external integrations working.

- **Fix approach:** Stage 2 or 3, depending on MVP definition. AI endpoints needed before client-facing estimate send. Stripe and email could follow.

### 4. Vercel Configuration Incomplete

**Files:** `vercel.json` not checked yet; `.env.example` needs critical vars defined.

- **Required env vars (not yet listed):**
  - `VITE_SUPABASE_URL` — Safe to expose
  - `VITE_SUPABASE_ANON_KEY` — Safe to expose
  - `ANTHROPIC_API_KEY` — Secret, must be `/api` only (via Vercel env)
  - `STRIPE_SECRET_KEY` — Secret
  - `STRIPE_PUBLISHABLE_KEY` — Safe as `VITE_`
  - `STRIPE_WEBHOOK_SECRET` — Secret
  - `RESEND_API_KEY` — Secret
  - `SUPABASE_SERVICE_ROLE_KEY` — Secret, for migrations and scheduled tasks

- **Fix approach:** Create `.env.example` with all vars (empty values), document in README.

---

## Money Handling — Potential Issue

**Files:** `src/utils/money.ts`

- **Issue:** `centsToDollars()` returns a float. While this is acceptable for display, it could create confusion if used in calculations.

  ```typescript
  // Current implementation
  export function centsToDollars(cents: number): number {
    return cents / 100  // Returns float, e.g., 1234 → 12.34
  }
  ```

- **Concern:** CLAUDE.md §Non-Negotiable Rules §2 mandates "Money in integer cents. Never floats." The function itself is fine (it's display-only), but adding guards or JSDoc would prevent accidental misuse in calculations.

- **Fix approach:** Add JSDoc comment flagging this as display-only. Consider a return type like `CentsDisplay` (opaque type) to prevent accidental arithmetic. Low priority — current usage is safe.

---

## RLS Policy Coverage

**All domain tables have RLS enabled and default-deny policies.** Schema appears sound:

- `organizations`, `organization_members` — Owner-only update, members can read
- `estimates`, `estimate_sections`, `estimate_line_items` — Members can CRUD, public can read by token
- `invoices`, `payments` — Members can read/create, idempotent via keys
- `ai_usage_events`, `automations` — Members can read/manage
- `clients` — Not verified yet, check `20260502000004_clients.sql`

**Assumption:** Public read access via `public_token` is correctly scoped to the specific estimate and its descendants.

**Recommended test:** Before deploying to production, run denied-query tests:
1. Unauthenticated user tries to SELECT from `organizations` — should fail.
2. User A tries to SELECT estimates from Org B (not a member) — should fail.
3. Unauthenticated user tries to read estimate by invalid token — should fail.
4. Unauthenticated user reads estimate by valid token — should succeed.

---

## Offline Sync Architecture — Not Yet Built

**Files:** Store and sync queue not yet created (`src/stores/` directory missing).

- **Spec:** (CLAUDE.md §Editor Architecture) Zustand store + IndexedDB queue with debounced 800ms autosave, last-write-wins conflict resolution.

- **Risk:** Offline behavior is complex. Need to handle:
  - Queue persistence across browser refreshes
  - Conflict detection (server version ≠ local version after reconnect)
  - Partial failures (some queued edits succeed, others fail)
  - User notification of sync status

- **Missing dependencies:** `idb-keyval` is in CLAUDE.md stack but not in `package.json`.

- **Fix approach:** Evaluate whether last-write-wins is acceptable for MVP or if CRDT (Conflict-free Replicated Data Type) is needed. Add `idb-keyval` to dependencies. Build sync queue manager with retry logic and conflict handling before shipping offline support.

---

## Edge Cases Not Addressed

### 5. Optional Line Items — Total Recalculation

**Files:** `supabase/migrations/20260502000011_functions.sql` — `recalculate_estimate_totals()`

- **Issue:** Current function excludes optional items from subtotal/tax. But SPEC §5.2 says optional items should be **selectable by the client** after approval, and the server should recompute totals based on which ones are selected.

  ```sql
  -- Current: excludes ALL optional items
  WHERE ... AND optional = false;
  ```

- **Problem:** No column tracks which optional items the client selected. After the client approves and toggles optional items on the public view, how does the server know which to include in the final invoice total?

- **Current schema gap:** `estimates` table has no column for tracking selected optional items (e.g., `selected_optional_item_ids jsonb`).

- **Impact:** If optional items are approved, toggled by client, and then a payment is processed, the invoice total might not match what the client agreed to.

- **Fix approach:** Before implementing the public approval flow, add a column to `estimates` (e.g., `selected_optional_item_ids uuid[]` or JSONB) to record which optional items the client selected. Update `recalculate_estimate_totals()` to respect this selection. Alternatively, create an `estimate_approvals` junction table if approval history tracking is desired.

### 6. Estimate Status Transitions

**Files:** `supabase/migrations/20260502000001_enums.sql` — `estimate_status` enum

- **Defined states:** `'draft'`, `'sent'`, `'approved'`, `'rejected'`, `'expired'`, `'invoiced'`

- **Missing logic:** No constraints on valid transitions (e.g., can a draft jump to invoiced without being approved? Can a sent estimate be sent again?).

- **Current risk:** Frontend must enforce state machines; Postgres has no guardrails. A bug could create an estimate in an invalid state.

- **Fix approach:** Either add a CHECK constraint in migrations (complex, brittle) or rely on frontend business logic with clear state diagrams in code comments. Document valid transitions in SPEC or CLAUDE.md.

---

## Schema Potential Issues

### 7. Estimate Public Token Format

**Files:** `supabase/migrations/20260502000005_estimates.sql`

```sql
public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64')
```

- **Issue:** Base64 encoding of 24 random bytes produces 32 characters, which is good entropy. However, base64 uses `+`, `/`, and `=` characters, which can be URL-unsafe if this token is used in URLs without encoding.

- **Spec says:** (§6) `estimate_public_token` is a cryptographically random 32-char token. The URL is `/e/:estimate_public_token`.

- **Risk:** Base64 with special chars could cause issues. A URL-safe variant (base64url, or hex encoding) would be safer.

- **Current impact:** Likely low if the token is always URL-encoded by the router, but an edge case to monitor.

- **Fix approach:** If issues arise, switch to `encode(gen_random_bytes(24), 'hex')` (48 hex chars but guaranteed URL-safe).

### 8. Stripe Payment Intent Idempotency

**Files:** `supabase/migrations/20260502000008_invoices_payments.sql`

- **Schema:** Payments table has `stripe_payment_intent_id` UNIQUE, and `stripe_events` table prevents double-processing.

- **Current:** Good structure for idempotency, but webhook handler implementation is missing (`/api/stripe/webhook`).

- **Risk:** If webhook handler isn't idempotent or crashes mid-execution, duplicate charge records or orphaned state could occur.

- **Fix approach:** Implement webhook handler with strict idempotency: check `stripe_events` table first, process exactly once, always mark event as processed. Write tests for webhook retries.

---

## Scaling & Performance Concerns

### 9. Estimate Sequences Under Load

**Files:** `supabase/migrations/20260502000005_estimates.sql`, function in `20260502000011_functions.sql`

```sql
INSERT INTO estimate_sequences (organization_id, last_number)
VALUES (p_org_id, 1)
ON CONFLICT (organization_id)
DO UPDATE SET last_number = estimate_sequences.last_number + 1
RETURNING last_number INTO v_next;
```

- **Good:** Uses UPSERT for race-condition safety.

- **Potential issue:** Under very high concurrent load (thousands of estimates per second per org), this could create transaction contention on the estimate_sequences row.

- **Current reality:** Unlikely to be a bottleneck for MVP (solo contractors, small teams). If it becomes one, switch to a dedicated sequence table with lock hints or use Postgres `nextval()` on a SEQUENCE object.

- **Fix approach:** Monitor after launch. If latency on estimate creation spikes, profile the sequences query.

### 10. Estimate Line Items — Pagination Not Considered

**Files:** `supabase/migrations/20260502000006_estimate_sections_line_items.sql`

- **Issue:** No cursor-based pagination for large estimates (100+ line items). Frontend will fetch all at once.

- **Current risk:** Low. Estimates are unlikely to exceed a few hundred line items in typical contractor workflows. If they do, UI will become sluggish before DB does.

- **Fix approach:** Add pagination to queries on the frontend once implemented. Unlikely to need at MVP launch.

---

## Test Coverage Gaps

### 11. No Automated Tests

**Files:** `src/utils/money.test.ts` exists but is not verified; no other test files present.

- **Current state:** `package.json` includes `vitest` with test commands, but no actual test suite.

- **Missing tests:**
  - RLS policies — critical for security (all domain tables must block unauthorized access)
  - Money utility edge cases — rounding, zero values, large numbers
  - Estimate total recalculation — with and without optional items, with various tax rates
  - Stripe webhook idempotency — double-processing prevention
  - Frontend autosave debounce — offline queue persistence

- **Impact:** Risk of silent bugs in financial calculations and security leaks.

- **Fix approach:** Stage 2/3. Before shipping to production, require:
  - RLS denial tests (unauthenticated access blocked, cross-org access blocked)
  - money.test.ts completed and passing
  - Integration test for estimate creation → recalculate → total matches expected

---

## Dependency Risks

### 12. Missing Frontend Dependencies

**Files:** `package.json` (current)

- **Current stack includes:** React 18, Vite, TypeScript, Supabase client, vitest, ESLint

- **Missing (per CLAUDE.md):**
  - Tailwind CSS — styling
  - React Router v6 — routing
  - Zustand — state management
  - @dnd-kit/core — drag-and-drop
  - idb-keyval — offline IndexedDB
  - Resend — email client (likely backend-only)
  - Stripe.js — payment form

- **Impact:** Cannot build any UI without these.

- **Fix approach:** Add to `package.json` before Stage 2. Ensure versions are compatible with React 18 and TypeScript strict mode.

### 13. Supabase CLI Version Pinning

**Files:** `package.json` lists `supabase: ^2.98.0`

- **Issue:** Supabase CLI can have breaking changes. Not pinned to exact version.

- **Current risk:** Low for MVP if migrations are tested on both old and new versions.

- **Fix approach:** After confirming all migrations work, consider pinning to exact version in production. Document in README how to update safely.

---

## Security Considerations

### 14. RLS Functions — SECURITY DEFINER Risk

**Files:** `supabase/migrations/20260502000002_rls_helpers.sql`

```sql
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
```

- **Current:** Functions use `SECURITY DEFINER`, which means they run with role permissions of the creator (usually postgres or a service role), not the caller. This is intentional for RLS policies and is correct.

- **Safeguard:** Functions check `auth.uid()` internally, which ensures even with elevated perms, they only authorize the current authenticated user. This is secure.

- **Potential issue:** If new SECURITY DEFINER functions are added without checking `auth.uid()`, they could leak data or allow privilege escalation.

- **Fix approach:** Code review requirement: any new SECURITY DEFINER function must explicitly check `auth.uid()` or have a documented reason not to.

### 15. Stripe Webhook Signature Verification

**Files:** `/api/stripe/webhook` not implemented yet

- **Risk:** Spec §7 says "verify signature with STRIPE_WEBHOOK_SECRET," but the code doesn't exist.

- **Current impact:** None (endpoint not built). But critical for production.

- **Fix approach:** When implementing `/api/stripe/webhook`, use Stripe SDK to verify request signature before processing. Never process a webhook that fails signature verification.

### 16. AI Cost Control — No Rate Limiting

**Files:** `/api/ai/draft-estimate`, `/api/ai/analyze-photo` not implemented

- **Risk:** Spec §17 mentions internal alert if org spend exceeds $50/mo, but no rate limiting or quota enforcement at the API level.

- **Current risk:** Without rate limiting, a malicious user (or bug) could run unlimited AI calls and incur high costs.

- **Spec reference:** Spec §17 says "internal alert" but doesn't define what stops the abuse.

- **Fix approach:** Before shipping AI features, implement:
  1. Per-org quota enforcement (check org's remaining AI calls before calling Anthropic).
  2. Per-user rate limiting (e.g., 1 call per 10 seconds).
  3. Cost tracking and alerts (Spec §16 already has schema for this).

---

## Documentation Gaps

### 17. Missing Database Design Documentation

**Files:** No entity relationship diagram (ERD) or detailed design doc.

- **Current:** Migrations are the source of truth, but no visual or narrative documentation of the data model.

- **Impact:** Future developers must read raw SQL migrations to understand relationships.

- **Fix approach:** Create a markdown file or ERD diagram in `docs/` showing tables, foreign keys, and RLS policies at a glance.

### 18. Missing Environment Setup Guide

**Files:** `.env.example` not yet created or populated

- **Current:** New developers won't know which env vars are required.

- **Fix approach:** Create `.env.example` with all required vars (empty values). Document how to get each (Supabase dashboard, Stripe dashboard, etc.).

---

## Fragile Areas

### 19. Estimate Sections and Line Items Ordering

**Files:** `supabase/migrations/20260502000006_estimate_sections_line_items.sql`

- **Schema:** Uses integer `position` column with gaps (10, 20, 30...) for reordering without updates.

- **Assumption:** Frontend drag-and-drop updates position values and sends one UPDATE per moved item.

- **Fragility:** If frontend sends position updates out of order (item B before item A), gaps can collapse or cause confusion. No constraint prevents positions from becoming non-unique or negative.

- **Current risk:** Low. Needs careful frontend implementation.

- **Fix approach:** Add CHECK constraint: `position > 0`. Document in code that positions should always maintain gaps and be sent in order. Consider a helper function `reposition_items_in_section(section_id, new_positions[])` to handle bulk reordering atomically.

### 20. Attachment Thumbnail Generation

**Files:** `supabase/migrations/20260502000007_estimate_attachments.sql`

- **Schema:** `thumbnail_path` column for generated thumbnails.

- **Missing:** Edge Function to generate thumbnails on insert.

- **Current:** Spec §5.4 says "Thumbnail generated by an Edge Function on insert," but the function is not implemented.

- **Risk:** Thumbnails won't exist; client view will break if code references them.

- **Fix approach:** Create Supabase Edge Function that:
  1. Listens for `estimate_attachments` inserts
  2. Downloads the image from Storage
  3. Resizes to 200x200px (or configurable)
  4. Uploads thumbnail
  5. Updates `thumbnail_path` in the DB

---

## Missing Features (Post-MVP but Good to Know)

### 21. Estimate Options (Good/Better/Best)

**Files:** Mentioned in CLAUDE.md but not in schema

- **Status:** Post-MVP deferred

- **When needed:** Schema will need an `estimate_options` table. Plan for this in architectural discussions.

### 22. Multi-User Roles Beyond Owner/Member

**Files:** `supabase/migrations/20260502000003_organizations.sql` — enum `member_role` only has `'owner'`, `'member'`

- **Spec mentions:** Post-MVP roles like `'estimator'`, `'viewer'`

- **Current:** No problem. Schema can expand easily.

- **Good to know:** Add roles before expanding multi-user features.

---

## Recommended Pre-Launch Checklist

Before shipping to production:

- [ ] Resolve all 5 Open Questions (AI pricing, plan tiers, estimate numbering, tax engine, signature)
- [ ] Add missing frontend dependencies to `package.json`
- [ ] Implement `/api/*` routes (AI, Stripe, email)
- [ ] Create RLS denial tests and verify all policies block unauthorized access
- [ ] Seed `tax_rates` table with complete US ZIP code data
- [ ] Implement Stripe webhook handler with signature verification
- [ ] Implement AI cost control (quota enforcement, rate limiting)
- [ ] Create `.env.example` with all required variables
- [ ] Create database ERD or design doc
- [ ] Write integration tests for estimate creation → approval → payment flow
- [ ] Test offline sync (queue persistence, reconnect, conflict handling)
- [ ] Create production deployment runbook (env vars, migrations, backups)

---

*Concerns audit: 2026-05-02*
