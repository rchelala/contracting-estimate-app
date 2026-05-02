# Testing Patterns

**Analysis Date:** 2026-05-02

## Test Framework

**Runner:**
- Vitest 4.1.5 (configured in `vite.config.ts`)
- Config: `vite.config.ts` with test environment set to `jsdom`
- Globals mode enabled: `describe`, `it`, `expect` available without imports

**Assertion Library:**
- Vitest built-in assertions (expect API compatible with Jest)
- @testing-library/react 16.3.2 for component testing
- @testing-library/jest-dom 6.9.1 for DOM matchers

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode with auto-rerun
npm run type-check       # TypeScript type checking (separate from tests)
```

## Test File Organization

**Location:**
- Co-located with implementation: `src/utils/money.test.ts` sits next to `src/utils/money.ts`
- Convention: `filename.test.ts` for TypeScript unit tests, `filename.test.tsx` for component tests

**Naming:**
- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: `describe('function name', () => { ... })`
- Individual tests: `it('describes what happens', () => { ... })`

**Structure:**
```
src/
├── utils/
│   ├── money.ts          # Implementation
│   └── money.test.ts     # Co-located tests
├── lib/
│   ├── supabase.ts       # Implementation
│   └── supabase.test.ts  # Tests (to be created)
├── services/
│   ├── estimates.ts      # Implementation
│   └── estimates.test.ts # Tests (to be created)
└── hooks/
    ├── useAuth.ts        # Implementation
    └── useAuth.test.tsx  # Component hook tests
```

## Test Structure

**Suite Organization (from `src/utils/money.test.ts`):**
```typescript
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

describe('add', () => {
  it('adds two cent values', () => {
    expect(add(100, 50)).toBe(150)
  })
})

describe('subtract', () => {
  it('subtracts two cent values', () => {
    expect(subtract(200, 75)).toBe(125)
  })
})
```

**Patterns:**
- One `describe` block per function
- Multiple `it` blocks for edge cases and variations
- Clear, assertive test names that read like documentation
- Arrange-Act-Assert pattern (AAA) is implicit but visible:
  - Input/setup in test name and function call
  - Assertion via `expect(...).toBe(...)`

**Test coverage examples from `money.test.ts`:**

1. **Happy path:** Standard case with expected behavior
   ```typescript
   it('applies zero markup unchanged', () => {
     expect(applyMarkup(1000, 0)).toBe(1000)
   })
   ```

2. **Edge cases:** Rounding, fractional values, boundaries
   ```typescript
   it('rounds fractional dollars to nearest cent', () => {
     expect(dollarsToCents(10.999)).toBe(1100)
   })
   ```

3. **Complex calculations:** Multi-parameter functions
   ```typescript
   it('applies markup to each unit before multiplying by qty', () => {
     expect(lineItemTotal(2, 1000, 20)).toBe(2400)
   })
   ```

4. **Formatting/display:** Output validation
   ```typescript
   it('formats USD cents as dollar string', () => {
     expect(formatCents(150050)).toBe('$1,500.50')
   })
   ```

## Mocking

**Framework:**
- Vitest has built-in `vi.mock()` support
- No mocks shown in current codebase; mocking to be applied to external dependencies

**Patterns (to be established):**

For Supabase calls (in `src/lib/supabase.ts`):
```typescript
import { vi } from 'vitest'
import { supabase } from './supabase'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockResolvedValue({ data: {}, error: null }),
      delete: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  })),
}))
```

For API service calls (e.g., `src/services/ai.ts`):
```typescript
vi.mock('../services/ai', () => ({
  draftEstimate: vi.fn().mockResolvedValue({
    sections: [],
    totalCents: 0,
  }),
}))
```

**What to Mock:**
- External API calls (Supabase, Stripe, Anthropic)
- Date/time functions if determinism is needed (`vi.useFakeTimers()`)
- File system operations or IndexedDB calls
- Any async operation that would slow tests or introduce flakiness

**What NOT to Mock:**
- Pure utility functions like money.ts (test them directly)
- React components used in other components (use shallow or snapshot testing instead)
- Internal business logic functions (test the full integration)
- TypeScript types and interfaces (test implementations, not types)

## Fixtures and Factories

**Test Data:**
No explicit fixtures shown in current codebase. When needed, create factory functions:

```typescript
// src/__fixtures__/money.fixtures.ts (example pattern)
export const mockEstimate = (overrides = {}) => ({
  id: 'est-123',
  organizationId: 'org-1',
  clientId: 'client-1',
  subtotalCents: 50000,
  taxCents: 4000,
  totalCents: 54000,
  ...overrides,
})

export const mockLineItem = (overrides = {}) => ({
  id: 'li-1',
  sectionId: 'sec-1',
  quantity: 2,
  unitPriceCents: 10000,
  markupPct: 20,
  position: 10,
  ...overrides,
})
```

**Location:**
- Create `src/__fixtures__/` directory for shared test data
- Or co-locate with tests: `utils/money.fixtures.ts` next to `utils/money.test.ts`

**Usage in tests:**
```typescript
import { mockLineItem } from './__fixtures__/money.fixtures'

describe('lineItemTotal', () => {
  it('calculates total for fixture data', () => {
    const item = mockLineItem({ quantity: 3, unitPriceCents: 5000 })
    expect(lineItemTotal(item.quantity, item.unitPriceCents, item.markupPct)).toBe(18000)
  })
})
```

## Coverage

**Requirements:**
- Not explicitly enforced in current codebase
- CLAUDE.md Quality Gates section mentions `npm run test` but no coverage thresholds

**View Coverage:**
```bash
npm run test -- --coverage
# or with UI:
npm run test -- --coverage --reporter=html
```

**Targets to establish:**
- Utility functions (`src/utils/*`): 100% coverage (pure functions)
- Services (`src/services/*`): 80%+ coverage (business logic)
- React components: 60%+ coverage (harder to test, snapshot + integration patterns)
- Avoid false confidence: test behavior, not implementation

## Test Types

**Unit Tests:**
- Scope: Single function or pure utility in isolation
- Approach: Vitest with `describe`/`it` blocks
- Tools: Assertion library (expect) + fixtures for setup
- Example: `src/utils/money.test.ts` — all unit tests for pure math functions
- Running: `npm run test` (runs all `.test.ts` files)

**Integration Tests:**
- Scope: Multiple components/modules working together (e.g., estimate editor + autosave + sync queue)
- Approach: Component tests with React Testing Library + mocked external calls
- Tools: `@testing-library/react` for component rendering and user interaction
- Example patterns:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { EstimateEditor } from './EstimateEditor'

  describe('EstimateEditor', () => {
    it('saves estimate on autosave timer', async () => {
      const mockSave = vi.fn()
      render(<EstimateEditor onSave={mockSave} />)
      
      // Simulate user input
      await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'New Estimate')
      
      // Wait for autosave debounce
      await new Promise(r => setTimeout(r, 900))
      
      expect(mockSave).toHaveBeenCalled()
    })
  })
  ```

**E2E Tests:**
- Framework: Not configured; consider Playwright (mentioned in CLAUDE.md RTK)
- Scope: Full user workflows end-to-end (create estimate → send → payment)
- Tools: Playwright with page navigation, form input, payment simulation
- Not yet implemented; to be added in future phases

## Common Patterns

**Async Testing:**
```typescript
describe('async operations', () => {
  it('resolves promise', async () => {
    const result = await fetchData()
    expect(result).toBeDefined()
  })

  it('handles rejection', async () => {
    await expect(failingFetch()).rejects.toThrow('Error message')
  })
})
```

**Error Testing:**
```typescript
describe('error handling', () => {
  it('throws on missing env var', () => {
    delete process.env.VITE_SUPABASE_URL
    expect(() => import('./supabase')).toThrow('must be set')
  })

  it('validates money arithmetic', () => {
    expect(() => applyMarkup(-100, 0)).not.toThrow() // Allow negative for deductions
    expect(applyMarkup(-1000, 20)).toBe(-1200)
  })
})
```

**Snapshot Testing (for components):**
```typescript
import { render } from '@testing-library/react'
import { EstimateTotal } from './EstimateTotal'

describe('EstimateTotal', () => {
  it('renders correctly', () => {
    const { container } = render(<EstimateTotal totalCents={54000} />)
    expect(container).toMatchSnapshot()
  })
})
```

## Test Organization for Future Phases

**By priority:**
1. **Critical path** (save, payment, AI calls): Integration tests + unit tests for utilities
2. **Business logic** (calculations, formatting): Unit tests with edge cases
3. **Components**: Snapshot + interaction tests
4. **Error handling**: Explicit error test cases for each error boundary

**Example test plan for `src/services/estimates.ts` (not yet written):**
```typescript
describe('EstimateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveEstimate', () => {
    it('sends estimate to Supabase with org_id', async () => {
      // TODO: test multi-tenant filtering
    })

    it('recomputes totals on server', async () => {
      // TODO: test server total recomputation
    })

    it('queues offline write to IndexedDB if offline', async () => {
      // TODO: test offline queue
    })

    it('replays queue on reconnect', async () => {
      // TODO: test sync queue replay
    })
  })

  describe('recalculateTotals', () => {
    it('uses only integer cent arithmetic', async () => {
      // TODO: test no floating-point leakage
    })
  })
})
```

---

*Testing analysis: 2026-05-02*
