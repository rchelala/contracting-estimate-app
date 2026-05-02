---
phase: 1
plan: "02"
subsystem: auth-shell
tags: [auth, supabase, react-router, useAuth, RequireAuth, ThemeSupa]
dependency_graph:
  requires:
    - Plan 01 foundation (react-router-dom, @supabase/auth-ui-react, @supabase/auth-ui-shared installed)
    - Supabase client singleton (src/lib/supabase.ts)
    - organization_members table with RLS (from stage1-schema migrations)
  provides:
    - useAuth hook (session, loading, signOut) — src/hooks/useAuth.ts
    - RequireAuth route guard — src/components/RequireAuth.tsx
    - /auth page with ThemeSupa branding — src/pages/AuthPage.tsx
    - /auth/callback handler routing new vs returning users — src/pages/AuthCallback.tsx
    - /onboarding stub — src/pages/OnboardingPage.tsx
    - /dashboard stub with sign-out — src/pages/DashboardPage.tsx
    - Full createBrowserRouter route tree — src/App.tsx
  affects:
    - Plan 03 (onboarding) replaces OnboardingPage stub
    - Plan 04 (dashboard) replaces DashboardPage stub
tech_stack:
  added: []
  patterns:
    - "vi.hoisted() for Vitest mock variables referenced inside vi.mock() factory"
    - "TDD RED/GREEN/REFACTOR: failing tests committed before implementation"
    - "Cancelled flag pattern in useEffect async functions (prevents setState after unmount)"
    - "Fail-closed error handling in AuthCallback (RLS error → /onboarding, not /auth)"
key_files:
  created:
    - src/hooks/useAuth.ts
    - src/hooks/useAuth.test.ts
    - src/components/RequireAuth.tsx
    - src/pages/AuthPage.tsx
    - src/pages/AuthCallback.tsx
    - src/pages/OnboardingPage.tsx
    - src/pages/DashboardPage.tsx
  modified:
    - src/App.tsx (replaced smoke screen with createBrowserRouter tree)
decisions:
  - "Used vi.hoisted() to define mock variables referenced inside vi.mock() factory — Vitest hoists vi.mock() calls to the top of the module, so regular variables declared above the factory are not yet initialized when the factory runs"
  - "ThemeSupa override values: brand=#2563EB, brandAccent=#1D4ED8, borderRadiusButton=6px, inputBorderRadius=6px (per UI-SPEC)"
  - "@supabase/auth-ui-react is archived upstream — proceeding per D-01 locked decision; flagged in summary only"
  - "AuthCallback fail-closed on RLS error: routes to /onboarding rather than /auth, so user can set up org rather than being stuck in a loop"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-05-02"
  tasks_completed: 2
  tasks_total: 3
  files_created: 7
  files_modified: 1
---

# Phase 1 Plan 02: Auth Shell Summary

JWT session lifecycle for EstimateFlow: `useAuth` hook mirroring Supabase auth state with `onAuthStateChange`, `RequireAuth` route guard, `/auth` page using `@supabase/auth-ui-react` ThemeSupa with `#2563EB` accent, `/auth/callback` routing new vs returning users via `organization_members` membership check, and the full React Router v6 `createBrowserRouter` tree.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for useAuth | 1f7b1c0 | src/hooks/useAuth.test.ts |
| 1 (GREEN) | useAuth hook implementation | 6b18918 | src/hooks/useAuth.ts, src/hooks/useAuth.test.ts |
| 2 | Router tree, RequireAuth, all pages | 3027de0 | src/App.tsx, src/components/RequireAuth.tsx, src/pages/AuthPage.tsx, src/pages/AuthCallback.tsx, src/pages/OnboardingPage.tsx, src/pages/DashboardPage.tsx |
| 3 | Human verify checkpoint | — | awaiting |

## ThemeSupa Override Values Used

```tsx
appearance={{
  theme: ThemeSupa,
  variables: {
    default: {
      colors: { brand: '#2563EB', brandAccent: '#1D4ED8' },
      radii: { borderRadiusButton: '6px', inputBorderRadius: '6px' },
    },
  },
}}
```

These values align with the UI-SPEC accent color (`#2563EB` / blue-600) and 6px border radius defined for form inputs and buttons.

## Test Notes

- All 6 useAuth tests pass cleanly with no flakiness observed.
- Key implementation detail: `vi.hoisted()` was required to make mock variables available inside the `vi.mock()` factory. Vitest hoists `vi.mock()` calls before module-level variable declarations, so the initial test file using plain `const mockX = vi.fn()` at module scope failed (mocks were `undefined` at factory execution time). The fix was wrapping all mock variables in `vi.hoisted(() => ({ ... }))`.

## Archived Package Note (D-01)

`@supabase/auth-ui-react` is archived upstream (no new releases). This is a locked decision (D-01) — the package works for the current use case and is already installed. No replacement exists that provides equivalent ThemeSupa-based auth UI out of the box. Flagging here per plan instructions; no action taken.

## Known Stubs

- `src/pages/OnboardingPage.tsx` — placeholder text "Onboarding (Plan 03)". Plan 03 will replace this with the org creation form.
- `src/pages/DashboardPage.tsx` — placeholder text "Dashboard (Plan 04)" with sign-out button only. Plan 04 will replace this with the full estimate list.

These stubs are intentional per the plan and do not prevent the auth lifecycle goal from being achieved (AUTH-01 through AUTH-05, DASH-01).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written, with one test infrastructure fix:

**1. [Rule 1 - Bug] Rewrote test mock pattern to use vi.hoisted()**
- **Found during:** Task 1 RED→GREEN transition
- **Issue:** Initial test file defined `const mockGetSession = vi.fn()` at module scope, then referenced it in `vi.mock('../lib/supabase', () => ({ ... }))`. Vitest hoists `vi.mock()` calls before module-level code runs, so `mockGetSession` was `undefined` inside the factory — causing 4 of 6 tests to fail (mocks were not returning expected values).
- **Fix:** Wrapped all mock variables in `vi.hoisted(() => ({ mockGetSession: vi.fn(), ... }))` so they are initialized at hoist-time alongside the `vi.mock()` factory.
- **Files modified:** `src/hooks/useAuth.test.ts`
- **Commit:** `6b18918` (incorporated into GREEN commit)

## Threat Flags

No new threat surface introduced. All components are consistent with the plan's threat model:
- T-02-01: `redirectTo` bound to `${window.location.origin}/auth/callback` ✓
- T-02-02: Token exchange handled by supabase-js, never parsed manually ✓
- T-02-04: `supabase.auth.signOut()` used (server-side revoke) ✓
- T-02-05: RequireAuth guard in place; RLS is the actual security boundary ✓

## Self-Check: PASSED

Files verified:
- FOUND: src/hooks/useAuth.ts (export function useAuth)
- FOUND: src/hooks/useAuth.test.ts (6 it() blocks)
- FOUND: src/components/RequireAuth.tsx
- FOUND: src/pages/AuthPage.tsx (ThemeSupa, providers=[], redirectTo, EstimateFlow copy)
- FOUND: src/pages/AuthCallback.tsx (organization_members, .eq('user_id'), Verifying your email...)
- FOUND: src/pages/OnboardingPage.tsx
- FOUND: src/pages/DashboardPage.tsx
- FOUND: src/App.tsx (createBrowserRouter, all 5 routes)
- FOUND: commits 1f7b1c0, 6b18918, 3027de0
- VERIFIED: npx vitest run src/hooks/useAuth.test.ts → 6/6 passed
- VERIFIED: npm run type-check → exit 0
- VERIFIED: npm run lint → exit 0
- VERIFIED: npm run build → exit 0
