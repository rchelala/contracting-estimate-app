# Phase 1: Auth, Org & Dashboard — Research

**Researched:** 2026-05-02
**Domain:** Supabase Auth, React Router v6, Tailwind CSS v4, React session management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `@supabase/auth-ui-react` with `ThemeSupa` theme for all auth forms (sign-up, log-in, password reset). No custom-built forms — the pre-built component handles toggling between modes and all auth flows.
- **D-02:** Single `/auth` route. The Supabase Auth UI component toggles between sign-in and sign-up modes internally. No separate `/signup` and `/login` routes.
- **D-03:** No social/OAuth providers for MVP. Email + password only.
- **D-04:** After email verification and first login, redirect to `/onboarding` before the dashboard.
- **D-05:** `/onboarding` page asks one question: "What's your company name?" — required field, cannot be skipped. On submit, create the `organizations` row and `organization_members` row (role='owner'), then redirect to `/dashboard`.
- **D-06:** Returning users (org already exists) bypass `/onboarding` entirely on login.
- **D-07:** Top nav bar pattern: logo left, nav links (Estimates, Settings), user avatar/initials right. No sidebar.
- **D-08:** Estimate list displayed as a sortable table with columns: Estimate # | Client | Title | Status | Total | Last Updated.
- **D-09:** "New Estimate" is a primary button placed top-right above the table.
- **D-10:** Status badges: colored pill labels (Draft = gray, Sent = blue). No other statuses in Phase 1.

### Claude's Discretion
- Empty state design within the dashboard (copy, illustration vs. simple text, CTA prompt).
- Color palette and specific Tailwind classes.
- Exact wording of validation errors, loading states, and toast notifications.
- Whether to show the org name in the dashboard header — handle as makes sense.

### Deferred Ideas (OUT OF SCOPE)
- "New Estimate" button in top nav (available from any page) — deferred to Phase 2
- Empty state guided prompt that leads into AI drafting — deferred to Phase 3
- Org logo upload on onboarding — deferred, not in MVP scope
- Dashboard filtering/search on the estimate table — deferred, not in Phase 1 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | `supabase.auth.signUp()` via `@supabase/auth-ui-react` (D-01) |
| AUTH-02 | User receives email verification after signup | Supabase handles automatically; requires `/auth/callback` route to exchange token |
| AUTH-03 | User can reset password via email link | `@supabase/auth-ui-react` includes password reset flow; needs `/auth/confirm` or callback handler |
| AUTH-04 | User session persists across browser refresh and tab close | `@supabase/supabase-js` uses localStorage by default; `onAuthStateChange` restores session on mount |
| AUTH-05 | User can log out from any page | `supabase.auth.signOut()` called from nav avatar popover |
| ORG-01 | First sign-up creates an organization with the user as owner | `/onboarding` page inserts `organizations` + `organization_members` rows after email verify |
| ORG-02 | Organization name is set during onboarding (can be edited later) | Onboarding form field → `organizations.name` |
| ORG-03 | organization_members row created with role='owner' on org creation | Insert with `role: 'owner'` in same transaction/sequential inserts as org creation |
| ORG-04 | All subsequent queries are scoped to user's organization via RLS | `is_org_member()` helper already in schema; no explicit filter needed on client |
| DASH-01 | Authenticated user lands on dashboard showing their organization context | Protected route pattern with `useAuth` hook; org name fetched from `organizations` |
| DASH-02 | Dashboard lists all estimates for the organization (empty state on first load) | `estimates` table query via Supabase client; RLS scopes to org automatically |
| DASH-03 | Estimate list shows: estimate number, client name, status, total, last updated | Join `estimates` + `clients` (client_name); format `total_cents` via `formatCents()` |
| DASH-04 | User can navigate to create a new estimate from the dashboard | "New Estimate" button navigates to `/estimates/new` (stub route in Phase 1) |
</phase_requirements>

---

## Summary

Phase 1 builds the auth shell and dashboard for EstimateFlow on top of the Stage 1 data layer already defined. The stack is locked: Supabase Auth with `@supabase/auth-ui-react`, React Router v6, Tailwind CSS, and the existing `@supabase/supabase-js` client. The core technical work is: (1) installing four missing frontend dependencies, (2) wiring up the React Router route tree with auth-gated routes, (3) building the auth callback handler and onboarding gate, and (4) rendering the dashboard estimates table.

**Critical flag for planner:** `@supabase/auth-ui-react` (D-01 locked) was archived by Supabase on October 23, 2025. The package still installs and works (v0.4.7, on npm), but it receives no bug fixes or security patches. The library is functional for Phase 1 — the user has locked this decision — but the planner should note this in the plan so the user is aware. `ThemeSupa` is imported from `@supabase/auth-ui-shared` (a separate peer package), not from `@supabase/auth-ui-react`.

Tailwind CSS v4 is the current release and uses a different setup from v3 — no `tailwind.config.js`, configuration via CSS `@theme` directive, and a dedicated `@tailwindcss/vite` plugin. All `slate-*` color class names from the UI-SPEC work unchanged in v4. Three utility renames matter for Phase 1: `shadow-sm` → `shadow-xs`, `focus:ring` → `focus:ring-3`, and `focus:outline-none` → `focus:outline-hidden`.

**Primary recommendation:** Wire up the route tree first (Wave 0), then implement auth callback + onboarding guard, then the dashboard table. The session/auth context must be available before any route renders guarded content.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.105.1 (pinned) | Supabase client — auth, DB queries | Already installed; only stable dep |
| `@supabase/auth-ui-react` | 0.4.7 | Pre-built auth forms (D-01 locked) | Locked decision; still functional though archived |
| `@supabase/auth-ui-shared` | 0.1.8 | Peer dep providing `ThemeSupa` | Required by `auth-ui-react`; ThemeSupa is NOT exported from `auth-ui-react` |
| `react-router-dom` | 6.30.3 | SPA routing (CLAUDE.md locked to v6) | CLAUDE.md locks to v6 explicitly |
| `tailwindcss` | 4.2.4 | Utility CSS (CLAUDE.md locked) | Current major version; v4 setup differs from v3 |
| `@tailwindcss/vite` | 4.2.4 | Tailwind Vite integration plugin | Required for Tailwind v4 with Vite (replaces PostCSS approach) |

### Supporting (Phase 1 only — install now to unblock future phases)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` | 5.0.12 | State management | Not used in Phase 1 UI, but install now — Phase 2 requires it |
| `idb-keyval` | 6.2.2 | IndexedDB offline buffer | Not used in Phase 1 — Phase 2 offline sync requires it |

### Not installing in Phase 1
- `@dnd-kit/core` — Phase 2 only (drag-and-drop reorder)
- `stripe` — Phase 2+ (payments)
- `resend` — Phase 3 (email via serverless)

### Version verification
All versions confirmed against npm registry on 2026-05-02:
[VERIFIED: npm registry]
- `@supabase/auth-ui-react@0.4.7` — latest on npm, repo archived Oct 2025
- `@supabase/auth-ui-shared@0.1.8` — peer dep, confirmed
- `react-router-dom@6.30.3` — latest v6 (v7 exists but CLAUDE.md locks v6)
- `tailwindcss@4.2.4` — current latest
- `@tailwindcss/vite@4.2.4` — current, matches tailwindcss version
- `zustand@5.0.12` — current latest
- `idb-keyval@6.2.2` — current latest

### Installation
```bash
npm install @supabase/auth-ui-react @supabase/auth-ui-shared react-router-dom@6 tailwindcss@4 @tailwindcss/vite zustand idb-keyval
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── ui/               # Reusable primitives (StatusBadge, Button — hand-composed Tailwind)
│   └── layout/           # TopNav component
├── pages/                # Route-level components
│   ├── AuthPage.tsx       # /auth — wraps Auth from @supabase/auth-ui-react
│   ├── AuthCallback.tsx   # /auth/callback — exchanges token, redirects
│   ├── OnboardingPage.tsx # /onboarding — company name form, creates org
│   └── DashboardPage.tsx  # /dashboard — estimates table
├── hooks/
│   └── useAuth.ts         # Session state via onAuthStateChange
├── lib/
│   └── supabase.ts        # Already exists in stage1 (singleton client)
├── services/
│   └── organizations.ts   # createOrganization(), getMyOrganization()
├── types/
│   └── database.types.ts  # Already exists in stage1 (generated)
├── utils/
│   └── money.ts           # Already exists in stage1 (formatCents)
├── App.tsx                # Router tree with auth guard
└── main.tsx               # Entry point (minimal changes)
```

### Pattern 1: Auth Context via `onAuthStateChange`
**What:** A `useAuth` hook wraps `supabase.auth.getSession()` + `supabase.auth.onAuthStateChange()` to maintain session state across the app.
**When to use:** App root — one instance, shared via React context or Zustand slice.

```typescript
// src/hooks/useAuth.ts
// Source: Supabase JS docs — auth-onauthstatechange
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

### Pattern 2: Protected Route Guard
**What:** A `RequireAuth` wrapper component checks session before rendering. Unauthenticated → redirect to `/auth`. Uses React Router v6 `<Navigate>`.
**When to use:** Wrap `/dashboard` and `/onboarding` routes.

```typescript
// Used in App.tsx router tree — React Router v6 pattern
// Source: [ASSUMED] standard React Router v6 + Supabase community pattern
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <div>Loading...</div>
  return session ? <Outlet /> : <Navigate to="/auth" replace />
}
```

### Pattern 3: Onboarding Gate (first-time vs returning user)
**What:** After `/auth/callback` exchanges the token and confirms a session, check if the user has an `organization_members` row. If yes → `/dashboard`. If no → `/onboarding`.
**When to use:** `/auth/callback` handler (D-04, D-06).

```typescript
// AuthCallback.tsx — exchange token then route-split
// Source: Supabase password-based auth docs — verifyOtp / exchangeCodeForSession
async function handleCallback() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { navigate('/auth'); return }

  // Check if org already exists for this user
  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', session.user.id)
    .single()

  navigate(membership ? '/dashboard' : '/onboarding', { replace: true })
}
```

### Pattern 4: Auth UI Component (D-01 locked)
**What:** `@supabase/auth-ui-react`'s `<Auth>` component with `ThemeSupa` provides sign-up, sign-in, and password reset in one component. Mode toggling is internal.
**When to use:** `/auth` page only.

```typescript
// Source: @supabase/auth-ui-react README / Supabase Auth UI docs
// IMPORTANT: ThemeSupa comes from @supabase/auth-ui-shared, NOT auth-ui-react
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

function AuthPage() {
  return (
    <Auth
      supabaseClient={supabase}
      appearance={{
        theme: ThemeSupa,
        variables: {
          default: {
            colors: { brand: '#2563EB', brandAccent: '#1D4ED8' },
            radii: { borderRadiusButton: '6px', inputBorderRadius: '6px' },
          }
        }
      }}
      providers={[]}
      redirectTo={`${window.location.origin}/auth/callback`}
    />
  )
}
```

### Pattern 5: Tailwind v4 Setup with Vite
**What:** Tailwind v4 uses `@tailwindcss/vite` plugin and CSS `@import "tailwindcss"`. No `tailwind.config.js` required for default setup.
**When to use:** Wave 0 (initial setup task).

```typescript
// vite.config.ts — add tailwindcss plugin
// Source: [CITED: tailwindcss.com/docs/installation]
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', globals: true },
})
```

```css
/* src/index.css — replace existing contents */
@import "tailwindcss";
```

### Pattern 6: Dashboard Estimates Query
**What:** Query `estimates` joined to `clients` for the dashboard table. RLS scopes results to user's org automatically — no explicit org filter needed client-side.

```typescript
// src/services/estimates.ts
// Source: @supabase/supabase-js docs — select with join
const { data, error } = await supabase
  .from('estimates')
  .select(`
    id,
    estimate_number,
    status,
    total_cents,
    updated_at,
    clients ( name )
  `)
  .order('updated_at', { ascending: false })
```

**Note:** `clients ( name )` returns `clients: { name: string } | null` in the TypeScript type. The `estimate_number` column is `text` in the schema (e.g., `"EST-001"`). The `title` column may be null.

### Anti-Patterns to Avoid
- **Calling `supabase.auth.getSession()` repeatedly in components:** Call once in `useAuth` hook; share via context. Multiple calls trigger multiple network requests.
- **Hardcoding the redirect URL in auth component:** Use `window.location.origin` + `/auth/callback` so it works in dev and prod without changes.
- **Using `supabase.from('organizations').select()` without RLS awareness:** The `organizations` RLS policy uses `is_org_member(id)` — this means you can only select orgs you are a member of. No need for explicit `eq('id', orgId)` filter.
- **Inserting `organizations` and `organization_members` in separate, non-atomic calls without error handling:** If `organizations` insert succeeds but `organization_members` fails, the user is stuck. Handle both inserts in sequence with explicit error recovery (or a Postgres RPC function in a future hardening phase).
- **Using `bg-gradient-to-*` classes (Tailwind v4 breaking change):** Renamed to `bg-linear-to-*`. Not used in Phase 1 UI-SPEC, but avoid for future-proofing.
- **Using `focus:ring` without width (Tailwind v4):** In v4, `ring` applies a 1px ring (changed from 3px in v3). The UI-SPEC uses `ring-2` explicitly — this is correct and works unchanged.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth forms (sign-up, sign-in, password reset) | Custom form components | `@supabase/auth-ui-react` (D-01 locked) | Handles PKCE flow, mode toggling, error display, loading states |
| Session management | Manual JWT storage/parsing | `supabase.auth.onAuthStateChange()` + `getSession()` | Library handles token refresh, localStorage persistence automatically |
| Auth route protection | Manual redirect logic in every page | `RequireAuth` wrapper component with `<Outlet>` | Single place to manage redirect logic; composable with React Router v6 |
| Money formatting | Custom cents-to-dollars formatter | `formatCents()` from `src/utils/money.ts` (already exists) | Already implemented and tested in stage1 |
| Relative timestamps | Manual date arithmetic | `Intl.RelativeTimeFormat` or simple date math | UI-SPEC requires "2 days ago" — implement inline in a `formatRelativeDate()` utility |
| Client-side table sorting | External sort library | Native array `.sort()` on fetched data | Table has 4 sortable columns; simple state + sort function, no library needed |

**Key insight:** The entire auth form UI is delegated to `@supabase/auth-ui-react`. The only custom form in Phase 1 is the onboarding company name input — a single `<input>` with one validation rule.

---

## Common Pitfalls

### Pitfall 1: ThemeSupa Import Source
**What goes wrong:** Importing `ThemeSupa` from `@supabase/auth-ui-react` throws `Module '@supabase/auth-ui-react' has no exported member 'ThemeSupa'`.
**Why it happens:** `ThemeSupa` was moved to the separate `@supabase/auth-ui-shared` package.
**How to avoid:** Always import `ThemeSupa` from `@supabase/auth-ui-shared`, not `auth-ui-react`.
**Warning signs:** TypeScript error on import; runtime "undefined is not a function" on theme application.

### Pitfall 2: Email Verification Redirect URL Not Configured
**What goes wrong:** After user clicks verification link in email, Supabase redirects to `localhost:3000` (default) instead of `http://localhost:5173/auth/callback` (Vite dev port).
**Why it happens:** `supabase/config.toml` has `site_url = "http://127.0.0.1:3000"` and the `redirectTo` prop on `<Auth>` must match an allowed URL.
**How to avoid:** Update `supabase/config.toml` `site_url` to `http://127.0.0.1:5173` and `additional_redirect_urls` to include `http://127.0.0.1:5173/auth/callback`. Also pass `redirectTo` to the `<Auth>` component.
**Warning signs:** Email link opens to wrong port or returns "redirect URL not allowed" error from Supabase.

### Pitfall 3: Onboarding Gate Race Condition
**What goes wrong:** User verifies email, gets redirected to `/auth/callback`, the session is loaded, the `organization_members` check fires before the RLS session propagates — returns empty result → redirected to `/onboarding` even though they have an org.
**Why it happens:** `supabase.auth.getSession()` in the callback page may return a valid session, but the RLS function `is_org_member()` depends on `auth.uid()` being set, which happens on the first Supabase query after session establishment.
**How to avoid:** In the callback handler, call `supabase.auth.getSession()` first and wait for the resolved session before querying `organization_members`. The `onAuthStateChange` INITIAL_SESSION event also fires the callback — use it to confirm session is active.
**Warning signs:** Users intermittently land on `/onboarding` even after having an org; inconsistent behavior on fast networks.

### Pitfall 4: Tailwind v4 Utility Renames
**What goes wrong:** UI-SPEC uses `shadow-sm` — in v4 this becomes `shadow-xs`. Using `shadow-sm` in v4 applies a medium shadow (equivalent to v3's `shadow-md`), making cards appear more elevated than designed.
**Why it happens:** Tailwind v4 renamed shadow scale utilities. The UI-SPEC was authored with v3 mental model.
**How to avoid:** The UI-SPEC for Phase 1 uses `shadow-sm` once (auth card). Map this to `shadow-xs` in v4. The `@tailwindcss/upgrade` CLI tool handles this automatically if run. [CITED: tailwindcss.com/docs/upgrade-guide]
**Warning signs:** Card/button shadows look wrong compared to design intent.

### Pitfall 5: INSERT Policy Missing for `organizations`
**What goes wrong:** Onboarding form submits, `supabase.from('organizations').insert(...)` returns a 403 RLS violation.
**Why it happens:** The Stage 1 `organizations` migration only defines SELECT and UPDATE policies (`is_org_member`, `is_org_owner`). There is no INSERT policy on `organizations`. New users can't create their first org.
**How to avoid:** Need a migration or a Supabase Edge Function / RPC to handle the initial org creation with `service_role` or a SECURITY DEFINER function that bypasses RLS for the first insert. A Postgres RPC `create_organization(name text)` with `SECURITY DEFINER` is the cleanest approach — it creates the org and the membership atomically under elevated permissions.
**Warning signs:** 403 on first org insert even with a valid session.

### Pitfall 6: `estimates` Join Returns `clients` as Object Not String
**What goes wrong:** Dashboard table renders `[object Object]` in the Client column instead of the client name.
**Why it happens:** Supabase's PostgREST join returns related rows as objects. `estimate.clients` is `{ name: string } | null`, not `string`.
**How to avoid:** Access `estimate.clients?.name ?? '—'` in the table render. TypeScript strict mode will catch this if types are imported from `database.types.ts`.
**Warning signs:** "[object Object]" visible in Client column during testing.

### Pitfall 7: Auth UI React Library is Archived
**What goes wrong:** A security vulnerability or React 18 compatibility issue arises with no fix available.
**Why it happens:** The library was archived on October 23, 2025 — it receives no patches.
**How to avoid:** For Phase 1, use it as-is (D-01 locked). The library is functional and the risk for a new project is low. Flag for the user in the plan that this library is archived and custom auth forms may be needed before launch.
**Warning signs:** Any npm audit finding against `@supabase/auth-ui-react`.

---

## Code Examples

### Creating the org + membership (onboarding submit)
```typescript
// src/pages/OnboardingPage.tsx — onSubmit handler
// Source: [ASSUMED] standard Supabase insert pattern; RPC pattern [CITED: supabase.com/docs/reference/javascript/rpc]
async function handleSubmit(companyName: string, userId: string) {
  // OPTION A: RPC (recommended — avoids RLS issue on organizations INSERT)
  const { error } = await supabase.rpc('create_organization', { p_name: companyName })
  if (error) throw error
  navigate('/dashboard', { replace: true })
}
```

### React Router v6 route tree with auth guard
```typescript
// src/App.tsx
// Source: [ASSUMED] React Router v6 createBrowserRouter pattern
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import AuthPage from './pages/AuthPage'
import AuthCallback from './pages/AuthCallback'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'

const router = createBrowserRouter([
  { path: '/auth', element: <AuthPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

### Status badge component
```typescript
// Source: UI-SPEC — Phase 1 status badge contract
// Only 'draft' and 'sent' are rendered in Phase 1 (CONTEXT.md D-10)
type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'invoiced'

const BADGE_CLASSES: Partial<Record<EstimateStatus, string>> = {
  draft: 'bg-slate-100 text-slate-600',
  sent:  'bg-blue-100 text-blue-700',
}

function StatusBadge({ status }: { status: EstimateStatus }) {
  const classes = BADGE_CLASSES[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
```

### Relative date formatter
```typescript
// src/utils/dates.ts — formatRelativeDate
// Source: [ASSUMED] standard Intl.RelativeTimeFormat pattern
// UI-SPEC: "2 days ago" for <30 days; "Jan 15, 2026" for older
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (diffDays === 0) return rtf.format(0, 'day')
    return rtf.format(-diffDays, 'day')
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-ui-react` (ThemeSupa from auth-ui-react) | `ThemeSupa` from `@supabase/auth-ui-shared` | ~2022 (split package) | Must install two packages, not one |
| `tailwind.config.js` + PostCSS | CSS `@theme` directive + `@tailwindcss/vite` | Tailwind v4 (Jan 2025) | No JS config file; setup is simpler but different |
| `react-router-dom` v5 `<Switch>` | v6 `createBrowserRouter` + `<Outlet>` | React Router v6 (Dec 2021) | Nested routes via `<Outlet>`, not nested `<Route>` |
| `supabase.auth.session()` (v1) | `supabase.auth.getSession()` (v2) | supabase-js v2 | Old method removed; new returns Promise |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react`: Deprecated — replaced by `@supabase/ssr` for SSR frameworks. Not needed for this CSR Vite app.
- `@supabase/auth-ui-react` GitHub repo: Archived October 23, 2025. Package still on npm (v0.4.7) and installable, but no future updates.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `organizations` table INSERT policy is missing — new users cannot insert their first org via the anon/authenticated role | Common Pitfalls, Code Examples | If a broad INSERT policy exists (not found in migration), the RPC approach is unnecessary overhead but still safe |
| A2 | `RequireAuth` component using `<Outlet>` is the correct React Router v6 pattern for protected routes | Architecture Patterns | Low risk — this is a well-documented v6 pattern; minor variation might use loaders instead |
| A3 | `formatRelativeDate()` implementation uses `Intl.RelativeTimeFormat` | Code Examples | Works in all target browsers (Chrome 71+, Firefox 65+, Safari 14+) — very low risk |
| A4 | `supabase/config.toml` `site_url` needs updating from `3000` to `5173` for local dev | Common Pitfalls | If developer uses port 3000 for dev, no change needed; Vite defaults to 5173 |

---

## Open Questions

1. **Organizations INSERT policy gap**
   - What we know: Stage 1 migration `20260502000003_organizations.sql` has only SELECT and UPDATE policies on the `organizations` table. No INSERT policy is defined for authenticated users.
   - What's unclear: Was this intentional (expecting a SECURITY DEFINER RPC for org creation) or an oversight?
   - Recommendation: The planner should include a Wave 0 task to add either (a) a new migration adding `CREATE POLICY "authenticated can insert own org"` or (b) a `create_organization(p_name text)` SECURITY DEFINER function. Option (b) is safer — it prevents users from inserting orgs they won't be members of.

2. **Auth callback token exchange approach**
   - What we know: Supabase supports both implicit flow (token in URL hash) and PKCE flow (code exchange). The `createClient` default in supabase-js v2 uses `detectSessionInUrl: true` which handles both automatically.
   - What's unclear: Whether the local Supabase dev setup uses PKCE or implicit flow by default.
   - Recommendation: Rely on `detectSessionInUrl: true` (default) and let the `/auth/callback` page call `supabase.auth.getSession()` after the client auto-exchanges the code. Simpler than manual `exchangeCodeForSession()`.

3. **`vercel.json` SPA rewrite configuration**
   - What we know: `vercel.json` exists in the project but its current content is unknown (file not read — it's in the main branch, not the worktree).
   - What's unclear: Whether it already has the SPA rewrite rule (`/*` → `/index.html`) needed for React Router.
   - Recommendation: Planner should include a task to verify/create `vercel.json` with the SPA rewrite rule.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | All npm installs | Yes | 24.13.0 | — |
| npm | Package installation | Yes | 11.6.2 | — |
| Supabase CLI | Local DB dev (`supabase start`) | Yes (in worktree devDeps) | 2.98.0 | Use hosted Supabase project |
| `@supabase/auth-ui-react` | Auth forms (D-01) | Not yet installed | 0.4.7 available on npm | None — D-01 locked |
| `react-router-dom` | SPA routing | Not yet installed | 6.30.3 available on npm | None — CLAUDE.md locked |
| `tailwindcss` | All UI styling | Not yet installed | 4.2.4 available on npm | None — CLAUDE.md locked |
| `@tailwindcss/vite` | Tailwind v4 with Vite | Not yet installed | 4.2.4 available on npm | Use PostCSS setup (not recommended) |
| `zustand` | Phase 2 (install now) | Not yet installed | 5.0.12 available on npm | — |
| `idb-keyval` | Phase 2 (install now) | Not yet installed | 6.2.2 available on npm | — |

**Missing dependencies with no fallback:**
- `react-router-dom@6` — required for any route rendering; must be installed in Wave 0
- `tailwindcss@4` + `@tailwindcss/vite` — required for all UI styling; must be installed and configured in Wave 0
- `@supabase/auth-ui-react` + `@supabase/auth-ui-shared` — required for auth forms (D-01 locked)

**Pre-flight blocker:**
Stage 1 branch (`stage1-schema`) must be merged to `main` before Phase 1 execution begins. All source files referenced in this research (`src/lib/supabase.ts`, `src/types/database.types.ts`, `src/utils/money.ts`, migrations) exist only on that branch.

---

## Project Constraints (from CLAUDE.md)

Directives that apply to Phase 1 implementation:

| Directive | Applies To | Enforcement |
|-----------|-----------|-------------|
| Multi-tenant: every domain table has `organization_id`; every RLS policy filters on org membership | Dashboard query, org creation | `estimates` query relies on RLS; org creation must create `organization_members` row |
| Money in integer cents — never floats; use `Money` utility | Dashboard `total_cents` display | Use `formatCents()` from `src/utils/money.ts` |
| Server-authoritative totals | Not directly applicable in Phase 1 (read-only display) | N/A — Phase 1 only reads totals computed by Stage 1 functions |
| No `VITE_`-prefixed secrets: Anthropic, Stripe secret, Resend go through `/api/*` only | Phase 1 has no AI/Stripe/Resend calls | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe as `VITE_` |
| RLS on every table; default deny; write policies before writing frontend queries | Organizations INSERT gap (see Open Question 1) | Must add INSERT policy or RPC before onboarding can write |
| TypeScript strict, no `any` — use `unknown` and narrow | All new components, hooks, services | Enforce with existing `tsconfig.app.json` strict mode |
| AI never auto-acts | Not applicable in Phase 1 | No AI calls in Phase 1 |
| Quality gates before deploy: `npm run lint`, `npm run type-check`, `npm run build`, `npm run test` | All tasks | Plans must include a final quality gate task |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — all package versions confirmed via `npm view` on 2026-05-02
- [CITED: tailwindcss.com/docs/installation] — Tailwind v4 Vite setup (plugin + `@import "tailwindcss"`)
- [CITED: tailwindcss.com/docs/upgrade-guide] — v3→v4 utility renames (`shadow-sm`→`shadow-xs`, border defaults, ring defaults)
- Stage 1 migration files (read directly): `20260502000003_organizations.sql`, `20260502000002_rls_helpers.sql`, `20260502000001_enums.sql`, `20260502000005_estimates.sql`
- `src/lib/supabase.ts`, `src/utils/money.ts`, `src/types/database.types.ts` — read directly from worktree
- `supabase/config.toml` — read directly; `site_url = "http://127.0.0.1:3000"` confirmed

### Secondary (MEDIUM confidence)
- [CITED: github.com/supabase-community/auth-ui] — archived Oct 23, 2025; confirmed read-only status
- [CITED: supabase.com/docs/guides/auth/passwords] — `signUp()`, `signInWithPassword()`, `resetPasswordForEmail()`, `verifyOtp()` API confirmed
- [CITED: supabase.com/docs/reference/javascript/auth-onauthstatechange] — event list confirmed: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY`
- [CITED: github.com/supabase/supabase/issues/12923] — `ThemeSupa` import must come from `@supabase/auth-ui-shared` not `auth-ui-react`

### Tertiary (LOW confidence)
- `RequireAuth` + `<Outlet>` pattern — [ASSUMED] from community sources; multiple verified examples seen but no single authoritative Supabase+React Router v6 doc page read

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry
- Architecture: HIGH — patterns based on Supabase official docs + stage1 schema read directly
- Pitfalls: HIGH for P1/P4/P5 (verified against migration files and official docs); MEDIUM for P3/P6 (runtime behavior observed in community)
- ThemeSupa import source: HIGH — confirmed by GitHub issue and npm package structure

**Research date:** 2026-05-02
**Valid until:** 2026-06-01 (stable libraries; `@supabase/auth-ui-react` archived so no new versions expected)
