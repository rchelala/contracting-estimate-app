---
phase: 1
plan: "03"
subsystem: org-onboarding
tags: [organizations, supabase-rpc, onboarding, multi-tenant, vitest, tdd]
dependency_graph:
  requires:
    - Plan 01 foundation (create_organization RPC in migrations, Supabase client singleton)
    - Plan 02 auth shell (RequireAuth guard, /onboarding route stub, useAuth hook)
  provides:
    - createOrganization(name) service — src/services/organizations.ts
    - getMyMembership(userId) service — src/services/organizations.ts
    - Full /onboarding UI-SPEC form — src/pages/OnboardingPage.tsx
  affects:
    - Plan 04 (dashboard) uses getMyMembership() to load org context
tech_stack:
  added: []
  patterns:
    - "vi.hoisted() + chainable query builder stubs for multi-step Supabase queries in Vitest"
    - "Sanitized error surface pattern: raw RPC errors caught, user sees fixed-string message, original error preserved as Error cause"
    - "Defense-in-depth: client-side validation (UX) layered over RPC server-side validation (correctness)"
    - "Tailwind v4 utilities: shadow-xs, focus:ring-3, focus:outline-hidden (not shadow-sm / focus:ring / focus:outline-none)"
key_files:
  created:
    - src/services/organizations.ts
    - src/services/organizations.test.ts
  modified:
    - src/pages/OnboardingPage.tsx (replaced stub with full UI-SPEC form)
decisions:
  - "RPC is not in the generated Database types (created after type generation ran) — cast via 'as never' at the single call site rather than regenerating types or using any; runtime string check added as defense"
  - "Whitespace trim before validation — 'Company name is required.' fires on all-whitespace inputs; trimmed value is what gets stored in DB"
  - "Re-visiting /onboarding while already having an org will create a second org (Phase 1 known limitation, see Known Limitations section)"
  - "Error messages are sanitized at the service boundary — RPC SQL detail is never surfaced to the user; original error preserved as cause for debugging"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
requirements-completed: [ORG-01, ORG-02, ORG-03]
---

# Phase 1 Plan 03: Onboarding & Organization Creation Summary

organizations service with sanitized RPC wiring (`create_organization`) + full UI-SPEC onboarding form (company name, validation, submit) replacing Plan 02 stub — ORG-01/02/03 confirmed in database via manual end-to-end verification.

## Performance

- **Duration:** ~25 minutes
- **Completed:** 2026-05-02
- **Tasks:** 3 of 3
- **Files modified:** 3

## Accomplishments

- TDD RED/GREEN for `createOrganization` and `getMyMembership` — 5 tests written first, all passing
- `create_organization` RPC wired through service layer with client validation + sanitized error surface
- OnboardingPage stub replaced with full UI-SPEC form: heading, body copy, label, input (maxLength=120, autoFocus, aria attributes), submit button with loading state, inline required error, server error display
- End-to-end flow verified manually: signup → email verify → /onboarding → org created in DB → /dashboard — all 8 checks passed

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED)** - `3dbe104` (test) — failing tests for organizations service
2. **Task 1 (GREEN)** - `1bb04ec` (feat) — implement organizations service: createOrganization + getMyMembership
3. **Task 2** - `2ee8f48` (feat) — replace OnboardingPage stub with full UI-SPEC onboarding form
4. **Pre-checkpoint docs** - `56725ca` (docs) — complete onboarding plan awaiting human-verify checkpoint

## Files Created/Modified

- `src/services/organizations.ts` — createOrganization(name): Promise<string> wrapping create_organization RPC; getMyMembership(userId): Promise<MyMembership | null> for org context queries in Plan 04
- `src/services/organizations.test.ts` — 5 tests covering: empty/whitespace rejection, 121-char rejection, successful RPC call with trimmed name, RPC error to sanitized message (+ cause preserved), getMyMembership query shape
- `src/pages/OnboardingPage.tsx` — full UI-SPEC form per /onboarding spec; no skip link; navigates to /dashboard on success; re-enables form on error

## Manual Verification Result (Task 3)

All 8 checks passed on 2026-05-02:

| Step | Check | Result |
|------|-------|--------|
| 1 | npm run dev — app starts | PASS |
| 2 | Sign up with new email → /onboarding | PASS |
| 3 | Empty submit → "Company name is required." inline, no network call | PASS |
| 4 | "Apex Roofing Co." submit → "Creating..." → redirect to /dashboard | PASS |
| 5 | organizations row confirmed in DB (name = 'Apex Roofing Co.') | PASS |
| 6 | organization_members row confirmed (role = 'owner', user_id = auth.uid()) | PASS |
| 7 | Sign out → sign back in → /auth/callback → /dashboard (no repeat onboarding) | PASS |
| 8 | Visit /onboarding directly while signed in — form renders, submitting creates second org (see Known Limitations) | PASS (acceptable) |

ORG-01, ORG-02, ORG-03, and D-06 (returning users bypass onboarding) confirmed in database.

## RPC Wiring Details

`create_organization` was added in `supabase/migrations/20260502000012_create_organization_rpc.sql` after database types were generated. The Supabase client's TypeScript overloads require the RPC name to appear in `Database['public']['Functions']`. Since it does not (types are stale), the call site uses a targeted `as never` cast on both arguments — the narrowest possible escape hatch. A runtime `typeof data !== 'string'` guard replaces the compile-time type guarantee.

```ts
const { data, error } = await supabase.rpc('create_organization' as never, {
  p_name: trimmed,
} as never)
if (typeof data !== 'string') throw new Error("Couldn't create your workspace. Please try again.")
```

The proper fix (Plan 04 or later) is to regenerate `src/types/database.types.ts` after running `supabase db push` / `supabase gen types`.

## Test Results

```
npx vitest run src/services/organizations.test.ts

  createOrganization
    ✓ throws "Company name is required." for whitespace-only input and does NOT call supabase.rpc
    ✓ throws length error for name > 120 chars and does NOT call supabase.rpc
    ✓ calls supabase.rpc with trimmed name and returns the org id on success
    ✓ rejects with sanitized error message when RPC returns an error

  getMyMembership
    ✓ queries organization_members by user_id and returns the membership row or null

  Test Files  1 passed (1)
  Tests       5 passed (5)
```

## Known Limitations

**Re-visiting /onboarding creates a second org (Phase 1, out of scope)**

If a user who already has an `organization_members` row navigates directly to `/onboarding` and submits the form, the RPC will create a second `organizations` row and a second `organization_members` row for them. This is a Phase 1 known limitation — the plan explicitly documents this as acceptable:

> "Visit /onboarding directly while signed in (URL bar) — page renders, but submitting again fails or creates a SECOND org (acceptable per Phase 1 — out of scope to prevent)"

The fix requires either:
- The `create_organization` RPC to enforce a UNIQUE constraint on `(user_id, role='owner')` in `organization_members`, or
- A guard in `AuthCallback` (Plan 02) or a new middleware that checks membership before allowing navigation to `/onboarding`

This is tracked as a follow-up; CONTEXT.md does not mandate idempotency for the MVP onboarding path.

## Deviations from Plan

None — plan executed exactly as written.

The one implementation note (RPC `as never` cast) was anticipated in the plan's `<action>` block and followed precisely.

## Threat Surface Scan

All threats from the plan's threat model addressed:

- T-03-01 (XSS): Company name rendered via React JSX — escaped by default; no `dangerouslySetInnerHTML` ✓
- T-03-02 (unauth RPC): RequireAuth guard wraps /onboarding route; RPC also raises 'not authenticated' if auth.uid() is null ✓
- T-03-03 (bypass client validation): RPC enforces 1..120 char check server-side; client check is UX-only ✓
- T-03-04 (DoS org spam): accepted risk for Phase 1 ✓
- T-03-05 (schema leakage): RPC error message never surfaced; fixed string shown instead ✓
- T-03-06 (repudiation): RPC inserts org row from auth.uid(); created_at set by DB default ✓

No new threat surface introduced beyond plan scope.

## Self-Check: PASSED

Files verified:
- FOUND: src/services/organizations.ts (exports createOrganization, getMyMembership; contains supabase.rpc('create_organization'; no `: any`)
- FOUND: src/services/organizations.test.ts (5 it() blocks)
- FOUND: src/pages/OnboardingPage.tsx (Set up your workspace, Company name, shadow-xs, focus:ring-3, focus:outline-hidden, maxLength={120}, createOrganization import)
- FOUND: commits 3dbe104, 1bb04ec, 2ee8f48, 56725ca
- VERIFIED: npx vitest run src/services/organizations.test.ts → 5/5 passed
- VERIFIED: npm run type-check → exit 0
- VERIFIED: npm run lint → exit 0
- VERIFIED: npm run build → exit 0
- VERIFIED: Manual checkpoint Task 3 → all 8 checks passed, "onboarding verified" received
