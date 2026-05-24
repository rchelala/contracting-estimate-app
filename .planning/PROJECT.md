# EstimateFlow

## What This Is

EstimateFlow is a web-first AI-assisted estimating SaaS for contractors. Contractors create professional estimates in under 3 minutes using a guided wizard or the direct editor, get AI-drafted sections and line items with low/typical/high price ranges they review and approve, and send estimates to clients via email with a public approval link. v1.0 ships the complete contractor-facing product loop.

## Core Value

A contractor can create a complete, accurate estimate in under 3 minutes using AI assistance — and send it the same session.

## Requirements

### Validated (v1.0)

**Data Layer (Stage 1):**
- ✓ Multi-tenant database schema (13 tables, enums, RLS helpers) — Stage 1
- ✓ RLS on every table — default deny, org-scoped via is_org_member/is_org_owner — Stage 1
- ✓ Business logic: recalculate_estimate_totals(), next_estimate_number() — Stage 1
- ✓ TypeScript types generated from live schema (database.types.ts) — Stage 1
- ✓ Money utility (integer-cent arithmetic, markup, formatting), 14 unit tests — Stage 1
- ✓ Per-org sequential estimate numbering (race-safe via estimate_sequences table) — Stage 1

**Phase 1 — Auth, Org & Dashboard:**
- ✓ User can sign up, log in, reset password, stay logged in across sessions — Phase 1
- ✓ First sign-up creates organization and owner membership — Phase 1
- ✓ Authenticated dashboard shows org context and estimate list — Phase 1
- ✓ Dashboard: estimate number, client name, status, total, last updated, bulk delete — Phase 1

**Phase 2 — Estimate Editor:**
- ✓ Create estimate with client, title, sections, line items (qty, unit price, markup, optional) — Phase 2
- ✓ Estimate totals computed with integer cents; server recomputes on every save — Phase 2
- ✓ Drag-and-drop reorder for sections and line items (@dnd-kit) — Phase 2
- ✓ 800ms autosave with IndexedDB offline queue — Phase 2
- ✓ Photo attachments per section or line item (Supabase Storage) — Phase 2
- ✓ Duplicate estimate, draft → sent status lifecycle — Phase 2

**Phase 3 — AI Drafting & Billing:**
- ✓ AI drafting: job description → sections + line items with low/typical/high ranges — Phase 3
- ✓ AI content tagged source='ai', shown with "Suggested by AI" badge — Phase 3
- ✓ Every AI call logged to ai_usage_events (tokens, cost, model, latency) — Phase 3
- ✓ Free tier: 5 estimates/month; Pro: unlimited; usage counter on dashboard — Phase 3

**Beyond Original Phase Scope (superpowers plans):**
- ✓ 5-step estimate creation wizard with voice input, photos, AI Q&A — post-Phase 3
- ✓ Category selector (10 contractor types) with category-aware AI prompts — post-Phase 3
- ✓ Send estimate email (Resend) + client approval flow (public token view) — post-Phase 3
- ✓ Client deletion from dropdown — post-Phase 3
- ✓ UI modernization: Phosphor icons, warm stone/orange palette — post-Phase 3
- ✓ Mobile-responsive layouts throughout — post-Phase 3

### Active (v1.1 goals)

- [ ] Client can view estimate via unique token link (no login) — currently ships as basic HTML, needs full portal UI
- [ ] Client can approve or decline an estimate from the portal
- [ ] Client signs approval with typed name
- [ ] Contractor receives notification when client approves/declines
- [ ] Contractor connects Stripe account (Stripe Connect Express onboarding)
- [ ] Client can pay approved estimate via Stripe from the client portal
- [ ] Invoice auto-generated from approved estimate
- [ ] Automated follow-up reminder schedule (Resend, configurable intervals)
- [ ] Tax calculated on payment via Stripe Tax

### Out of Scope

- Mobile native app — web-first only; responsive web serves mobile ✓ solved
- Canvas signature pad — typed name sufficient for MVP
- Estimate options (Good/Better/Best tiers) — schema placeholder exists
- Multi-user org invitations — org_members table ready; invite flow deferred
- Estimate PDF export — browser print works for MVP
- OAuth login (Google, GitHub) — email/password sufficient
- Photo AI analysis (/api/ai/analyze-photo) — v2 requirement
- Usage analytics dashboard for contractors — post-MVP

## Context

**Codebase state (v1.0):** Full-stack TypeScript app deployed on Vercel. React 18 + Vite frontend, Supabase Postgres backend (sfkdtwirkdpagxcflrwr), Vercel serverless API layer. ~8,000+ LOC across src/, api/, supabase/. All 13 migrations live. Playwright E2E tests for the wizard flow.

**Tech stack (locked):** React 18 + TypeScript strict + Vite + Tailwind CSS v4 + React Router v6 + Supabase + Anthropic API via Vercel serverless + Resend + @dnd-kit/core + idb-keyval + @phosphor-icons/react.

**Pending for v1.1:** Stripe Connect (contractor payouts), Stripe Checkout (client payments), Stripe Tax, full client portal redesign, invoice generation.

**Known tech debt:**
- estimateCount limit was raised to 1000 during development (35cc910) — reset to 5 for production
- Phase 3 was executed outside GSD workflow (superpowers plan); artifacts were backfilled at v1.0 close
- Client approval view (`/e/:token`) exists but is basic; needs production-grade portal UI for v1.1

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
| Supabase over Firebase | Relational data, multi-tenant RLS, SQL for reporting | ✓ Good — RLS proved invaluable for multi-tenant isolation |
| Integer cents for money | Float arithmetic produces pennies-off errors in financial apps | ✓ Good — money utility used consistently throughout |
| Server-authoritative totals | Client draft totals advisory; server enforces correctness | ✓ Good — recalculate_estimate_totals() called on every save |
| AI included in all tiers | Simplifies billing, positions AI as core feature not upsell | ✓ Good — no billing complexity added |
| Free: 5/mo, Pro: unlimited | Low friction to start, clear upgrade signal when contractors get busy | ✓ Good — mailto upgrade CTA sufficient for MVP |
| Per-org sequential numbering | EST-001 looks professional; race-safe via estimate_sequences | ✓ Good — confirmed working in production |
| MVP = estimates-only (no client portal/payment) | Validate core loop first; portal + payment add significant complexity | ✓ Good — shipped fast, client portal moved to v1.1 |
| Tax deferred to v1.1 | No payment collection in MVP; Stripe Tax natural fit with Stripe Connect | ✓ Good — confirmed appropriate deferral |
| Estimate creation wizard | Alternative to direct editor; guided flow with AI Q&A and voice input | ✓ Good — wizard is primary AI entry point post-ship |
| 10 contractor categories with category-aware prompts | Trade-specific prompts produce dramatically better AI estimates | ✓ Good — validated with Playwright tests per category |
| Resend for email | Simple API, good deliverability, easy template management | ✓ Good — branded confirmation email works |
| Public token for client view | Cryptographic token allows unauthenticated client access | ✓ Good — secure, simple URL pattern `/e/:token` |

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
*Last updated: 2026-05-24 after v1.0 MVP milestone*
