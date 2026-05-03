# Phase 3: AI Drafting & Billing - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A contractor can describe a job and receive an AI-drafted estimate (sections + line items with low/typical/high price ranges and an AI badge) directly in the editor. Free-tier contractors are gated at 5 estimates/month with a visible counter, a hard block at the limit, and a mailto upgrade CTA. Pro-tier contractors have no limit.

Client portal, payment collection, invoice generation, and Stripe Connect remain out of scope. Stripe billing for plan upgrades is also out of scope — Pro upgrade is manual (mailto) for Phase 3.

</domain>

<decisions>
## Implementation Decisions

### AI Entry Point

- **D-01:** AI drafting is triggered from the empty estimate state. When a blank estimate opens (no sections, no line items), the empty EstimateBody shows two options: "Draft with AI" and "Start manually".
- **D-02:** Clicking "Draft with AI" reveals an inline textarea (no modal) inside the empty estimate area: "Describe the job..." with a Generate button below it. No navigation away from the editor.
- **D-03:** After generation, sections and line items populate the Zustand store directly and render in the editor in place of the textarea. No intermediate preview step — content appears immediately with AI badges. The contractor edits from there.

### AI Output & Price Ranges

- **D-04:** AI-drafted line items display a compact range badge in the unit price cell: e.g., `$500–800≈`. The typical value is stored in `unit_price_cents` immediately on insert — autosave works normally from that point.
- **D-05:** Clicking the range badge opens a small popover (same pattern as the ⋮ action menu from Phase 2) with three rows: Low $X / Typical $Y / High $Z. Clicking one sets unit_price_cents and closes the popover. The badge disappears once the contractor has explicitly picked a value (or edited the cell manually).
- **D-06:** AI-generated sections/items are tagged `source='ai'` in the DB. Each AI item shows a small "Suggested by AI — review before sending" badge inline on the row (satisfies AI-03, AI-04).
- **D-07:** The range badge and AI badge are stored as metadata (`low_cents`, `typical_cents`, `high_cents`, `source`) on the line item. Once the contractor picks or edits, the range badge disappears but `source='ai'` remains.

### Free Tier Gate

- **D-08:** Estimate count per org is tracked by querying `SELECT COUNT(*) FROM estimates WHERE organization_id = ? AND created_at >= start_of_current_month`. No new table. Count is checked server-side in the `/api/` layer (or a Supabase RPC) at estimate creation time.
- **D-09:** On the dashboard, free-tier users see a subtle usage line near the "New Estimate" button: "3 of 5 estimates used this month". This line turns amber at 4/5 and red at 5/5. Pro-tier users see nothing.
- **D-10:** When a free-tier contractor has used all 5 estimates, clicking "New Estimate" opens an upgrade modal instead of creating the estimate. The modal explains the limit and provides a mailto upgrade CTA. Hard block — no estimate is created.

### Pro Upgrade Mechanism

- **D-11:** Org tier is stored as a `plan` column (text, default `'free'`) on the `organizations` table. A migration adds this column. Pro upgrade for MVP = manually set to `'pro'` in the Supabase dashboard.
- **D-12:** The upgrade modal CTA is a mailto link: `mailto:robertchelala@gmail.com?subject=Upgrade+to+Pro`. Copy: "Email us to upgrade — we'll get you set up in minutes." No Stripe integration in Phase 3.
- **D-13:** The `plan` value is read by the app on dashboard load (via the existing membership/org query). It gates the estimate counter display and the hard-block check.

### Claude's Discretion

- Loading state while AI is generating (spinner inside the inline textarea area, or a skeleton in the section list — either is fine).
- Exact copy for the "Describe the job..." textarea placeholder (e.g., "e.g. Replace roof on a 2,000 sq ft residential home, including tear-off, underlayment, and shingles").
- Exact Tailwind classes and visual treatment of the AI badge and range badge.
- Whether the range badge shows all three values (Low / Typical / High) or just the range span ($500–800) — the popover always shows all three.
- Error handling copy if the AI call fails (e.g., "Couldn't draft estimate — try again or start manually").

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `CLAUDE.md` — Operating manual: stack constraints, non-negotiable rules (no VITE_-prefixed secrets, AI goes through /api/* only, money as integer cents, RLS on every table), AI boundaries (§AI Boundaries section)
- `.planning/REQUIREMENTS.md` — Acceptance criteria: AI-01–07, BILL-01–05
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, dependency on Phase 2

### Prior Phase Context
- `.planning/phases/01-auth-org-dashboard/01-CONTEXT.md` — Color palette (slate + blue-600), TopNav pattern, button styles
- `.planning/phases/02-estimate-editor/02-CONTEXT.md` — Editor architecture, Zustand store shape, autosave pattern, line item row structure, ⋮ action menu pattern (reuse for popover)

### Data Layer
- `supabase/migrations/` — Read migrations for `estimates`, `estimate_line_items`, `organizations`, `ai_usage_events` tables (column names, constraints)
- `src/types/database.types.ts` — Generated TypeScript types; source of truth for column names
- `supabase/migrations/20260502000009_ai_automations.sql` — Existing `ai_usage_events` table definition

### Existing Code (read before implementing)
- `src/stores/editorStore.ts` — Zustand store with `addSectionLocal`, `addLineItemLocal` — AI drafting populates via these same actions
- `src/services/estimates.ts` — Existing estimate query patterns; extend with `checkEstimateLimit()` and `createEstimateIfAllowed()`
- `src/utils/money.ts` — `formatCents()` for range badge display; `lineItemTotal()` for totals
- `src/components/estimate/EstimateBody.tsx` — Integration point: empty state currently rendered here; AI entry replaces it
- `src/pages/DashboardPage.tsx` — Integration point: "New Estimate" button and estimate count display live here

### AI API
- `CLAUDE.md §AI Boundaries` — `/api/ai/draft-estimate` is the target endpoint (must create); Anthropic key server-side only; log to `ai_usage_events` on every call

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/stores/editorStore.ts` — `addSectionLocal` / `addLineItemLocal` / `hydrate` — AI response can be mapped to `EditorSection` + `EditorLineItem` types and inserted via these actions without touching the autosave queue directly
- `src/components/estimate/EstimateBody.tsx` — `EmptyEstimate` component is the current empty state; Phase 3 replaces it with the AI entry UI
- `src/components/ui/StatusBadge.tsx` — Badge pattern; AI badge can follow same pill component pattern
- `src/components/layout/TopNav.tsx` — Reuse as-is
- `src/utils/money.ts` — `formatCents()` for displaying low/typical/high values in the popover

### Established Patterns
- ⋮ action menu pattern (see `LineItemActions.tsx`, `RowActionsMenu` in `DashboardPage.tsx`) — reuse for range-picker popover
- Services are plain async functions; extend `estimates.ts` with AI-related helpers
- All pages use `useAuth()` for org context — same applies to reading `plan` column
- TypeScript strict — no `any`; `EditorLineItem` type will need `low_cents?`, `typical_cents?`, `high_cents?`, `source?` fields added

### Integration Points
- `api/` directory does not yet exist — Phase 3 creates it with `ai/draft-estimate.ts` (Vercel serverless)
- `organizations` table needs `plan` column migration (new migration file)
- `estimate_line_items` table may need `low_cents`, `typical_cents`, `high_cents`, `source` columns (check existing migrations — `source` may already exist from Stage 1)
- Dashboard "New Estimate" button in `DashboardPage.tsx` needs to check limit before navigating
- `ai_usage_events` insert must happen server-side in the `/api/ai/draft-estimate` handler

</code_context>

<specifics>
## Specific Ideas

- The AI entry inline textarea should feel lightweight — a text area + button, not a form. The Phase 2 "spreadsheet-like" feel should carry over: AI drafting populates the spreadsheet, the contractor owns it from there.
- The upgrade modal uses a mailto CTA to `robertchelala@gmail.com` — this is the real contact email for Phase 3 MVP.
- The `plan` column on `organizations` is the minimal billing hook; when Stripe is added in v1.1 the column value becomes the source of truth synced from webhook events.

</specifics>

<deferred>
## Deferred Ideas

- Stripe Checkout / subscription billing — v1.1 when Stripe Connect is added for contractor payouts
- Photo analysis (`/api/ai/analyze-photo`) — v2 requirement (PHOTO-01, PHOTO-02); not in Phase 3 scope
- Usage analytics dashboard for the contractor (tokens used, AI calls made) — post-MVP

</deferred>

---

*Phase: 03-ai-drafting-billing*
*Context gathered: 2026-05-03*
