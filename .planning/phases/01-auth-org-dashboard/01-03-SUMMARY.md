---
phase: 1
plan: "03"
subsystem: onboarding
tags: [onboarding, organizations, rpc, form-validation, tdd]
dependency_graph:
  requires:
    - Plan 01 (create_organization SECURITY DEFINER RPC migration applied)
    - Plan 02 (RequireAuth guard, useAuth hook, OnboardingPage stub, routing)
    - Supabase client singleton (src/lib/supabase.ts)
    - organization_members table with RLS (stage1-schema migrations)
  provides:
    - createOrganization(name) service — wraps create_organization RPC with client-side validation and sanitized errors
    - getMyMembership(userId) service — queries org_members by user_id
    - /onboarding full form per UI-SPEC — heading, body, label, input (maxLength=120), validation, submit, server error
  affects:
    - Plan 04 (dashboard) can use getMyMembership() for org context queries
tech_stack:
  added: []
  patterns:
    - "SECURITY DEFINER RPC call typed via runtime string check (no generated type available for post-generation migrations)"
    - "TDD RED/GREEN: failing tests committed first, then implementation"
    - "vi.hoisted() for Vitest mock variables (consistent with Plan 02 pattern)"
    - "Tailwind v4 utility classes: shadow-xs, focus:ring-3, focus:outline-hidden"
key_files:
  created:
    - src/services/organizations.ts
    - src/services/organizations.test.ts
  modified:
    - src/pages/OnboardingPage.tsx (stub replaced with full UI-SPEC form)
decisions:
  - "RPC call uses 'create_organization' as never cast — function was added after types were generated; runtime string check on returned value avoids any"
  - "Client-side validation is UX-only (empty check + 120-char max); server-side RPC enforces the same constraints authoritatively (T-03-03)"
  - "Sanitized error message 'Couldn't create your workspace. Please try again.' for all RPC errors (T-03-05); original error preserved as cause for debugging"
  - "Idempotency on re-visit: visiting /onboarding while already a member would create a second org — this is a documented Phase 1 limitation (org uniqueness enforcement deferred)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-02"
  tasks_completed: 2
  tasks_total: 3
  files_created: 2
  files_modified: 1
---

# Phase 1 Plan 03: Onboarding & Organization Creation Summary

Organizations service (`createOrganization` + `getMyMembership`) wrapping the `create_organization` SECURITY DEFINER RPC, plus the full UI-SPEC onboarding form replacing the Plan 02 stub — validated with 5 TDD tests, type-safe with no `any`, Tailwind v4 class conventions enforced.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for organizations service | 3dbe104 | src/services/organizations.test.ts |
| 1 (GREEN) | organizations service implementation | 1bb04ec | src/services/organizations.ts |
| 2 | Replace OnboardingPage stub with UI-SPEC form | 2ee8f48 | src/pages/OnboardingPage.tsx |
| 3 | Human verify checkpoint | awaiting | — |

## Test Coverage

5 tests in `src/services/organizations.test.ts`:

| Test | Assertion |
|------|-----------|
| 1 | Whitespace-only name throws 'Company name is required.' and does not call RPC |
| 2 | 121-char name throws 'Company name must be 120 characters or fewer.' and does not call RPC |
| 3 | Valid name calls `supabase.rpc('create_organization', { p_name })` and returns org UUID |
| 4 | RPC error rejects with sanitized message, original error as `cause` |
| 5 | `getMyMembership` queries `organization_members` by `user_id`, returns row or null |

All 5 tests pass. `npx vitest run src/services/organizations.test.ts` exits 0.

## Acceptance Criteria Verified

- `src/services/organizations.ts` exports `createOrganization` and `getMyMembership`
- Contains `supabase.rpc('create_organization'`
- Contains error messages: 'Company name is required.', 'Company name must be 120 characters or fewer.', "Couldn't create your workspace. Please try again."
- `src/services/organizations.test.ts` has 5 `it(` blocks
- `src/pages/OnboardingPage.tsx` contains: 'Set up your workspace', 'Your company name will appear on all estimates you send.', 'Company name', 'e.g. Apex Roofing Co.', 'Company name is required.', 'Create workspace', 'Creating...', `maxLength={120}`
- Uses Tailwind v4 classes: `shadow-xs`, `focus:ring-3`, `focus:outline-hidden`
- `navigate('/dashboard', { replace: true })` present
- Imports `createOrganization` from `'../services/organizations'`
- No `: any` in any created/modified file
- `npm run type-check` exits 0
- `npm run lint` exits 0
- `npm run build` exits 0

## Manual Verification Checkpoint (Task 3)

**Status: AWAITING SIGN-OFF**

Steps to verify:
1. `npm run dev`. In a fresh incognito window, sign up with a new email at /auth.
2. Verify email; land on /onboarding.
3. Submit empty form — see "Company name is required." with no network call.
4. Type "Apex Roofing Co." and submit — see "Creating..." then redirect to /dashboard.
5. Query `select id, name from public.organizations order by created_at desc limit 1;` — confirm row with name 'Apex Roofing Co.'.
6. Query `select organization_id, user_id, role from public.organization_members order by created_at desc limit 1;` — confirm role='owner'.
7. Sign out, sign back in — confirm routes to /dashboard (not /onboarding) — proves D-06.
8. Visit /onboarding directly while signed in — note second-org creation is a known Phase 1 limitation.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All implemented functionality is wired end-to-end.

## Known Phase 1 Limitations

**Idempotency on /onboarding re-visit:** If an authenticated user who already has an organization_members row navigates directly to /onboarding and submits, the RPC will create a second organization. The AuthCallback routing (Plan 02) prevents this in normal usage (returning users are routed to /dashboard), but direct URL navigation bypasses it. Preventing duplicate orgs per user is deferred — it requires either a unique constraint on `organization_members.user_id` or a frontend guard checking membership before rendering the form. This is out of scope for Phase 1 per CONTEXT.md.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-03-01 (XSS via name field) | Covered — React escapes by default; no dangerouslySetInnerHTML |
| T-03-02 (Unauth RPC call) | Covered — RequireAuth guard on /onboarding route + RPC checks auth.uid() |
| T-03-03 (Bypass client validation) | Covered — RPC enforces 1..120 char server-side |
| T-03-04 (DoS / spam) | Accepted — rate limiting deferred |
| T-03-05 (Error message leaks schema) | Covered — sanitized message in createOrganization catch |
| T-03-06 (No audit trail) | Covered — RPC sets owner from auth.uid(); created_at on both rows |

## Threat Flags

No new threat surface introduced beyond the plan's threat model.

## Self-Check: PASSED

- FOUND: src/services/organizations.ts (exports createOrganization, getMyMembership)
- FOUND: src/services/organizations.test.ts (5 it() blocks)
- FOUND: src/pages/OnboardingPage.tsx (all UI-SPEC literals confirmed)
- FOUND: commits 3dbe104 (RED), 1bb04ec (GREEN), 2ee8f48 (Task 2)
- VERIFIED: npx vitest run src/services/organizations.test.ts → 5/5 passed
- VERIFIED: npm run type-check → exit 0
- VERIFIED: npm run lint → exit 0
- VERIFIED: npm run build → exit 0
- VERIFIED: no `: any` in organizations.ts or OnboardingPage.tsx
