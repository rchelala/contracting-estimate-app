---
phase: "03"
plan: "01"
one_liner: "AI drafting endpoint ships with low/typical/high pricing ranges, source='ai' tagging, free/pro tier gates, and Vercel serverless deployment"
status: complete
completed: "2026-05-04"
tasks_completed: 6
files_changed: 9
---

# Phase 3, Plan 1 — Summary

## What Was Built

**Core AI Drafting:**
The `/api/ai/draft-estimate` Vercel serverless endpoint calls Anthropic (claude-haiku-4-5-20251001) with a structured tool (`create_estimate_draft`) that returns sections and line items with low/typical/high price ranges. The endpoint accepts a job description plus optional zip code, Q&A pairs, photo attachment IDs, and category. Every call is logged to `ai_usage_events` with tokens in/out, cost_cents, model, and latency_ms.

**AI Editor Integration:**
Empty estimates show "Draft with AI" and "Start manually" options. Choosing AI reveals an inline textarea — no modal, no navigation. After generation, sections and line items populate the Zustand store via `addSectionLocal`/`addLineItemLocal`. Each AI line item shows a range badge ($low–$high) in the unit price cell; clicking opens a popover with Low/Typical/High options. A "Suggested by AI — review before sending" badge appears on every AI row. The range badge disappears once the contractor picks or manually edits the value; `source='ai'` remains in the DB.

**Free/Pro Tier Gating:**
The `organizations` table gained a `plan` column (text, default 'free'). Free-tier contractors see a "X of 5 estimates used this month" counter near the New Estimate button (amber at 4/5, red at 5/5). At the limit, New Estimate opens an upgrade modal with a mailto CTA. Pro tier sees no counter. Plan value is read at dashboard load via the existing org membership query.

**Vercel Deployment:**
`vercel.json` routes `/api/*` to TypeScript serverless functions. Env vars are accessed at runtime (not module load) to satisfy Vercel's build isolation. TypeScript compilation targets ES modules for the API layer.

## Decisions Made

- **AI entry inline, not modal** (D-01/D-02): Keeps the contractor in the editor flow; textarea replaces the empty estimate message in-place
- **Typical value stored immediately** (D-04): `unit_price_cents` = typical on insert; autosave works normally from there; low/high stored as metadata
- **Badge disappears on explicit pick** (D-05): Reduces visual noise after the contractor has reviewed and accepted a value
- **Billing via DB count, no new table** (D-08): `COUNT(*) WHERE created_at >= start_of_month` — simple and correct for MVP scale
- **Pro upgrade = mailto for MVP** (D-12): No Stripe in Phase 3; mailto to robertchelala@gmail.com

## Requirements Satisfied

- AI-01: Job description → AI-drafted estimate with sections and line items ✓
- AI-02: AI returns low/typical/high ranges, not a single number ✓
- AI-03: AI content tagged `source='ai'` in database ✓
- AI-04: "Suggested by AI — review before sending" badge on AI rows ✓
- AI-05: Contractor can accept (pick range value), edit, or delete AI content ✓
- AI-06: Every AI call logged to ai_usage_events ✓
- AI-07: AI calls go through /api/ai/draft-estimate — never client-side ✓
- BILL-01: Free tier limited to 5 estimates/month ✓
- BILL-02: Pro tier unlimited ✓
- BILL-03: Usage counter on dashboard (free tier) ✓
- BILL-04: Upgrade prompt at limit ✓
- BILL-05: AI included in both tiers (no separate billing) ✓

## Issues / Gotchas

- Vercel build required moving all env var access to runtime handlers (not module scope) — Vite's build isolation strips process.env at compile time for API routes
- Anthropic response parsing needed robustness for floats in price cents and string booleans in `taxable` field (fixed post-ship: 78705ce)
- estimateCount limit was temporarily raised to 1000 during testing (35cc910), then left as-is for dev convenience

## Beyond Original Phase 3 Scope

These features were shipped after Phase 3 via superpowers plans (not in GSD planning artifacts):
- **Estimate creation wizard** (5-step flow: client → location → photos → describe → Q&A → generate)
- **Wizard category selector** (Step 0, 10 contractor categories, category-aware AI prompts)
- **Bulk delete estimates** (dashboard selection mode + confirmation modal)
- **UI modernization** (Phosphor icons, warm stone/orange palette across all pages)
- **Mobile responsive** (card layouts, touch-friendly controls)
- **Send estimate email** (Resend integration, SendEstimateModal, `/api/email/send-estimate`)
- **Client estimate approval flow** (`/e/:token` public view, `/api/estimate/approve`)
- **Client deletion** (Trash icon in ClientDropdown, confirmation modal)
- **Settings page** and back navigation
- **How It Works** marketing page with onboarding video
