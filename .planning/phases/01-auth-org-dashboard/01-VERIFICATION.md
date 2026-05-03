---
phase: 01-auth-org-dashboard
verified: 2026-05-02T00:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Sign up with a new email, verify email, land on /onboarding, submit company name, confirm redirect to /dashboard showing the org name"
    expected: "New contractor completes full onboarding in under 3 minutes and sees their org name on the dashboard"
    why_human: "Full signup flow requires a real Supabase auth email, browser interaction, and live DB row confirmation — cannot verify programmatically without running the app"
  - test: "Sign in with existing credentials, confirm session persists across browser refresh and tab close, then sign out from the avatar popover"
    expected: "Session survives refresh; sign-out returns to /auth"
    why_human: "Session persistence and sign-out require a live browser session and real Supabase JWT"
  - test: "Use the 'Forgot password?' link, receive the reset email, reset password, and confirm login with new password"
    expected: "Password reset flow completes end-to-end"
    why_human: "Requires real email delivery through Supabase and a live browser"
  - test: "Insert estimates for the org via SQL/Studio, reload /dashboard, and confirm table renders all six columns with correct status pill colors and formatted totals"
    expected: "Estimate list shows Estimate #, Client, Title, Status badge (gray Draft, blue Sent), Total ($X,XXX), Last Updated (relative or absolute date)"
    why_human: "Table rendering with real data requires a live DB and browser; status pill colors are visual"
  - test: "Multi-tenant isolation: sign in as User A and User B in different orgs; confirm each sees only their own estimates"
    expected: "RLS prevents cross-org data leakage"
    why_human: "Requires two live accounts and visual/network inspection to confirm RLS enforcement"
---

# Phase 1: Auth, Org & Dashboard — Verification Report

**Phase Goal:** A new contractor can sign up, create their organization, and reach a working dashboard that shows their estimates
**Verified:** 2026-05-02
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

All automated must-haves are verified. Five human verification items remain that require a live browser + Supabase connection. The code implementing every behavior is present, substantive, and wired — the human items cover end-to-end behavioral confirmation, not code gaps.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New contractor can sign up, verify email, reach dashboard showing org name | VERIFIED (code) / needs human (live flow) | AuthPage.tsx uses Auth+ThemeSupa with redirectTo callback; AuthCallback.tsx routes new vs returning users via organization_members query; OnboardingPage.tsx calls createOrganization RPC and navigates to /dashboard on success; DashboardPage.tsx loads org name via getMyMembership |
| 2 | Returning contractor can log in, stay logged in across refresh, log out from any page | VERIFIED (code) / needs human (live session) | useAuth.ts subscribes to onAuthStateChange and reads getSession on mount; RequireAuth.tsx guards protected routes; TopNav.tsx sign-out popover calls signOut() from useAuth |
| 3 | Password reset via emailed link works | VERIFIED (code) / needs human (live email) | Auth component renders with ThemeSupa which includes Forgot password natively; redirectTo bound to /auth/callback |
| 4 | Dashboard lists all estimates with correct columns, empty state on first load | VERIFIED (code) / needs human (live render) | DashboardPage.tsx renders 6 columns (Estimate #, Client, Title, Status, Total, Last Updated); empty state with dashed box; StatusBadge uses correct Tailwind classes; formatCents and formatRelativeDate wired |
| 5 | Dashboard has visible "New Estimate" action navigating to estimate creation | VERIFIED (code) | DashboardPage.tsx contains NewEstimateButton calling navigate('/estimates/new'); present in both header row and empty state |

**Score:** 5/5 truths verified (code complete; human confirmation pending for live flows)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260502000012_create_organization_rpc.sql` | SECURITY DEFINER RPC create_organization | VERIFIED | Contains CREATE OR REPLACE FUNCTION public.create_organization(p_name text), SECURITY DEFINER, GRANT EXECUTE TO authenticated, auth.uid() check, RAISE EXCEPTION 'not authenticated' |
| `src/index.css` | Tailwind v4 entry point | VERIFIED | First non-empty line is `@import "tailwindcss"` |
| `vite.config.ts` | Vite config with @tailwindcss/vite plugin | VERIFIED | Contains `tailwindcss()` in plugins array |
| `vercel.json` | SPA rewrite rule | VERIFIED | Contains `"rewrites"` with pattern `/((?!api/).*)`  |
| `package.json` | All Phase 1 dependencies declared | VERIFIED | @supabase/auth-ui-react ^0.4.7, @supabase/auth-ui-shared ^0.1.8, react-router-dom ^6.30.3, zustand ^5.0.12, idb-keyval ^6.2.2, tailwindcss ^4.2.4 (dev), @tailwindcss/vite ^4.2.4 (dev) |
| `src/hooks/useAuth.ts` | useAuth hook returning { session, loading, signOut } | VERIFIED | Exports useAuth; contains onAuthStateChange, subscription.unsubscribe(), signOut via useCallback |
| `src/components/RequireAuth.tsx` | Route guard — Outlet when authed, Navigate /auth when not | VERIFIED | Renders <Outlet /> when session truthy; <Navigate to="/auth" replace /> when not; loading spinner while session loading |
| `src/pages/AuthPage.tsx` | /auth page with ThemeSupa override | VERIFIED | Imports from @supabase/auth-ui-shared; contains providers={[]}; EstimateFlow branding; redirectTo bound to origin/auth/callback |
| `src/pages/AuthCallback.tsx` | /auth/callback — splits to /onboarding vs /dashboard | VERIFIED | Queries organization_members .eq('user_id'); navigates to /onboarding (no membership) or /dashboard (membership exists); "Verifying your email..." loading text |
| `src/App.tsx` | createBrowserRouter route tree with auth guard | VERIFIED | createBrowserRouter with /auth, /auth/callback, /onboarding, /dashboard, / routes; /onboarding and /dashboard wrapped under RequireAuth |
| `src/services/organizations.ts` | createOrganization + getMyMembership | VERIFIED | Exports both functions; contains supabase.rpc('create_organization'; 'Company name is required.'; sanitized error message; no `: any` |
| `src/pages/OnboardingPage.tsx` | /onboarding form per UI-SPEC | VERIFIED | "Set up your workspace" heading; Company name label; maxLength={120}; validation error; navigate('/dashboard', { replace: true }); shadow-xs; focus:ring-3; focus:outline-hidden |
| `src/utils/dates.ts` | formatRelativeDate(dateStr) | VERIFIED | Exports formatRelativeDate; returns '—' for invalid input; uses Intl.RelativeTimeFormat for <30 days; absolute date otherwise |
| `src/components/ui/StatusBadge.tsx` | StatusBadge — draft gray, sent blue | VERIFIED | bg-slate-100 text-slate-600 for draft; bg-blue-100 text-blue-700 for sent; typed via Database enum |
| `src/components/layout/TopNav.tsx` | TopNav with logo, links, avatar+sign-out popover | VERIFIED | EstimateFlow wordmark; Estimates and Settings NavLinks; avatar with computed initials from session.user.email; sign-out popover calling signOut() |
| `src/services/estimates.ts` | listEstimates() with joined client name | VERIFIED | from('estimates'), clients ( name ) join syntax, .limit(200), maps to EstimateListRow with client_name |
| `src/pages/DashboardPage.tsx` | Full dashboard page | VERIFIED | TopNav, all 6 column headers, New Estimate x2, No estimates yet, Couldn't load your estimates, Reload estimates, animate-pulse skeletons, formatCents, formatRelativeDate, navigate('/estimates/new') |
| `src/hooks/useAuth.test.ts` | 6 tests for useAuth | VERIFIED | 6 it() blocks covering pending state, session resolve, null resolve, onAuthStateChange update, unsubscribe on unmount, signOut call |
| `src/services/organizations.test.ts` | 5 tests for organizations service | VERIFIED | 5 it() blocks covering whitespace rejection, length rejection, successful RPC call, RPC error sanitization, getMyMembership query |
| `src/utils/dates.test.ts` + `src/services/estimates.test.ts` | 7 tests (4 dates + 3 estimates) | VERIFIED | dates.test.ts covers today/relative/absolute/invalid; estimates.test.ts covers query shape, error rejection, client_name mapping |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| vite.config.ts | @tailwindcss/vite | plugins array | WIRED | tailwindcss() call present in plugins |
| src/main.tsx | src/index.css | import './index.css' | WIRED | Line 3: `import './index.css'` |
| create_organization RPC | organizations + organization_members tables | INSERT inside SECURITY DEFINER | WIRED | INSERT INTO public.organizations; INSERT INTO public.organization_members with v_uid from auth.uid() |
| src/pages/AuthPage.tsx | @supabase/auth-ui-shared | import { ThemeSupa } | WIRED | `from '@supabase/auth-ui-shared'` present |
| src/pages/AuthCallback.tsx | supabase.from('organization_members') | membership query post-session | WIRED | `.from('organization_members').select('id').eq('user_id', session.user.id)` |
| src/components/RequireAuth.tsx | src/hooks/useAuth.ts | import { useAuth } | WIRED | `from '../hooks/useAuth'` |
| src/pages/OnboardingPage.tsx | src/services/organizations.ts | createOrganization() | WIRED | `import { createOrganization } from '../services/organizations'`; called in handleSubmit |
| src/services/organizations.ts | supabase.rpc | RPC call | WIRED | `supabase.rpc('create_organization' as never, { p_name: trimmed } as never)` |
| src/services/estimates.ts | supabase.from('estimates') | PostgREST select with join | WIRED | `.from('estimates').select('... clients ( name ) ...')` |
| src/pages/DashboardPage.tsx | src/services/estimates.ts | listEstimates() | WIRED | `import { listEstimates, type EstimateListRow } from '../services/estimates'`; called in useEffect |
| src/pages/DashboardPage.tsx | src/utils/money.ts | formatCents() | WIRED | `import { formatCents } from '../utils/money'`; used in table cell |
| src/pages/DashboardPage.tsx | src/components/layout/TopNav.tsx | TopNav component | WIRED | `import TopNav from '../components/layout/TopNav'`; rendered as `<TopNav />` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| DashboardPage.tsx | rows (EstimateListRow[]) | listEstimates() → supabase.from('estimates').select(...).limit(200) | Yes — real DB query | FLOWING |
| DashboardPage.tsx | orgName (string) | getMyMembership() → supabase.from('organizations').select('name') | Yes — real DB query | FLOWING |
| AuthCallback.tsx | membership | supabase.from('organization_members').select('id').eq('user_id') | Yes — real DB query scoped to session.user.id | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — requires a running dev server and live Supabase connection. The app has no mock server mode. Behavioral confirmation delegated to human verification items.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 01-02-PLAN | User can sign up with email and password | SATISFIED (needs human confirm) | AuthPage.tsx renders Auth component with email/password; manual verification in 01-02-SUMMARY confirmed PASS |
| AUTH-02 | 01-02-PLAN | User receives email verification after signup | SATISFIED (needs human confirm) | redirectTo bound to /auth/callback; supabase-js handles email verification; manual verification confirmed |
| AUTH-03 | 01-02-PLAN | User can reset password via email link | SATISFIED (needs human confirm) | ThemeSupa renders Forgot password natively; manual verification confirmed in 01-02-SUMMARY |
| AUTH-04 | 01-02-PLAN | User session persists across browser refresh and tab close | SATISFIED (needs human confirm) | useAuth.ts reads getSession on mount and subscribes to onAuthStateChange; manual verification confirmed |
| AUTH-05 | 01-04-PLAN | User can log out from any page | SATISFIED (needs human confirm) | TopNav sign-out popover calls signOut() from useAuth; RequireAuth wraps all protected routes; manual verification confirmed in 01-04-SUMMARY |
| ORG-01 | 01-03-PLAN | First sign-up creates an org with user as owner | SATISFIED (needs human confirm) | createOrganization RPC inserts organizations + organization_members atomically; manual verification step 5/6 in 01-03-SUMMARY confirmed DB rows |
| ORG-02 | 01-03-PLAN | Organization name set during onboarding | SATISFIED (needs human confirm) | OnboardingPage.tsx collects name and calls createOrganization(trimmed); manual verification confirmed |
| ORG-03 | 01-03-PLAN | organization_members row with role='owner' | SATISFIED (needs human confirm) | RPC hardcodes 'owner' role; owner bound to auth.uid(); manual verification confirmed |
| ORG-04 | 01-02-PLAN | All queries scoped to user's org via RLS | SATISFIED | RLS policies from Stage 1 migrations (20260502000002–20260502000011); listEstimates() carries no explicit org filter — relies on RLS; multi-tenant isolation confirmed in 01-04-SUMMARY |
| DASH-01 | 01-02-PLAN | Authenticated user lands on dashboard showing org context | SATISFIED (needs human confirm) | RequireAuth wraps /dashboard; DashboardPage loads orgName and renders it; manual verification confirmed |
| DASH-02 | 01-04-PLAN | Dashboard lists all estimates (empty state on first load) | SATISFIED (needs human confirm) | listEstimates() queries estimates table; empty state rendered when sorted.length === 0; manual verification confirmed |
| DASH-03 | 01-04-PLAN | Estimate list shows: number, client name, status, total, last updated | SATISFIED (needs human confirm) | All 6 column headers present in DashboardPage.tsx; StatusBadge, formatCents, formatRelativeDate all wired; manual verification confirmed |
| DASH-04 | 01-04-PLAN | User can navigate to create a new estimate | SATISFIED (needs human confirm) | NewEstimateButton calls navigate('/estimates/new'); present in header and empty state; manual verification confirmed |

**Orphaned requirements check:** CLT-01/02/03 and EST-01 through EST-16 are mapped to Phase 2 in REQUIREMENTS.md — not orphaned.

**REQUIREMENTS.md documentation discrepancy:** ORG-01, ORG-02, ORG-03 are marked `[ ] Pending` in REQUIREMENTS.md and "Pending" in the traceability table, despite Plan 03 completing them with manual DB verification. This is a documentation tracking gap — REQUIREMENTS.md was not updated after Plan 03 completion. The code and manual verification confirm these are implemented. ROADMAP.md similarly shows Plan 04 as `[ ]` (unchecked) despite its SUMMARY showing all tasks complete. These are record-keeping issues, not implementation gaps.

---

## Anti-Patterns Found

Scanned all files created or modified in this phase for stubs, TODOs, and hardcoded empty data.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/pages/DashboardPage.tsx | 16-26 | navigate('/estimates/new') routes to non-existent route | Info | Intentional Phase 1 stub — catch-all redirects back to /dashboard; documented in SUMMARY |
| src/services/organizations.ts | 29-31 | `as never` cast on supabase.rpc call | Info | Necessary workaround because migration 12 was added after type generation; runtime type guard present; no `any` used |

No blockers found. No TODO/FIXME/placeholder comments in Phase 1 files. No empty return {} or return [] patterns in code paths that render user-visible data.

---

## Human Verification Required

### 1. Full New-User Onboarding Flow

**Test:** In a fresh browser (incognito), sign up with a new email and password at /auth. Verify the email via the inbox link. Confirm /auth/callback shows "Verifying your email...", then redirects to /onboarding. Submit a company name (e.g. "Test Co."). Confirm redirect to /dashboard and that the org name appears below the "Estimates" heading.

**Expected:** New contractor completes the full signup-to-dashboard flow; org name is visible on the dashboard; DB has one organizations row and one organization_members row with role='owner'.

**Why human:** Full signup flow requires a real Supabase auth email, live browser interaction, and DB row confirmation.

### 2. Returning User Session Persistence and Sign-Out

**Test:** After step 1, refresh the browser on /dashboard. Confirm you stay on /dashboard (session persists). Open the avatar popover (top right) and click "Sign out". Confirm you land on /auth.

**Expected:** Session survives browser refresh; sign-out returns to /auth.

**Why human:** Session persistence and JWT revocation require a live browser session and real Supabase auth.

### 3. Password Reset Flow

**Test:** On /auth, click "Forgot your password?" (or equivalent ThemeSupa text). Enter the test email. Check inbox for reset link. Click it, set a new password. Log in with the new password.

**Expected:** Password reset email arrives; new password allows login.

**Why human:** Requires real email delivery through Supabase and live browser.

### 4. Estimates Table with Live Data

**Test:** Insert two estimates via Supabase Studio for the test org (one with status 'draft', one with status 'sent', different total_cents and updated_at values). Reload /dashboard. Confirm: all six columns render; Draft shows gray pill (bg-slate-100), Sent shows blue pill (bg-blue-100); Total shows "$X,XXX" format; Last Updated shows relative time for recent or absolute date for older entries; sortable column headers toggle ↑/↓.

**Expected:** Table renders both rows with correct styling and data format.

**Why human:** Table rendering, pill colors, and sort behavior require visual inspection with real data.

### 5. Multi-Tenant RLS Isolation

**Test:** Create a second user account in a different organization. Insert estimates for org B. Sign back in as user A. Confirm org B's estimates do not appear on user A's dashboard.

**Expected:** RLS prevents cross-org data leakage.

**Why human:** Requires two live accounts and visual/network confirmation of isolation.

---

## Gaps Summary

No code gaps found. All 5 roadmap success criteria have complete, wired, substantive implementations in the codebase. The human verification items above confirm behavioral correctness against a live Supabase instance — they are not blockers to the code being ready, but they are required for final phase sign-off.

**Documentation note:** REQUIREMENTS.md and ROADMAP.md have tracking inconsistencies (ORG-01/02/03 marked Pending; Plan 04 marked unchecked) despite the code and manual verifications being complete. These should be updated to reflect the actual state.

---

_Verified: 2026-05-02_
_Verifier: Claude (gsd-verifier)_
