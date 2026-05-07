# Bulk Delete Estimates — Design Spec

**Date:** 2026-05-07  
**Status:** Approved

## Overview

Add multi-select bulk delete to the estimates dashboard. Contractors can activate a selection mode, check off multiple estimates, and delete all selected drafts in one action. Non-draft estimates can be selected but are skipped at delete time with a clear warning.

## Scope

- `src/pages/DashboardPage.tsx` — all changes are contained here
- `src/services/estimates.ts` — no changes needed; reuse existing `deleteEstimate(id)`

## State

Two new state variables added to `DashboardPage`:

```ts
const [selectionMode, setSelectionMode] = useState(false)
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```

Entering selection mode does not clear rows or trigger any fetch. Exiting (Cancel or after successful delete) resets both variables.

## Mode Toggle

- A **"Select"** button appears to the left of "New Estimate" in the page header when `selectionMode` is false.
- When `selectionMode` is true, "Select" is replaced by a **"Cancel"** button that exits selection mode and clears `selectedIds`.
- Sorting (column header clicks) continues to work in selection mode.
- Row click navigation to the estimate editor is suppressed in selection mode; clicking a row toggles its checkbox instead.

## Table Changes (selection mode only)

- A new leftmost column is added with a **select-all checkbox** in `<thead>`.
  - Unchecked → none selected
  - Indeterminate → some selected
  - Checked → all selected
  - Toggling from unchecked/indeterminate selects all rows; toggling from checked clears all.
- Each `<tr>` gains a checkbox `<td>` as its first cell. Clicking anywhere on the row toggles the checkbox.
- The ⋮ `RowActionsMenu` column is hidden while `selectionMode` is true.
- Row hover highlight is retained.

## Bulk Toolbar

Rendered between the page header and the table when `selectionMode` is true:

```
[ N selected ]  [ Delete N selected ]  [ Cancel ]
```

- **"N selected"** — live count of checked rows.
- **"Delete N selected"** — red button, disabled when `selectedIds` is empty. Label includes the count.
- **"Cancel"** — exits selection mode, clears selection (same as the header Cancel button).

## Delete Flow

1. User clicks "Delete N selected" → confirmation modal opens.
2. Modal body:
   - All selected are drafts: `"Permanently delete N estimates and their line items?"`
   - Mixed statuses: `"M of N selected estimates are drafts and will be deleted. K non-draft estimates will be skipped."`
3. User confirms → handler iterates `selectedIds`, calls `deleteEstimate(id)` for each estimate whose status is `'draft'`, non-drafts silently skipped.
4. Deleted rows are removed from `rows` state.
5. Selection mode exits on success.
6. On any failure, the existing `actionError` banner shows the error message; selection mode stays active so the user can retry.

## Constraints

- Only `draft` estimates are deleted; all other statuses are skipped silently.
- No new service functions — `deleteEstimate(id: string)` is called in a loop.
- Deletes are sequential (not parallel) to avoid overwhelming the DB and to make partial-failure attribution straightforward.
- No undo — same as the existing single-delete behavior.
