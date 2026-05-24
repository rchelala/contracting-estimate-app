# Milestones

## v1.0 MVP (Shipped: 2026-05-24)

**Phases completed:** 3 phases, 10 plans

**Key accomplishments:**

1. Full multi-tenant data layer: 12 Supabase migrations, RLS on every table, org-scoped via `is_org_member/is_org_owner`, sequential estimate numbering (race-safe), server-authoritative `recalculate_estimate_totals()`
2. Complete auth lifecycle: email/password signup, email verification, password reset, persistent sessions, `RequireAuth` guard, org creation onboarding
3. Contractor dashboard: estimate list with 6 columns, sorting, empty/loading/error states, bulk delete, TopNav with sign-out
4. Full estimate editor: sections + line items, inline cell editing, drag-and-drop reorder (@dnd-kit), 800ms autosave with IndexedDB offline queue, photo attachments (Supabase Storage), duplicate estimate, status lifecycle (draft → sent)
5. AI drafting: `/api/ai/draft-estimate` Vercel serverless endpoint, low/typical/high price ranges, `source='ai'` tagging, AI badges, every call logged to `ai_usage_events`
6. 5-step estimate creation wizard with category selector (10 contractor categories), voice input, AI Q&A, category-aware Anthropic prompts, Playwright E2E tests
7. Client estimate approval flow: public token view (`/e/:token`), approve API, send-estimate email (Resend), branded confirmation email
8. Free/pro tier gating: 5 estimates/month free, upgrade modal with mailto CTA, `plan` column on organizations
9. UI modernization: Phosphor icons, warm stone/orange palette, mobile-responsive card layouts, Settings page

**Stats:**
- Phases: 3 (Phase 1: 4 plans, Phase 2: 5 plans, Phase 3: 1 plan)
- Additional feature work: 8 superpowers plans (wizard, bulk delete, UI modernization, mobile, email, approval flow, client deletion, category)
- Deployment: Vercel (SPA + serverless API)
- Database: Supabase Postgres (sfkdtwirkdpagxcflrwr) with 12 migrations

---
