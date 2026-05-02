# Architecture

**Analysis Date:** 2026-05-02

## Pattern Overview

**Overall:** Multi-tenant SaaS with server-driven state and client-side drafting (Estimate-First architecture)

**Key Characteristics:**
- Multi-tenant design with organization as root isolation boundary
- Row-level security (RLS) enforces org membership on all queries
- Server-authoritative totals (client computes for UX; server recomputes on save)
- Normalized data model: estimates contain ordered sections, sections contain ordered line items
- Public unauthenticated access via cryptographic tokens (estimate approval links)
- Client-side editor state management (Zustand) with offline sync queue to IndexedDB
- Stripe Connect architecture: contractor accounts, platform fees, webhook-driven reconciliation

---

## Layers

**Presentation (React Components):**
- Purpose: Render UI, collect user input, display real-time totals
- Location: `src/components/` (future: not yet written)
- Contains: Form components, estimate editor, sections, line items, client approval view
- Depends on: hooks (useEstimate, useAuth), services (estimates, invoices, ai), stores (editorStore)
- Used by: Pages

**State Management (Zustand):**
- Purpose: Hold in-memory estimate state during editing; queue pending writes
- Location: `src/stores/` (future: editorStore, syncQueueStore)
- Contains: Normalized estimate tree (sections keyed by id, line items keyed by id)
- Depends on: nothing (pure state)
- Used by: Components, hooks

**Business Logic (Hooks & Services):**
- Purpose: Handle estimate operations, auth, data fetching
- Location: `src/hooks/` (useAuth, useEstimate, useAutosave), `src/services/` (estimates.ts, invoices.ts, ai.ts)
- Contains: Query orchestration, mutation triggers, offline queue management
- Depends on: lib (Supabase client), stores, utils (money)
- Used by: Components, pages

**Data Access (Supabase Client):**
- Purpose: Execute RLS-protected queries, manage auth session, trigger server functions
- Location: `src/lib/supabase.ts`
- Contains: Supabase client instance, session management, auth helpers
- Depends on: external (Supabase SDK)
- Used by: Services, hooks

**Utilities:**
- Purpose: Math, date, ID generation, money arithmetic
- Location: `src/utils/` (money.ts, dates.ts, id.ts)
- Contains: Currency conversions (cents ↔ display), date formatting, UUID helpers
- Depends on: nothing
- Used by: Services, components

**Server Functions (Postgres, Vercel Edge):**
- Purpose: Enforce invariants, log usage, orchestrate external APIs
- Location: `supabase/migrations/` (SQL functions), `api/` (Vercel serverless)
- Contains: recalculate_estimate_totals(), next_estimate_number(), AI endpoints, Stripe webhooks, email
- Depends on: Supabase tables, external APIs (Anthropic, Stripe, Resend)
- Used by: Client layer, webhooks

**Database (Postgres + RLS):**
- Purpose: Persistent storage with multi-tenant isolation
- Location: `supabase/migrations/`
- Contains: 16 tables, 38+ RLS policies, 3 Postgres functions, 5 enums
- Entry points: Supabase client queries, service role for webhooks

---

## Data Flow

**Create Estimate → Draft → Send → Approve → Invoice → Payment**

1. **Create**: User creates blank estimate
   - Client calls `next_estimate_number(org_id)` Postgres function → returns EST-0001
   - Insert row into `estimates` table via RLS-protected INSERT
   - Editor state initialized: empty sections array

2. **Draft (AI-assisted or manual)**
   - If AI: POST to `/api/ai/draft-estimate` with description
     - Server calls Anthropic API (never client-side)
     - Returns sections + line items with low/typical/high price ranges
     - Client inserts into `estimate_sections` and `estimate_line_items`
     - Trigger `recalculate_estimate_totals(estimate_id)` Postgres function
     - Log to `ai_usage_events`
   - If manual: User adds sections via UI → sections inserted via RLS INSERT
     - User adds line items to each section → items inserted via RLS INSERT
     - Each insert/update queues `recalculate_estimate_totals` call

3. **Autosave & Sync Queue**
   - On any field change, debounce 800ms
   - Gather pending changes (section reorder, line item edits, deletions)
   - Persist to `syncQueueStore` in IndexedDB (offline resilience)
   - Execute via Supabase client (RLS-protected)
   - On success, remove from queue; on failure, retry on reconnect

4. **Send**
   - User clicks "Send to client"
   - Status updated: `estimates.status = 'sent'`
   - Set `estimates.sent_at`, `estimates.first_sent_at` (if not already sent)
   - Generate public token (already assigned at creation as `public_token`)
   - Email sent via `/api/email/estimate-sent` (Resend)
   - Include public URL: `{origin}/e/{public_token}`

5. **Approve (Client)**
   - Unauthenticated user visits `/e/{public_token}`
   - RLS policy "public can read estimate by token" allows SELECT on estimates/sections/line_items
   - Client toggles optional items → totals update client-side (advisory)
   - Client types name, clicks "I approve"
   - POST to approval endpoint (future: server-side validation and approval recording)
   - Status updated: `estimates.status = 'approved'`
   - Record: `approved_by_name`, `approved_at`, `client_ip`, `user_agent`
   - Email to contractor via Resend

6. **Payment (if attached)**
   - On approval, if contractor requested deposit/full payment:
   - POST to `/api/stripe/create-payment-intent` (server-side)
   - Returns Stripe PaymentIntent client secret
   - Client form (Stripe Elements) confirms payment
   - Webhook `/api/stripe/webhook` receives `payment_intent.succeeded`
   - Create `invoices` row (snapshot of estimate at that moment)
   - Create `payments` record with Stripe references
   - Update estimate: `status = 'invoiced'`
   - Send invoice email to client

**State Management During Edit:**
- Zustand store holds normalized tree: `{ sections: { [id]: {...} }, lineItems: { [id]: {...} } }`
- On mount, fetch estimate + sections + line items → hydrate store
- On edit, update store locally (instant UI feedback)
- Debounce 800ms, then batch pending changes and execute Supabase mutations
- Totals computed client-side from store; server recomputes on save via `recalculate_estimate_totals()`

---

## Key Abstractions

**Money:**
- Purpose: Enforce integer-cents arithmetic throughout
- Examples: `src/utils/money.ts` (future)
- Pattern: Never use floats. All monetary values stored as integers (cents). Utilities convert: displayPrice(cents) → string "$123.45"

**Estimate (Aggregate):**
- Purpose: Represent a complete estimate with sections and line items
- Examples: `estimates`, `estimate_sections`, `estimate_line_items` tables
- Pattern: Estimate is the root; sections and line items are owned children. Deletion cascades.

**Organization (Tenant):**
- Purpose: Enforce multi-tenant isolation
- Examples: `organizations`, `organization_members` tables
- Pattern: Every domain table has `organization_id`. RLS policies check `is_org_member(org_id)`.

**Public Token (Unauthenticated Access):**
- Purpose: Allow clients to view and approve estimates without authentication
- Examples: `estimates.public_token` (24-byte base64), RLS policy "public can read estimate by token"
- Pattern: Token is cryptographically random (not guessable). URL is `/e/{token}`. No user context needed.

**Position (Drag-and-drop Reorder):**
- Purpose: Enable single-update reorder (no renumbering)
- Examples: `estimate_sections.position`, `estimate_line_items.position` (integer, gaps: 10, 20, 30...)
- Pattern: Insert at 10, not 1. Reorder by updating affected rows' position only.

**RLS Helpers:**
- Purpose: Centralize multi-tenant access control
- Examples: `is_org_member(org_id)`, `is_org_owner(org_id)` Postgres functions
- Pattern: All policies call these helpers. They check `organization_members` against `auth.uid()`.

**AI Usage Event:**
- Purpose: Log every AI call for metering and edit-distance metrics
- Examples: `ai_usage_events` table
- Pattern: Insert on every `/api/ai/*` call with tokens, cost, latency. Non-optional for success metrics.

---

## Entry Points

**Public Web Application:**
- Location: `src/main.tsx` (React root)
- Triggers: Browser visits `{origin}/` or `{origin}/estimate/123` or `{origin}/e/{token}`
- Responsibilities: Mount React router, load auth session, hydrate app state

**Dashboard Page:**
- Location: `src/pages/Dashboard.tsx` (future)
- Triggers: User navigates to `/` (authenticated)
- Responsibilities: Fetch org's estimates list, display status, provide create/edit/delete buttons

**Estimate Editor Page:**
- Location: `src/pages/EstimateEdit.tsx` (future)
- Triggers: User navigates to `/estimate/:estimateId` (authenticated)
- Responsibilities: Load estimate from DB, initialize Zustand store, render editor with sections/line items

**Client Approval View Page:**
- Location: `src/pages/ClientView.tsx` (future)
- Triggers: Unauthenticated user visits `/e/:publicToken`
- Responsibilities: Fetch estimate by token (RLS allows), render sections/items, handle approval form

**AI Draft Endpoint:**
- Location: `api/ai/draft-estimate.ts` (future, Vercel serverless)
- Triggers: Authenticated POST with description + estimate_id + org_id
- Responsibilities: Call Anthropic, validate output, insert sections/items, trigger recalc, log usage

**Stripe Webhook Endpoint:**
- Location: `api/stripe/webhook.ts` (future, Vercel serverless)
- Triggers: Stripe sends webhook event (payment.intent.succeeded, etc.)
- Responsibilities: Verify signature, check idempotency, create/update payment and invoice records

---

## Error Handling

**Strategy:** Server-side errors are authoritative. Client retries. RLS failures are silent (return empty result set, not error).

**Patterns:**

1. **Network Errors (Client)**
   - Try/catch around Supabase mutations
   - If offline, add to sync queue (IndexedDB)
   - On reconnect, replay queue in order (last-write-wins for conflicts)

2. **RLS Failures**
   - User tries to read/write data they don't belong to
   - Supabase returns empty result set (not an error)
   - Client must guard: "Did I get the data I asked for? If not, re-authenticate."

3. **Server Function Errors (Postgres)**
   - `recalculate_estimate_totals()` fails → update fails, transaction rolled back
   - Client gets error response, sync queue retries
   - Money math is in Postgres (authoritative), not client

4. **External API Errors (AI, Stripe, Resend)**
   - Anthropic timeout → return error, don't insert incomplete data
   - Stripe webhook delivery fails → Stripe retries; endpoint is idempotent (checks `stripe_events` table)
   - Resend failure → log, alert ops, don't fail the user's action

5. **Validation**
   - All inputs validated server-side in RLS policies and Postgres functions
   - Client validation is UX only (instant feedback)
   - Totals always recomputed server-side (never trust client)

---

## Cross-Cutting Concerns

**Logging:** 
- AI calls logged to `ai_usage_events` (mandatory, non-optional)
- Stripe events logged to `stripe_events` (idempotency check)
- Error logs sent to Vercel observability (future setup)

**Validation:**
- RLS policies enforce org membership on all reads/writes
- Postgres constraints (UNIQUE, NOT NULL, CHECK, FKs) prevent bad data
- `estimate_status` and `invoice_status` are Postgres ENUMs (enforced at DB layer)
- Monetary totals recomputed by `recalculate_estimate_totals()` function

**Authentication:**
- Supabase Auth with email + password and magic link
- JWT passed in Authorization header on all API calls
- Session checked on app mount; redirected to login if expired
- `auth.uid()` used in RLS policies to determine current user

**Multi-Tenancy:**
- Organization is the isolation root
- All tables have `organization_id` column
- RLS policies check `is_org_member(org_id)` before allowing any CRUD
- Public endpoint (`/e/{token}`) bypasses auth but filters by token, not user
- No cross-org data exposure possible (RLS is default deny)

---

*Architecture analysis: 2026-05-02*
