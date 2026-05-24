# Phase 1: Auth, Org & Dashboard - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A contractor can sign up with email and password, verify their email, name their organization, and land on a working dashboard that lists their estimates. Covers the full auth lifecycle (sign-up, log-in, password reset, session persistence, log-out) and the org onboarding step. Dashboard shows the estimate list (empty state on first load) with a visible "New Estimate" action.

New capabilities (estimate editing, AI drafting, billing gates) are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Auth UI

- **D-01:** Use `@supabase/auth-ui-react` with `ThemeSupa` theme for all auth forms (sign-up, log-in, password reset). No custom-built forms — the pre-built component handles toggling between modes and all auth flows.
- **D-02:** Single `/auth` route. The Supabase Auth UI component toggles between sign-in and sign-up modes internally. No separate `/signup` and `/login` routes.
- **D-03:** No social/OAuth providers for MVP. Email + password only.

### Org Onboarding

- **D-04:** After email verification and first login, redirect to `/onboarding` before the dashboard.
- **D-05:** `/onboarding` page asks one question: "What's your company name?" with a placeholder like "e.g. Apex Roofing Co." — required field, cannot be skipped. On submit, create the `organizations` row and `organization_members` row (role='owner'), then redirect to `/dashboard`.
- **D-06:** Returning users (org already exists) bypass `/onboarding` entirely on login.

### Dashboard Layout

- **D-07:** Top nav bar pattern: logo left, nav links (Estimates, Settings), user avatar/initials right. No sidebar.
- **D-08:** Estimate list displayed as a sortable table with columns: Estimate # | Client | Title | Status | Total | Last Updated. Columns match DASH-03 requirements.
- **D-09:** "New Estimate" is a primary button placed top-right above the table. Not in the top nav for Phase 1 — that can be added in Phase 2 when the editor route exists.
- **D-10:** Status badges: colored pill labels (Draft = gray, Sent = blue). No other statuses in Phase 1.

### Claude's Discretion

- Empty state design within the dashboard (copy, illustration vs. simple text, whether to show a CTA prompt). Standard "No estimates yet — create your first one" with the "New Estimate" button is fine.
- Color palette and specific Tailwind classes — use a clean neutral professional palette appropriate for a contractor-facing B2B SaaS tool.
- Exact wording of validation errors, loading states, and toast notifications.
- Whether to show the org name in the dashboard header (user avatar dropdown or inline) — handle as makes sense.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `CLAUDE.md` — Operating manual: stack constraints, non-negotiable rules (multi-tenancy, money as cents, RLS, no VITE_-prefixed secrets), project structure, editor architecture
- `.planning/REQUIREMENTS.md` — Acceptance criteria for Phase 1: AUTH-01–05, ORG-01–04, DASH-01–04
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependency chain

### Data Layer (Stage 1 — complete)
- `.worktrees/stage1-schema/supabase/migrations/` — All 11 migrations; agents should read `000003_organizations.sql`, `000002_rls_helpers.sql`, and `000001_enums.sql` for org/member structure and RLS helper functions
- `src/types/database.types.ts` (generated from schema, in worktree) — TypeScript types for all tables

### No external specs referenced during discussion.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/money.ts` — Integer-cents arithmetic; not needed directly in Phase 1 UI but referenced for dashboard total display (format cents to "$X,XXX")
- Supabase schema: `organizations`, `organization_members`, `estimates` tables with RLS already written

### Established Patterns
- Supabase client initialized in `src/lib/supabase.ts` (to be created) — all queries go through this singleton
- TypeScript strict mode, no `any` — applies to all new components, hooks, and services
- Named exports for utilities, default exports for React components only

### Integration Points
- Auth callback: Supabase sends email verification links to `{origin}/auth/callback` — needs a route handler that exchanges the token and redirects to `/onboarding` (first login) or `/dashboard` (returning user)
- `/onboarding` → creates `organizations` + `organization_members` rows via Supabase client → redirects to `/dashboard`
- `/dashboard` queries `estimates` table filtered by `organization_id` via RLS (no explicit org filter needed — RLS handles it)

</code_context>

<specifics>
## Specific Ideas

- Auth page should show the EstimateFlow logo/name prominently — it's the first impression of the product.
- `/onboarding` is intentionally minimal: one question, one button. No wizard, no logo upload, no extra fields in Phase 1.
- Table row click navigates to the estimate editor (Phase 2 route) — wire up the navigation target as a placeholder or stub for now.

</specifics>

<deferred>
## Deferred Ideas

- "New Estimate" button in top nav (available from any page) — deferred to Phase 2 when the editor route exists
- Empty state guided prompt that leads into AI drafting — deferred to Phase 3
- Org logo upload on onboarding — deferred, not in MVP scope
- Dashboard filtering/search on the estimate table — deferred, not in Phase 1 scope

</deferred>

---

*Phase: 01-auth-org-dashboard*
*Context gathered: 2026-05-02*
