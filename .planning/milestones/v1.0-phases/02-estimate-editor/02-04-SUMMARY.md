---
phase: 2
plan: 4
subsystem: editor-body
tags: [dnd, sections, line-items]
key-files:
  created:
    - src/utils/position.ts
    - src/components/estimate/DragHandle.tsx
    - src/components/estimate/OptionalBadge.tsx
    - src/components/estimate/LineItemActions.tsx
    - src/components/estimate/LineItemRow.tsx
    - src/components/estimate/SectionHeader.tsx
    - src/components/estimate/EstimateSection.tsx
    - src/components/estimate/AddLineItemButton.tsx
    - src/components/estimate/AddSectionButton.tsx
    - src/components/estimate/DeleteSectionModal.tsx
    - src/components/estimate/EmptyEstimate.tsx
    - src/components/estimate/EstimateBody.tsx
  modified:
    - src/pages/EstimateEditPage.tsx
    - src/stores/syncQueueStore.ts
decisions:
  - "DragHandle uses double-cast (as unknown as Record<string, unknown>) for DraggableAttributes — DraggableAttributes lacks index signature, direct cast rejected by exactOptionalPropertyTypes"
  - "LineItemRow captures item snapshot before render callbacks to prevent TypeScript narrowing loss in closures (item: EditorLineItem = item after null guard)"
  - "SectionHeader passes dragListeners/dragAttributes via conditional spread rather than direct prop to satisfy exactOptionalPropertyTypes"
  - "syncQueueStore coalesce() restructured to sequential if/else for kind-based narrowing — fixes TS18048 array[i] possibly undefined + TS2339 estimateId narrowing"
metrics:
  duration: ~9 minutes
  completed: 2026-05-03
  tasks_completed: 2
  files_created: 12
  files_modified: 2
requirements: [EST-03, EST-04, EST-05, EST-10, EST-11, EST-12, EST-13]
---

# Phase 2 Plan 4: Editor Body — Sections, Line Items, DnD Summary

**One-liner:** Fully interactive estimate body with two-level DnD (sections outer, line items inner per-section), spreadsheet-style inline cell editing with Tab flow, optional badge toggling, delete confirmations, and empty state — all mutations enqueued through the autosave loop.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c435fcf | feat(02-04): add position utility, DragHandle, OptionalBadge, LineItemActions, LineItemRow |
| Task 2 | e2de71b | feat(02-04): add section/body components, DnD wiring, and page integration |

## Component API Reference (for Plan 05)

### `src/utils/position.ts`
```typescript
nextPosition(existing: number[]): number          // max+10 or 10 if empty
reorderPositions<T extends string>(orderedIds: T[]): Array<{ id: T; position: number }>  // (idx+1)*10
```

### `src/components/estimate/EstimateBody`
- No props — reads from `useEditorStore` directly
- Renders `EmptyEstimate` when `sectionOrder.length === 0`
- Outer `DndContext` (sections), `AddSectionButton` below sections
- Enqueues `section.create` on add, `section.update` (position patch) on drag-end

### `src/components/estimate/EstimateSection`
```tsx
interface Props { sectionId: string; readOnly: boolean }
```
- Inner `DndContext` for line items
- Renders empty-section text when no line items
- Handles add line item (full `EditorLineItem` shape with `source: 'contractor'`)
- Handles delete: immediate if empty, `DeleteSectionModal` if has line items
- Enqueues `lineItem.create`, `lineItem.delete`, `section.delete`, `lineItem.update` (position)

### `src/components/estimate/LineItemRow`
```tsx
interface Props { lineItemId: string; index: number; readOnly: boolean }
```
- 4 inputs in DOM tab order: text(description, maxLength=500) → number(qty, w-16) → number(unit price, w-24) → number(markup, w-20)
- Clamping: qty [0, 99999], unit price [0, 99999999 cents], markup [0, 1000]
- Unit price: display via `centsToDollars()`, store via `dollarsToCents()` on blur
- Enqueues `lineItem.update` on each cell blur (changed values only), `lineItem.delete` on delete

### `src/components/estimate/SectionHeader`
```tsx
interface Props {
  sectionId: string; readOnly: boolean; onRequestDelete: () => void
  dragListeners?: Record<string, unknown>; dragAttributes?: Record<string, unknown>
}
```

### `src/components/estimate/DeleteSectionModal`
```tsx
interface Props { open: boolean; lineItemCount: number; onCancel: () => void; onConfirm: () => void }
```
- Title: "Delete section?", confirm: "Delete section", cancel: "Cancel"
- Body (1): "This will delete 1 line item and cannot be undone."
- Body (N): "This will delete ${N} line items and cannot be undone."

### `src/components/estimate/EmptyEstimate`
```tsx
interface Props { onAddSection: () => void }
```
- Heading: "Add your first section"
- Body: "Organize your estimate into sections — for example, Labor or Materials."
- CTA: "+ Add section"

### `src/components/estimate/DragHandle`
```tsx
interface Props { listeners?: Record<string, unknown>; attributes?: Record<string, unknown>; className?: string }
```
- `aria-label="Reorder"`, `min-h-[44px]`, `cursor-grab active:cursor-grabbing`

### `src/components/estimate/LineItemActions`
```tsx
interface Props { optional: boolean; onToggleOptional: () => void; onDelete: () => void; disabled?: boolean }
```
- `aria-label="Row actions"`, popover: "Mark optional" / "Remove optional" / "Delete" (text-red-600)

### `src/components/estimate/OptionalBadge`
- No props — renders `"Optional"` pill with `bg-slate-100 text-slate-500 rounded-full text-xs font-semibold`

### `src/components/estimate/AddLineItemButton` / `AddSectionButton`
```tsx
interface Props { onClick: () => void; disabled?: boolean }
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DraggableAttributes cast requires double-cast via `unknown`**
- **Found during:** Task 2 (build)
- **Issue:** `DraggableAttributes` from `@dnd-kit/core` lacks an index signature — direct cast to `Record<string, unknown>` is rejected by TypeScript with "neither type sufficiently overlaps"
- **Fix:** Changed `attributes as Record<string, unknown>` to `attributes as unknown as Record<string, unknown>` in `LineItemRow` and `EstimateSection`; `SectionHeader` uses conditional spread to avoid passing undefined through `exactOptionalPropertyTypes`
- **Files modified:** `src/components/estimate/LineItemRow.tsx`, `src/components/estimate/EstimateSection.tsx`, `src/components/estimate/SectionHeader.tsx`
- **Commit:** e2de71b

**2. [Rule 1 - Bug] syncQueueStore coalesce() TypeScript narrowing failures (pre-existing)**
- **Found during:** Task 2 (build — `tsc -b` evaluates all files)
- **Issue:** `queue[i]` possibly undefined (noUncheckedIndexedAccess); complex boolean `&&` chain prevented TypeScript from narrowing `prev.kind` within discriminated union; `prev.estimateId` unresolvable without proper kind narrowing
- **Fix:** Added `!prev` null guard; restructured compound boolean into sequential `if/else` branches so TypeScript can narrow each discriminated union variant independently
- **Files modified:** `src/stores/syncQueueStore.ts`
- **Commit:** e2de71b

**3. [Rule 1 - Bug] LineItemRow closure narrowing loss**
- **Found during:** Task 2 (build)
- **Issue:** `item` from `useEditorStore` is `EditorLineItem | undefined`; after `if (!item) return null` TypeScript still considers it possibly undefined inside nested callback closures
- **Fix:** Captured as `const snapshot: EditorLineItem = item` after the null guard; all callbacks reference `snapshot` instead of `item`
- **Files modified:** `src/components/estimate/LineItemRow.tsx`
- **Commit:** e2de71b

## Known Stubs

None. All components are fully implemented and wired.

## Threat Flags

None. All STRIDE mitigations from the plan's threat register are implemented:
- T-02-14 (Numeric input tampering): `type="number"` with `min`/`max`; `clamp()` with `Number.isFinite` guard; unit price via `dollarsToCents()` — never raw float
- T-02-15 (Position tampering): `reorderPositions` regenerates gap-based positions (10,20,30...) on every reorder; RLS blocks cross-org writes
- T-02-16 (Cross-section line item move): `SortableContext` per-section — line items cannot be dragged across section boundaries
- T-02-17 (Cell input length): description `maxLength={500}`; qty bounded [0,99999]; unit price [0,99999999 cents]; markup [0,1000]

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/utils/position.ts
- FOUND: src/components/estimate/DragHandle.tsx
- FOUND: src/components/estimate/OptionalBadge.tsx
- FOUND: src/components/estimate/LineItemActions.tsx
- FOUND: src/components/estimate/LineItemRow.tsx
- FOUND: src/components/estimate/SectionHeader.tsx
- FOUND: src/components/estimate/EstimateSection.tsx
- FOUND: src/components/estimate/AddLineItemButton.tsx
- FOUND: src/components/estimate/AddSectionButton.tsx
- FOUND: src/components/estimate/DeleteSectionModal.tsx
- FOUND: src/components/estimate/EmptyEstimate.tsx
- FOUND: src/components/estimate/EstimateBody.tsx
- FOUND: src/pages/EstimateEditPage.tsx (modified — no sections-placeholder)

Commits verified:
- FOUND: c435fcf
- FOUND: e2de71b

Quality gates:
- npm run type-check: PASSED (0 errors)
- npm run lint: PASSED (0 violations)
- npm run build: PASSED (545 kB bundle, 113 modules)
- npm run test: PASSED (123 tests, 17 files)
