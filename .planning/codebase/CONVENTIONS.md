# Coding Conventions

**Analysis Date:** 2026-05-02

## Naming Patterns

**Files:**
- TypeScript source files: `camelCase.ts` (e.g., `supabase.ts`, `money.ts`)
- React components: `PascalCase.tsx` (e.g., `App.tsx`)
- Test files: `filename.test.ts` or `filename.test.tsx` (e.g., `money.test.ts`)
- Utility functions: lowercase in `utils/` directory (e.g., `src/utils/money.ts`)

**Functions:**
- Export named functions: camelCase (e.g., `dollarsToCents`, `applyMarkup`, `formatCents`)
- Async functions: camelCase with clear intent (e.g., `fetchEstimate`, `saveLineItem`)
- Event handlers in components: `handleEventName` (e.g., `handleClick`, `handleChange`)
- React hooks: `use` prefix (e.g., `useAuth`, `useEstimate`, `useAutosave`, `useOffline`)

**Variables:**
- Local variables and parameters: camelCase (e.g., `count`, `unitPriceCents`, `markupPct`)
- Constants: camelCase for non-global, ALL_CAPS for global constants (e.g., `VITE_SUPABASE_URL`)
- Money values: suffix with `Cents` when in integer cents (e.g., `unitPriceCents`, `markupPct`)
- Never use floats for money; always use integer cents as per CLAUDE.md rule

**Types:**
- Interfaces and types: PascalCase (e.g., `Database`, `Json`)
- Type exports from Supabase: auto-generated, imported as-is (e.g., `Database` from `src/types/database.types`)
- Generic types: PascalCase (standard convention)
- Enum-like type unions: descriptive, match database enums (e.g., `ai_call_type`)

## Code Style

**Formatting:**
- No formal Prettier config detected; ESLint is the primary linter
- Indentation: 2 spaces (standard for JavaScript/TypeScript)
- Line length: follow ESLint recommendations (no hardcoded limit found)
- Use semicolons (enforced by ESLint defaults)

**Linting:**
- Tool: ESLint 10.2.1 with TypeScript ESLint support
- Config file: `eslint.config.js` (flat config format)
- Extends: `@eslint/js`, `typescript-eslint/recommended`, `react-hooks/recommended`, `react-refresh/vite`
- Ignored: `dist/` directory
- Key rules: React Hooks Rules of Hooks enforced, React Refresh rules enforced

**TypeScript Configuration:**
- Strict mode enabled: `strict: true`
- Additional strict checks enabled:
  - `noUnusedLocals: true` — unused local variables cause errors
  - `noUnusedParameters: true` — unused parameters cause errors
  - `noUncheckedIndexedAccess: true` — indexed access is type-narrowed
  - `exactOptionalPropertyTypes: true` — optional properties must be optional in type definition
  - `noFallthroughCasesInSwitch: true` — switch cases must have breaks or returns
- No `any` type allowed — use `unknown` and narrow types
- Target: ES2023
- JSX mode: `react-jsx` (React 17+ JSX transform)

## Import Organization

**Order:**
1. External packages (React, @supabase/supabase-js, etc.)
2. Type imports (always use `type` keyword for types, e.g., `import type { Database }`)
3. Relative imports from `./` and `../` (organized by directory depth)
4. Barrel imports from `/` paths if configured

**Path Aliases:**
- None explicitly configured in tsconfig.app.json; use standard relative paths
- Type-only imports: always use `import type { ... } from '...'` syntax

**Example patterns from codebase:**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// src/utils/money.test.ts
import { describe, it, expect } from 'vitest'
import {
  lineItemTotal,
  applyMarkup,
  formatCents,
  dollarsToCents,
  centsToDollars,
  add,
  subtract,
} from './money'
```

## Error Handling

**Patterns:**
- Environment validation: throw `Error` with descriptive message at module load time (see `src/lib/supabase.ts`)
  ```typescript
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local')
  }
  ```
- No try-catch shown in sample code; follow CLAUDE.md rule: **server-authoritative totals** — client computations are advisory
- For async operations in services: assume errors bubble up to caller; use TypeScript strict mode to catch unhandled cases

**Money arithmetic:**
- Always use integer cents; Math.round() after any multiplication/division (see `src/utils/money.ts`)
- Never trust floating-point money calculations

## Logging

**Framework:** Not detected in current codebase; no formal logging library configured

**Patterns:**
- Use `console.*` for development and debugging (implied)
- Per CLAUDE.md AI section: log `ai_usage_events` to Postgres for all AI calls (tokens in/out, cost_cents, model, latency_ms)
- Per CLAUDE.md: log `stripe_events` table for idempotent webhook handling

**When to log:**
- Critical state changes (estimate save, payment received, AI call completed)
- Errors or validation failures
- Performance-sensitive operations (AI latency, sync queue replay)

## Comments

**When to Comment:**
- Avoid obvious comments; code should be self-documenting (strict naming conventions ensure this)
- Comment non-obvious business logic (e.g., why markup is applied before quantity in `lineItemTotal`)
- Comment workarounds or known limitations (e.g., "MVP conflict resolution: last-write-wins — see CRDT consideration in CLAUDE.md")

**JSDoc/TSDoc:**
- Use TSDoc-style comments for public functions and exports
- Document parameters, return types, and side effects

**Example from codebase:**
```typescript
export function lineItemTotal(
  quantity: number,
  unitPriceCents: number,
  markupPct: number
): number {
  return Math.round(quantity * unitPriceCents * (1 + markupPct / 100))
}
```

## Function Design

**Size:** Keep functions small and testable (see `src/utils/money.ts` — all functions are 1–5 lines of logic)

**Parameters:**
- Use named parameters; if multiple related parameters, consider a parameter object
- Document with TSDoc comments
- TypeScript strict: parameters are required unless marked `?` for optional or union with `| undefined`

**Return Values:**
- Always return a value or `void` (implicit `undefined` for React components)
- Use `never` for functions that throw
- Use `unknown` for any value type, then narrow with type guards

**Example patterns:**
```typescript
// Pure functions (money.ts)
export function applyMarkup(unitPriceCents: number, markupPct: number): number
export function formatCents(cents: number, currencyCode = 'USD'): string

// Module initialization (supabase.ts)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

## Module Design

**Exports:**
- Prefer named exports for functions and types
- Default export: used for React components only (e.g., `export default App`)
- Utility modules export all functions as named exports (e.g., `src/utils/money.ts`)

**Barrel Files:**
- Not detected in current codebase; create as needed in directories with multiple related exports
- Example: `src/utils/index.ts` could export all utils if re-export is needed

**Project Organization per CLAUDE.md:**
- `src/utils/` — pure utility functions (money.ts, dates.ts, id.ts)
- `src/lib/` — library initialization and clients (supabase.ts, stripe.ts)
- `src/services/` — business logic that calls APIs (estimates.ts, invoices.ts, ai.ts)
- `src/stores/` — Zustand stores (editorStore, syncQueueStore)
- `src/hooks/` — React hooks (useAuth, useEstimate, useAutosave, useOffline)
- `src/components/ui/` — reusable UI components
- `src/components/estimate/` — estimate editor components
- `src/components/client/` — public-facing components
- `src/pages/` — route-level page components
- `src/types/` — generated from Supabase + hand-written types

## React Component Conventions

**Functional Components:**
- Use `function` keyword or arrow function consistently within the codebase
- Use React 18+ hooks (useState, useContext, custom hooks)
- Prefer composition over inheritance

**Props:**
- Define prop interfaces as `PropsWithChildren` if component accepts children
- Use `React.FC<Props>` or explicit return type annotation
- Always use strict TypeScript for props

**Example from codebase:**
```typescript
function App() {
  const [count, setCount] = useState(0)
  return (
    <>
      <button
        type="button"
        className="counter"
        onClick={() => setCount((count) => count + 1)}
      >
        Count is {count}
      </button>
    </>
  )
}
export default App
```

## Multi-Tenant & Security Conventions

**Per CLAUDE.md Non-Negotiable Rules:**

1. Every domain table must have `organization_id` column
2. Every RLS (Row-Level Security) policy filters on org membership
3. All money stored as integer cents, never floats
4. No secrets in code: `VITE_`-prefixed env vars for public values only
5. AI never auto-acts; AI drafts and suggests, contractor sends
6. TypeScript strict, no `any` — use `unknown` with type narrowing

**Environment Variables:**
- Public (safe as `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
- Secrets (via `/api/*` serverless only): Anthropic API key, Stripe secret key, Resend API key

---

*Convention analysis: 2026-05-02*
