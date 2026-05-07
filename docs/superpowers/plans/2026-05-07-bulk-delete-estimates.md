# Bulk Delete Estimates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select bulk delete to the estimates dashboard so contractors can delete multiple draft estimates in one action.

**Architecture:** All changes are contained in `src/pages/DashboardPage.tsx`. Two pure helper functions are extracted for testability and tested in a new `src/pages/DashboardPage.test.ts`. No new service functions — existing `deleteEstimate(id)` is called in a loop.

**Tech Stack:** React 18, TypeScript (strict), Tailwind CSS, Vitest, @testing-library/react (not needed — pure helper tests only)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/DashboardPage.tsx` | Modify | Add selection state, checkbox column, bulk toolbar, updated delete handler |
| `src/pages/DashboardPage.test.ts` | Create | Unit tests for the two pure helper functions |

---

### Task 1: Extract and test pure helper functions

Two pieces of logic are pure functions that should be tested before wiring into the component.

**Files:**
- Create: `src/pages/DashboardPage.test.ts`
- Modify: `src/pages/DashboardPage.tsx` (add two exported helpers at the top of the file, before the component)

- [ ] **Step 1: Add the two helper functions to DashboardPage.tsx**

Open `src/pages/DashboardPage.tsx`. Add these two exported functions directly after the import block (before the `NewEstimateButton` function):

```ts
export function draftIdsFromSelection(
  selectedIds: Set<string>,
  rows: EstimateListRow[],
): string[] {
  return rows
    .filter((r) => selectedIds.has(r.id) && r.status === 'draft')
    .map((r) => r.id)
}

export function bulkDeleteModalMessage(
  selectedCount: number,
  draftCount: number,
): string {
  const skipped = selectedCount - draftCount
  if (skipped === 0) {
    return `Permanently delete ${draftCount} estimate${draftCount === 1 ? '' : 's'} and their line items?`
  }
  return `${draftCount} of ${selectedCount} selected estimate${selectedCount === 1 ? '' : 's'} ${draftCount === 1 ? 'is a draft' : 'are drafts'} and will be deleted. ${skipped} non-draft estimate${skipped === 1 ? '' : 's'} will be skipped.`
}
```

- [ ] **Step 2: Write the test file**

Create `src/pages/DashboardPage.test.ts` with this content:

```ts
import { describe, it, expect } from 'vitest'
import { draftIdsFromSelection, bulkDeleteModalMessage } from './DashboardPage'
import type { EstimateListRow } from '../services/estimates'

function makeRow(id: string, status: EstimateListRow['status']): EstimateListRow {
  return {
    id,
    estimate_number: `EST-${id}`,
    title: null,
    client_name: null,
    status,
    total_cents: 0,
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('draftIdsFromSelection', () => {
  it('returns only draft ids that are in the selection', () => {
    const rows = [
      makeRow('a', 'draft'),
      makeRow('b', 'sent'),
      makeRow('c', 'draft'),
      makeRow('d', 'approved'),
    ]
    const selected = new Set(['a', 'b', 'c'])
    expect(draftIdsFromSelection(selected, rows)).toEqual(['a', 'c'])
  })

  it('returns empty array when no drafts are selected', () => {
    const rows = [makeRow('a', 'sent'), makeRow('b', 'approved')]
    const selected = new Set(['a', 'b'])
    expect(draftIdsFromSelection(selected, rows)).toEqual([])
  })

  it('returns empty array when selection is empty', () => {
    const rows = [makeRow('a', 'draft')]
    expect(draftIdsFromSelection(new Set(), rows)).toEqual([])
  })

  it('ignores ids in selection that are not in rows', () => {
    const rows = [makeRow('a', 'draft')]
    const selected = new Set(['a', 'z'])
    expect(draftIdsFromSelection(selected, rows)).toEqual(['a'])
  })
})

describe('bulkDeleteModalMessage', () => {
  it('all drafts — singular', () => {
    expect(bulkDeleteModalMessage(1, 1)).toBe(
      'Permanently delete 1 estimate and their line items?'
    )
  })

  it('all drafts — plural', () => {
    expect(bulkDeleteModalMessage(3, 3)).toBe(
      'Permanently delete 3 estimates and their line items?'
    )
  })

  it('mixed — 1 draft of 3 selected', () => {
    expect(bulkDeleteModalMessage(3, 1)).toBe(
      '1 of 3 selected estimates is a draft and will be deleted. 2 non-draft estimates will be skipped.'
    )
  })

  it('mixed — 2 drafts of 3 selected', () => {
    expect(bulkDeleteModalMessage(3, 2)).toBe(
      '2 of 3 selected estimates are drafts and will be deleted. 1 non-draft estimate will be skipped.'
    )
  })
})
```

- [ ] **Step 3: Run the tests and confirm they pass**

```bash
npm run test -- --reporter=verbose src/pages/DashboardPage.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx src/pages/DashboardPage.test.ts
git commit -m "feat(dashboard): add draftIdsFromSelection and bulkDeleteModalMessage helpers"
```

---

### Task 2: Add selection state and mode toggle button

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add the two state variables**

In `DashboardPage`, add these two state declarations alongside the existing state variables (after `setActionError`):

```ts
const [selectionMode, setSelectionMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```

- [ ] **Step 2: Add a toggleSelection helper**

Add this function inside `DashboardPage`, after `handleConfirmDelete`:

```ts
function toggleSelectAll() {
  if (!sorted) return
  if (selectedIds.size === sorted.length) {
    setSelectedIds(new Set())
  } else {
    setSelectedIds(new Set(sorted.map((r) => r.id)))
  }
}

function toggleRow(id: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    return next
  })
}

function exitSelectionMode() {
  setSelectionMode(false)
  setSelectedIds(new Set())
}
```

- [ ] **Step 3: Add the Select / Cancel button to the header**

Find the header `<div className="flex items-center justify-between">` block. Replace:

```tsx
<NewEstimateButton />
```

with:

```tsx
<div className="flex items-center gap-2">
  {!selectionMode ? (
    <>
      <button
        type="button"
        onClick={() => setSelectionMode(true)}
        className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-md px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2"
      >
        Select
      </button>
      <NewEstimateButton />
    </>
  ) : (
    <button
      type="button"
      onClick={exitSelectionMode}
      className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-md px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2"
    >
      Cancel
    </button>
  )}
</div>
```

- [ ] **Step 4: Verify the app compiles**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add selection mode toggle state and header buttons"
```

---

### Task 3: Add checkbox column to the table

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add select-all checkbox to `<thead>`**

Find the `<thead>` block. Add a new `<th>` as the **first** child of the `<tr>` inside `<thead>`:

```tsx
{selectionMode && (
  <th className="w-10 py-2 px-4">
    <input
      type="checkbox"
      aria-label="Select all"
      checked={!!sorted && sorted.length > 0 && selectedIds.size === sorted.length}
      ref={(el) => {
        if (el) {
          el.indeterminate =
            selectedIds.size > 0 && !!sorted && selectedIds.size < sorted.length
        }
      }}
      onChange={toggleSelectAll}
      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
    />
  </th>
)}
```

- [ ] **Step 2: Add checkbox cell to each `<tr>` in `<tbody>`**

Find the `<tr>` inside `sorted.map((r) => ...)`. Add a new `<td>` as the **first** child of the `<tr>`:

```tsx
{selectionMode && (
  <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
    <input
      type="checkbox"
      aria-label={`Select estimate ${r.estimate_number}`}
      checked={selectedIds.has(r.id)}
      onChange={() => toggleRow(r.id)}
      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
    />
  </td>
)}
```

- [ ] **Step 3: Suppress row-click navigation in selection mode and hide ⋮ menu**

Update the `<tr>` `onClick` handler:

```tsx
onClick={() => {
  if (selectionMode) {
    toggleRow(r.id)
  } else {
    navigate(`/estimates/${r.id}`)
  }
}}
```

Update the `RowActionsMenu` cell to hide when in selection mode:

```tsx
{!selectionMode && (
  <td className="py-2 px-2">
    <RowActionsMenu
      estimateId={r.id}
      onDuplicate={handleDuplicate}
      onDelete={() => handleRequestDelete(r)}
      duplicating={duplicatingId === r.id}
      deleting={deletingId === r.id}
    />
  </td>
)}
```

Also hide the empty `<th className="w-10" />` header cell when in selection mode:

```tsx
{!selectionMode && <th className="w-10" />}
```

- [ ] **Step 4: Verify the app compiles**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add checkbox column and row selection in selection mode"
```

---

### Task 4: Add bulk toolbar

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add the toolbar between the header and the table**

Find the `<div className="mt-6">` that wraps the table section. Add the toolbar as the **first child** inside that div, before the `{actionError && ...}` banner:

```tsx
{selectionMode && (
  <div className="mb-4 flex items-center gap-3">
    <span className="text-sm text-slate-600">
      {selectedIds.size} selected
    </span>
    <button
      type="button"
      disabled={selectedIds.size === 0 || deletingId !== null}
      onClick={() => {
        if (!sorted) return
        const drafts = draftIdsFromSelection(selectedIds, sorted)
        setBulkDeleteTarget({ selectedCount: selectedIds.size, draftIds: drafts })
      }}
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Delete {selectedIds.size > 0 ? selectedIds.size : ''} selected
    </button>
    <button
      type="button"
      onClick={exitSelectionMode}
      className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-md px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2"
    >
      Cancel
    </button>
  </div>
)}
```

- [ ] **Step 2: Add the bulkDeleteTarget state**

Add this type and state variable alongside the other state variables in `DashboardPage`:

```ts
const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{
  selectedCount: number
  draftIds: string[]
} | null>(null)
```

- [ ] **Step 3: Verify the app compiles**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add bulk delete toolbar"
```

---

### Task 5: Add bulk delete confirmation modal and handler

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add the bulk delete handler**

Add this function inside `DashboardPage`, after `exitSelectionMode`:

```ts
async function handleConfirmBulkDelete() {
  if (!bulkDeleteTarget || bulkDeleteTarget.draftIds.length === 0) return
  setActionError(null)
  setDeletingId('bulk')
  try {
    for (const id of bulkDeleteTarget.draftIds) {
      await deleteEstimate(id)
    }
    setRows((current) =>
      current?.filter((r) => !bulkDeleteTarget.draftIds.includes(r.id)) ?? current
    )
    setBulkDeleteTarget(null)
    exitSelectionMode()
  } catch (err) {
    setActionError(err instanceof Error ? err.message : 'Failed to delete some estimates')
    setBulkDeleteTarget(null)
  } finally {
    setDeletingId(null)
  }
}
```

Note: `deletingId` is reused with the sentinel value `'bulk'` to disable action buttons during bulk delete, consistent with the existing pattern.

- [ ] **Step 2: Add the bulk delete confirmation modal**

Add a second `<Modal>` block below the existing single-delete `<Modal>` at the bottom of the return:

```tsx
<Modal
  open={bulkDeleteTarget !== null}
  onClose={() => {
    if (!deletingId) setBulkDeleteTarget(null)
  }}
  title={`Delete ${bulkDeleteTarget?.selectedCount ?? 0} selected estimate${(bulkDeleteTarget?.selectedCount ?? 0) === 1 ? '' : 's'}?`}
  footer={
    <>
      <button
        type="button"
        onClick={() => setBulkDeleteTarget(null)}
        disabled={deletingId !== null}
        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleConfirmBulkDelete}
        disabled={deletingId !== null || (bulkDeleteTarget?.draftIds.length ?? 0) === 0}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deletingId ? 'Deleting...' : `Delete ${bulkDeleteTarget?.draftIds.length ?? 0} estimate${(bulkDeleteTarget?.draftIds.length ?? 0) === 1 ? '' : 's'}`}
      </button>
    </>
  }
>
  {bulkDeleteTarget
    ? bulkDeleteModalMessage(bulkDeleteTarget.selectedCount, bulkDeleteTarget.draftIds.length)
    : ''}
</Modal>
```

- [ ] **Step 3: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass (including the 8 helper tests from Task 1).

- [ ] **Step 4: Run the quality gates**

```bash
npm run lint && npm run type-check && npm run build
```

Expected: no errors or warnings.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): bulk delete confirmation modal and handler"
```

---

## Manual Test Checklist

After completing all tasks, verify the following in the browser (`npm run dev`):

- [ ] "Select" button appears in the header next to "New Estimate"
- [ ] Clicking "Select" shows checkboxes on each row and hides the ⋮ menus
- [ ] Clicking "Cancel" (header or toolbar) exits selection mode and clears checkboxes
- [ ] Clicking a row in selection mode toggles its checkbox (does not navigate)
- [ ] Select-all checkbox checks/unchecks all rows; goes indeterminate when some are checked
- [ ] Bulk toolbar shows "N selected" count updating live
- [ ] "Delete N selected" button is disabled when no rows are checked
- [ ] Clicking "Delete N selected" opens the confirmation modal
- [ ] Modal body shows "Permanently delete N estimates..." when all selected are drafts
- [ ] Modal body shows the mixed message when non-drafts are selected
- [ ] Confirming delete removes rows from the list and exits selection mode
- [ ] Error banner appears if delete fails; selection mode stays active
- [ ] Single-row delete via ⋮ menu still works when not in selection mode
