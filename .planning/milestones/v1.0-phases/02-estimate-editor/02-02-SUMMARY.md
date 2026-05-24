---
phase: 2
plan: 2
subsystem: stores-hooks
tags: [zustand, idb, autosave]
key-files:
  created:
    - src/stores/editorStore.ts
    - src/stores/syncQueueStore.ts
    - src/stores/editorStore.test.ts
    - src/hooks/useOnlineStatus.ts
    - src/hooks/useAutosave.ts
    - src/hooks/useEstimate.ts
decisions:
  - "removeSectionLocal and removeLineItemLocal use Object.fromEntries/filter instead of destructuring rest to satisfy @typescript-eslint/no-unused-vars"
  - "useEstimate initializes loading:true unconditionally and clears it only in async .finally() to comply with react-hooks/set-state-in-effect (no sync setState in effect body)"
  - "useAutosave uses for(;;) loop instead of while(true) to avoid eslint no-constant-condition warning"
metrics:
  duration: ~20 minutes
  completed: 2026-05-03
  tasks_completed: 2
  files_created: 6
  files_modified: 0
requirements: [EST-06, EST-08, EST-09]
---

# Phase 2 Plan 2: Editor Store & Hooks Summary

**One-liner:** Zustand v5 normalized editor store with IndexedDB-persisted sync queue, coalescing mutations, and 800ms debounced autosave hooks wired to online/offline detection and server-authoritative recalcTotals.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c3a157d | feat(02-02): add editorStore, syncQueueStore, and editorStore tests |
| Task 2 | c8ae401 | feat(02-02): add useOnlineStatus, useAutosave, and useEstimate hooks |

## Store API Reference (for Plans 03–05)

### `useEditorStore` — `src/stores/editorStore.ts`

**State fields:**
- `estimateId: string | null`
- `estimate: EditorEstimate | null`
- `sectionsById: Record<string, EditorSection>`
- `sectionOrder: string[]` — ordered section IDs sorted by position
- `lineItemsById: Record<string, EditorLineItem>`
- `lineItemIdsBySection: Record<string, string[]>` — per-section ordered IDs
- `attachmentsById: Record<string, EditorAttachment>`
- `readOnly: boolean` — true when `estimate.status !== 'draft'`

**Mutators Plans 03–05 will call:**
```typescript
hydrate(full: FullEstimate): void
reset(): void
setEstimateField(patch: Partial<Pick<EditorEstimate, 'title' | 'client_id' | 'notes'>>): void
addSectionLocal(section: EditorSection): void
updateSectionLocal(id: string, patch: Partial<Pick<EditorSection, 'name' | 'position'>>): void
removeSectionLocal(id: string): void          // cascades: deletes all child line items too
reorderSections(orderedIds: string[]): void
addLineItemLocal(item: EditorLineItem): void
updateLineItemLocal(id: string, patch: Partial<EditorLineItem>): void
removeLineItemLocal(id: string): void
reorderLineItems(sectionId: string, orderedIds: string[]): void
addAttachmentLocal(att: EditorAttachment): void
removeAttachmentLocal(id: string): void
setReadOnly(readOnly: boolean): void
replaceEstimateTotals(estimate: EditorEstimate): void  // called by useAutosave after flush
```

**Utility:**
```typescript
computeSubtotalCents(state: EditorState): number  // excludes optional items; advisory only
```

### `useSyncQueue` — `src/stores/syncQueueStore.ts`

**State fields:**
- `queue: QueueItem[]`
- `status: SaveStatus` — `'idle' | 'saving' | 'saved' | 'queued' | 'error'`
- `lastError: string | null`

**Mutators:**
```typescript
enqueue(item: QueueItem): void   // persists to IDB, coalesces update items
dequeueBatch(count: number): QueueItem[]
clear(): void
setStatus(status: SaveStatus): void
setError(msg: string | null): void
hydrateFromIDB(): Promise<void>  // call on mount to replay queue from previous session
```

**Queue item kinds:**
- `estimate.update` — title/client_id/notes patch
- `section.create` / `section.update` / `section.delete`
- `lineItem.create` / `lineItem.update` / `lineItem.delete`

**IDB key:** `'estimateflow:syncQueue:v1'`

**Coalescing:** Consecutive `estimate.update`, `section.update`, or `lineItem.update` items targeting the same ID are merged (last-write-wins) to cap queue growth when offline (T-02-09 mitigation).

### Hook Contracts

**`useOnlineStatus(): boolean`** — subscribes to `window` online/offline events; SSR-safe.

**`useAutosave(): void`** — mount in the estimate editor page. Internally:
1. Calls `hydrateFromIDB()` on mount (resumes any queue from previous session)
2. Watches `queueLength` + `online` state
3. Sets `status = 'queued'` immediately when offline and queue is non-empty
4. Debounces 800ms after last enqueue, then drains queue one item at a time
5. After successful drain: calls `recalcTotals(estimateId)` then `replaceEstimateTotals(data)` with refreshed row
6. On error: calls `setError(msg)` → `status = 'error'`

**`useEstimate(estimateId: string | undefined): { loading: boolean; error: string | null }`** — fetches estimate via `getEstimate`, hydrates `editorStore`, resets on unmount/ID change. Cancellation-safe.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced destructuring-rest removal pattern to satisfy ESLint**
- **Found during:** Task 1 (lint run)
- **Issue:** `const { [id]: _gone, ...rest } = obj` triggers `@typescript-eslint/no-unused-vars` for `_gone`
- **Fix:** Replaced with `Object.fromEntries(Object.entries(obj).filter(([k]) => k !== id))` in `removeSectionLocal`, `removeLineItemLocal`, and `removeAttachmentLocal`
- **Files modified:** `src/stores/editorStore.ts`
- **Commit:** c3a157d

**2. [Rule 1 - Bug] Fixed sync setState in useEstimate effect body**
- **Found during:** Task 2 (lint run)
- **Issue:** `react-hooks/set-state-in-effect` rule flags any synchronous `setState` call in an effect body — both the `setLoading(false)` early-return guard and `setLoading(true)` at effect start
- **Fix:** Removed all synchronous setState calls from effect body. `loading` initializes `true` unconditionally; cleared only in async `.finally()`. The early-return `!estimateId` branch simply returns without state change.
- **Files modified:** `src/hooks/useEstimate.ts`
- **Commit:** c8ae401

**3. [Rule 1 - Bug] Replaced `while(true)` with `for(;;)` in useAutosave**
- **Found during:** Task 2 (lint run)
- **Issue:** Unused `eslint-disable-next-line no-constant-condition` directive warning
- **Fix:** Changed loop to `for(;;)` which is not flagged by the rule, removing the directive
- **Files modified:** `src/hooks/useAutosave.ts`
- **Commit:** c8ae401

## Known Stubs

None. All store mutators and hook contracts are fully implemented.

## Threat Flags

None. All mitigations from the plan's STRIDE register are implemented:
- T-02-07 (IDB information disclosure): Accepted for MVP; documented in syncQueueStore comments
- T-02-08 (Replayed mutations): Each flush goes through RLS-enforced supabase client — cross-org writes blocked
- T-02-09 (Unbounded queue growth): `coalesce()` merges consecutive same-target updates before IDB write
- T-02-10 (Lost edits on crash): `persist()` called synchronously on every `enqueue()`; items only removed after `dequeueBatch()` ack

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/stores/editorStore.ts
- FOUND: src/stores/syncQueueStore.ts
- FOUND: src/stores/editorStore.test.ts
- FOUND: src/hooks/useOnlineStatus.ts
- FOUND: src/hooks/useAutosave.ts
- FOUND: src/hooks/useEstimate.ts

Commits verified:
- FOUND: c3a157d (feat(02-02): add editorStore, syncQueueStore, and editorStore tests)
- FOUND: c8ae401 (feat(02-02): add useOnlineStatus, useAutosave, and useEstimate hooks)

Quality gates:
- npm run type-check: PASSED (0 errors)
- npm run lint (stores + hooks): PASSED (0 violations)
- npm run test: PASSED (123 tests, 17 files — 4 new editorStore tests all green)
