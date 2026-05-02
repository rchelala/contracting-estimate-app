# EstimateFlow

## What This Is

EstimateFlow is a web-first AI-assisted estimating SaaS for contractors. Contractors create professional estimates in under 3 minutes, get AI-drafted line items they review and approve, and send estimates to clients. MVP ships estimates-only — the contractor-facing product loop — with client approval and payment collection coming in v1.1.

## Core Value

A contractor can create a complete, accurate estimate in under 3 minutes using AI assistance — and send it the same session.

## Requirements

### Validated

- ✓ Multi-tenant database schema (organizations, org_members, clients, estimates, sections, line_items, attachments, invoices, payments, ai_usage_events, automations, tax_rates, stripe_events) — Stage 1
- ✓ RLS on every table — default deny, org-scoped via is_org_member/is_org_owner helpers — Stage 1
- ✓ Public token policy on estimates for unauthenticated client-facing views (future) — Stage 1
- ✓ Business logic: recalculate_estimate_totals(), next_estimate_number(), next_invoice_number() — Stage 1
- ✓ TypeScript types generated from live schema (database.types.ts) — Stage 1
- ✓ Money utility (integer-cent arithmetic, markup, formatting) with 14 passing unit tests — Stage 1
- ✓ Per-org sequential estimate numbering (estimate_sequences table with race-safe next_estimate_number()) — Stage 1

### Active

- [ ] User can sign up, log in, and stay logged in across sessions
- [ ] First sign-up creates an organization and owner membership (multi-tenant entry point)
- [ ] Authenticated dashboard shows org context and estimate list (empty state on first load)
- [ ] User can create a new estimate with a client, title, and at least one line item
- [ ] Estimates have labeled sections; line items belong to sections
- [ ] Line items have qty, unit price (cents), markup %, optional flag; totals computed correctly
- [ ] Estimate total recomputed server-side on every save (recalculate_estimate_totals)
- [ ] User can reorder sections and line items via drag-and-drop
- [ ] Estimate autosaves with 800ms debounce; offline queue persists to IndexedDB
- [ ] AI drafts an estimate from a brief job description (section + line item suggestions)
- [ ] AI-generated content is tagged source='ai' and shown with "Suggested by AI — review before sending" badge
- [ ] User can attach photos to sections/line items (uploaded to Supabase Storage)
- [ ] Estimate status lifecycle: draft → sent (manual send for MVP, no client portal)
- [ ] Free tier: 5 estimates/month; Pro tier: unlimited estimates/month
- [ ] AI included in both tiers (no separate AI billing for MVP)
- [ ] All AI calls logged to ai_usage_events (tokens, cost_cents, model, latency_ms)

### Out of Scope (MVP)

- Client-facing estimate view and approval portal — v1.1
- Online payment collection via Stripe Connect — v1.1
- Invoice generation from approved estimate — v1.1
- Automated reminders and follow-up automations — v1.1
- Tax calculation (Stripe Tax / TaxJar / ZIP-based) — v1.1 when payments added
- Client approval signature (typed name or canvas) — v1.1 with client portal
- Estimate options (Good/Better/Best tiers) — post-MVP
- Mobile native app — web-first only

## Context

**Codebase state:** Stage 1 (data layer) is complete on branch `stage1-schema`. All 11 migrations are written, TypeScript types generated, money utility tested. The branch needs to be merged to main before Stage 2 begins.

**Tech stack locked:** React 18 + TypeScript strict + Vite + Tailwind CSS + React Router v6 + Supabase + Anthropic API via Vercel serverless + Stripe Connect + Resend + idb-keyval + @dnd-kit/core. See CLAUDE.md for full stack rationale.

**Editor is the hardest part:** Zustand store (editorStore) holds a normalized estimate tree. Autosave is debounced 800ms into a sync queue persisted to IndexedDB. @dnd-kit handles reorder; only changed position rows are patched. Server recomputes totals on every save.

**AI boundaries:** All AI calls go to /api/ai/* Vercel serverless — never client-side. AI returns ranges (low/typical/high), never single numbers. Source tagging is required.

**Money rules:** All amounts stored and computed as integer cents. Money utility enforces this. Display formatting at the edge only.

## Constraints

- **Multi-tenancy**: Every domain table has organization_id; every RLS policy filters on org membership — no exceptions
- **Security**: Anthropic key, Stripe secret, Resend key never exposed to client — go through /api/* only
- **TypeScript**: Strict mode, no `any`. Use `unknown` and narrow.
- **Server authority**: Client computes totals for UX; server recomputes on save. Never trust client totals for business logic.
- **AI autonomy**: AI drafts and suggests only. Contractor sends. AI never auto-acts.
- **Offline**: Sync queue must survive browser close; IndexedDB via idb-keyval.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Firebase | Relational data, multi-tenant RLS, SQL for reporting, joinable line items | — Pending |
| Integer cents for money | Float arithmetic produces pennies-off errors in financial apps | — Pending |
| Server-authoritative totals | Client draft totals are advisory; server enforces correctness for invoicing/payment | — Pending |
| AI included in all tiers | Simplifies billing, positions AI as core feature not upsell | — Pending |
| Free: 5 estimates/mo, Pro: unlimited | Low friction to start, clear upgrade signal when contractors get busy | — Pending |
| Per-org sequential numbering | EST-001 looks professional; race condition handled by estimate_sequences table + next_estimate_number() | — Pending |
| MVP = estimates-only (no client portal/payment) | Validate core loop first; client portal + payment add significant complexity | — Pending |
| Tax deferred to v1.1 | No payment collection in MVP; Stripe Tax is natural fit when Stripe Connect added | — Pending |
| Typed-name signature for v1.1 | Simplest legally-sufficient signature for contractor/client context | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-02 after initialization*
