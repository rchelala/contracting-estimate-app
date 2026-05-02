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
