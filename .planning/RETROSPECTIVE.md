# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-24
**Phases:** 3 | **Plans:** 10 (GSD) + 8 (superpowers)
**Commits:** ~191

### What Was Built

- Full multi-tenant Supabase data layer: 13 migrations, RLS on every table, sequential numbering
- Auth lifecycle: signup, email verification, password reset, persistent sessions, org creation onboarding
- Contractor dashboard: estimate list, sorting, bulk delete, stat cards
- Estimate editor: sections, line items, drag-and-drop reorder, 800ms autosave, IndexedDB offline queue, photo attachments, duplicate
- AI drafting: `/api/ai/draft-estimate` serverless endpoint, low/typical/high price ranges, source tagging, usage logging
- 5-step estimate creation wizard: client, location, photos, description, AI Q&A — with voice input
- Contracting category selector: 10 trade types with category-aware Anthropic prompts, Playwright E2E tests
- Send estimate email (Resend) + client approval flow (public token view `/e/:token`)
- Free/pro tier gating: 5/month free, upgrade modal with mailto CTA
- UI modernization: Phosphor icons, warm stone/orange palette, mobile-responsive throughout

### What Worked

- **GSD phased planning** — The 3-phase structure (auth → editor → AI) gave clear build order and prevented premature complexity
- **Superpowers plans for feature work** — After Phase 3, switching to superpowers execution plans for individual features (wizard, UI, mobile, email) was fast and effective for focused tasks
- **RLS-first design** — Writing RLS policies before frontend queries caught multi-tenant issues early; `is_org_member()` helper kept policies readable
- **Zustand normalized store** — The normalized estimate tree (`{ sections: {[id]}, lineItems: {[id]} }`) made drag-and-drop reorder and optimistic UI straightforward
- **Server-authoritative totals** — `recalculate_estimate_totals()` as a Postgres function meant the client never had to be trusted for business-critical numbers
- **Integer cents throughout** — The money utility (`formatCents`, `lineItemTotal`, etc.) enforced the invariant at the edges; no floating-point bugs in financial logic

### What Was Inefficient

- **Phase 3 outside GSD workflow** — Phase 3 (AI drafting) was executed via a superpowers plan, leaving no GSD PLAN.md/SUMMARY.md on disk. Artifacts had to be backfilled at milestone close. If a phase is executed, it should produce GSD artifacts regardless of which execution mechanism was used.
- **Vercel deployment debugging** — Multiple commits fixing Vercel build errors (env var access, TypeScript module config, API routing). Vercel's API compilation behavior should be understood before implementation, not discovered iteratively.
- **estimateCount limit raised during development** — Temporarily raised to 1000 for testing convenience (35cc910), never reset. This is a production bug risk. Test limits should use test accounts, not modify production config.
- **Missing GSD verification** — No VERIFICATION.md was created for Phase 3. Post-Phase 2, verification discipline loosened. The superpowers workflow doesn't enforce verification checkpoints the way GSD does.

### Patterns Established

- **Category-aware AI prompts** — `questionsPromptContext` + `draftPromptContext` per trade category dramatically improve AI output relevance. This pattern should extend to any future AI features.
- **Vercel serverless TS** — API routes in `api/` compile as ES modules; env vars must be accessed at runtime in handler scope, not module scope. `api/lib/supabase.ts` provides `createAuthSupabase` (JWT-scoped) and `getServiceSupabase` (service role) helpers.
- **Public token pattern** — `estimates.public_token` (24-byte base64) with RLS `SELECT` policy for unauthenticated reads. URL pattern `/e/:token`. No user context needed. Can be reused for invoice links, approval flows.
- **Phosphor icons + warm palette** — `@phosphor-icons/react` with `weight="bold"` at 16–24px. Stone (neutral) + orange (primary/AI) + blue (action). Pattern established across all pages.

### Key Lessons

1. **Execute phases in GSD, not around it.** When a phase is built via a superpowers plan, it looks complete in git but invisible to GSD. Either use GSD for all phase work, or write PLAN.md + SUMMARY.md immediately after execution outside GSD.
2. **Test billing limits with test accounts.** Raising the estimate limit for dev convenience creates a production risk. Use a separate org with `plan='pro'` for testing, not a global config change.
3. **Understand Vercel's build model before building APIs.** Vercel compiles API routes differently from Vite's frontend build. Env var access, module format, and TypeScript config all behave differently. Read the Vercel docs once before the first API route.
4. **Category context = much better AI.** The difference between a generic AI estimate and a category-specific one is stark. Trade-specific section names, unit types, and markup percentages make estimates immediately more useful.

### Cost Observations

- Model: claude-haiku-4-5-20251001 for AI drafting (fast, cheap, sufficient quality for estimate generation)
- No production AI usage data yet (app not live with real users)
- Category Playwright tests make real AI calls (~30–60s per category, 10 categories × 2 tests = ~20 real API calls per full test run)

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 3 |
| GSD Plans | 10 |
| Superpowers Plans | 8 |
| Commits | ~191 |
| Migrations | 13 |
| Test files | ~15 (vitest + playwright) |
| Days to ship | ~22 (2026-05-02 → 2026-05-24) |
