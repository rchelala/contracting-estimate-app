# External Integrations

**Analysis Date:** 2026-05-02

## APIs & External Services

**AI (Anthropic):**
- Service: Anthropic Claude API
  - SDK/Client: Anthropic official SDK (not yet installed)
  - Endpoint: Via Vercel serverless `/api/ai/*`
  - Routes: `/api/ai/draft-estimate`, `/api/ai/analyze-photo`
  - Auth: `ANTHROPIC_API_KEY` (private, not Vite-prefixed)
  - Usage tracked in `ai_usage_events` table with tokens, cost, model, latency
  - Call types: `draft_estimate`, `analyze_photo` (enum in database)

**Payments (Stripe):**
- Service: Stripe + Stripe Connect
  - SDK/Client: stripe (not yet installed)
  - Publishable Key: `VITE_STRIPE_PUBLISHABLE_KEY` (safe for client)
  - Secret Key: `STRIPE_SECRET_KEY` (private, via `/api/*` only)
  - Webhook endpoint: `/api/stripe/webhook`
  - Webhook auth: `STRIPE_WEBHOOK_SECRET` (signature verification required)
  - Mode: Stripe Connect (contractors are connected accounts with Express onboarding)
  - Tables: `payments`, `stripe_events`

**Email (Resend):**
- Service: Resend email API
  - SDK/Client: resend (not yet installed)
  - Auth: `RESEND_API_KEY` (private, via `/api/*` only)
  - Route: Endpoint unknown, configure in `/api/*` functions

## Data Storage

**Primary Database:**
- Provider: Supabase (Postgres)
- Connection: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Client: `@supabase/supabase-js` 2.105.1
- Initialization: `src/lib/supabase.ts`
- Type generation: `src/types/database.types.ts` (auto-generated from Supabase)
- Features: RLS (Row Level Security), Auth, GraphQL

**Tables (multi-tenant, all have `organization_id`):**
- `organizations` - Tenant root, Stripe Connect integration fields
- `organization_members` - User access control by role (owner/member)
- `clients` - Contractor's customer contacts
- `estimates` - Estimate headers with status, totals, approval tracking
- `estimate_sections` - Ordered groups within estimates
- `estimate_line_items` - Line items with qty, price, markup, AI pricing ranges
- `estimate_sequences` - Per-org estimate number sequences
- `estimate_attachments` - Photos/files linked to sections or items
- `invoices` - Generated from approved estimates
- `invoice_sequences` - Per-org invoice number sequences
- `payments` - Stripe payment intent records
- `stripe_events` - Idempotent webhook processing (deduplication)
- `ai_usage_events` - AI call tracking (tokens in/out, cost cents, latency, model)
- `automations` - Editable automation rules (schedules, notifications)
- `tax_rates` - Tax lookup table (state + zip → combined rate %)

**File Storage:**
- Provider: Supabase Storage (S3-compatible)
- SDK/Client: @supabase/storage-js (not yet installed)
- Paths stored in: `estimate_attachments.storage_path`, `organizations.logo_storage_path`
- Thumbnail generation: Supabase Edge Function on insert
- Access: Public URLs for client-facing estimates

**Offline Buffer:**
- Provider: Browser IndexedDB
- SDK/Client: idb-keyval (not yet installed)
- Purpose: Sync queue persistence during offline periods
- Store: `syncQueueStore` (Zustand)
- Replay strategy: Last-write-wins for MVP

**Caching:**
- Not currently implemented (none detected)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built into Supabase Postgres)
- Method: Email + password (assumed from RLS patterns)
- Session management: Supabase client handles tokens
- JWT tokens: Verified at Postgres RLS layer
- Multi-tenant: Enforced via `organization_members` table + RLS policies

**RLS (Row Level Security):**
- Default deny policy on all tables
- Checks: User membership in organization via `is_org_member()` function
- Admin checks: `is_org_owner()` function for sensitive operations
- Database functions in: `supabase/migrations/20260502000002_rls_helpers.sql`

## Monitoring & Observability

**Error Tracking:**
- Not detected in exploration
- Recommendation: Sentry or similar should be added

**Logs:**
- Approach: Console (browser) + Vercel function logs
- No centralized logging detected
- Database: `ai_usage_events` table serves as audit log for AI calls

**Analytics:**
- Not detected
- Database supports reporting via SQL queries (mentioned in CLAUDE.md)

## CI/CD & Deployment

**Hosting:**
- Platform: Vercel
- Configuration: `vercel.json` (SPA rewrite + API route config)
- Edge Functions: Not yet used (possible for thumbnail generation)

**CI Pipeline:**
- Not yet configured (GitHub Actions or Vercel CI possible)
- Quality gates defined in CLAUDE.md: lint, type-check, build, test

**Preview Deployments:**
- Vercel preview URL testing required before merge to `main`

## Environment Configuration

**Required Environment Variables (by tier):**

*Safe for client (Vite-prefixed):*
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLISHABLE_KEY  (assumed, not yet in .env.example)
```

*Server-only (via `/api/*`):*
```
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
```

**Secrets Location:**
- Development: `.env.local` (git-ignored)
- Production: Vercel Environment Variables dashboard
- No secrets in `.env.example` (all empty, safe to commit)

## Webhooks & Callbacks

**Incoming:**
- Stripe Webhook: `POST /api/stripe/webhook`
  - Event types: payment_intent.succeeded, payment_intent.payment_failed, (others)
  - Verification: Signature check via `STRIPE_WEBHOOK_SECRET`
  - Idempotency: `stripe_events` table deduplication
  - Processing: Updates `payments`, `invoices` table status

**Outgoing:**
- Email via Resend (endpoint unknown, to be configured)
- Stripe Connect payouts (configured via Stripe dashboard, not API)

## Multi-Tenant Architecture

**Tenant Isolation:**
- Every table has `organization_id` column
- RLS policies enforce `organization_id = auth.uid()'s org`
- Functions: `is_org_member(p_org_id)`, `is_org_owner(p_org_id)` verify membership
- Stripe Connect: `organizations.stripe_account_id` stores Express account ID

**Per-Org Configuration:**
- `organizations.default_tax_zip` - Default tax jurisdiction
- `organizations.platform_fee_pct` - Platform fee (default 0%)
- `organizations.plan` - Subscription tier
- `organizations.plan_period_start` - Billing cycle date
- `organizations.stripe_onboarding_complete` - Stripe Connect setup flag

## Data Integrity & Monetary Values

**Financial Calculations:**
- All money stored as **integer cents** (never floats)
- Utility functions in `src/utils/money.ts`:
  - `dollarsToCents(dollars)` - Convert input to cents
  - `centsToDollars(cents)` - Convert to display format
  - `applyMarkup(unitPriceCents, markupPct)` - Apply percentage markup
  - `lineItemTotal(qty, unitPriceCents, markupPct)` - Total with markup
  - `formatCents(cents, currencyCode='USD')` - Format for display
- Client totals are **advisory only** - server recalculates via `recalculate_estimate_totals(p_estimate_id)` Postgres function

**Estimate Calculations:**
- Subtotal from line items (qty × unit_price × (1 + markup%))
- Tax: Looked up from `tax_rates` table by ZIP code
- Total: subtotal + tax
- Function: `supabase/migrations/20260502000005_estimates.sql` defines function signature

## AI Integration Details

**Endpoints:**
- `/api/ai/draft-estimate` - Generate estimate from photo/description
- `/api/ai/analyze-photo` - Extract pricing/specs from photo

**Data Flow:**
1. Client uploads photo/description
2. Calls API endpoint (serverless function)
3. Function calls Anthropic API (with `ANTHROPIC_API_KEY`)
4. AI returns **ranges** (low_cents, typical_cents, high_cents)
5. Function logs to `ai_usage_events` (input_tokens, output_tokens, cost_cents, latency_ms, model)
6. Response tagged with `source: 'ai'` in database
7. Client sees "Suggested by AI — review before sending" badge

**Metering:**
- Every call logged with token counts and cost
- Supports future pricing models (included/addon/tiered)
- Cost calculation: depends on AI pricing decision (Open Question in CLAUDE.md)

---

*Integration audit: 2026-05-02*
