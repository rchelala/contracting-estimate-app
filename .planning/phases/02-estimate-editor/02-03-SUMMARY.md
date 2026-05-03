---
phase: 2
plan: 3
subsystem: page-shell
tags: [routing, components, editor-chrome]
key-files:
  created:
    - src/components/ui/Modal.tsx
    - src/pages/NewEstimatePage.tsx
    - src/pages/EstimateEditPage.tsx
    - src/components/estimate/EditorHeaderBar.tsx
    - src/components/estimate/ClientDropdown.tsx
    - src/components/estimate/NewClientInlineForm.tsx
    - src/components/estimate/SaveIndicator.tsx
    - src/components/estimate/StickyTotalsBar.tsx
    - src/components/estimate/OfflineBanner.tsx
    - src/components/estimate/ReadOnlyBanner.tsx
  modified:
    - src/App.tsx
decisions:
  - "EditorHeaderBar accepts onSendClick?: () => void — Plan 05 will pass the modal trigger; left undefined in EstimateEditPage for now"
  - "Hooks (useOnlineStatus, useAutosave, useEstimate) were already committed by Plan 02 — no stub needed; Plan 03 consumed them directly"
  - "SaveIndicator Retry button calls setStatus('saving') as a nudge; autosave effect re-runs on next state change to flush the queue"
metrics:
  duration: ~20 minutes
  completed: 2026-05-03
  tasks_completed: 2
  files_created: 10
  files_modified: 1
requirements: [CLT-01, CLT-02, CLT-03, EST-01, EST-02, EST-06]
---

# Phase 2 Plan 3: Editor Page Shell Summary

**One-liner:** Wired two estimate routes into the React Router tree, created the editor outer chrome (EditorHeaderBar with client picker + title autosave + save indicator, StickyTotalsBar, OfflineBanner, ReadOnlyBanner), a reusable Modal shell, and the NewEstimatePage that creates a draft estimate on mount and redirects.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 1edd566 | feat(02-03): add routing, modal shell, pages scaffold and hooks |
| Task 2 | fb77ff9 | feat(02-03): add editor chrome components |

## Component Export Shapes

### src/components/ui/Modal.tsx
```tsx
interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}
export default function Modal(props: Props): JSX.Element | null
```

### src/pages/NewEstimatePage.tsx
- On mount: looks up `organization_members` via RLS → calls `createEstimate(orgId)` → navigates to `/estimates/${id}` with `replace: true`
- Renders loading text or error (never exposes org_id in URL/input — T-02-11 mitigation)

### src/pages/EstimateEditPage.tsx
- Calls `useEstimate(estimateId)` and `useAutosave()`
- Renders: TopNav / EditorHeaderBar / OfflineBanner (conditional) / ReadOnlyBanner (conditional) / sections placeholder / StickyTotalsBar
- T-02-12 mitigation: if `getEstimate` throws (RLS deny), renders error state — not-found treatment

### src/components/estimate/EditorHeaderBar.tsx
```tsx
interface Props { onSendClick?: () => void }  // Plan 05 wires this
export default function EditorHeaderBar({ onSendClick }: Props)
```
- Left: `<ClientDropdown readOnly={readOnly} />`
- Center: title input, `placeholder="Untitled estimate"`, `maxLength={200}` (T-02-13 mitigation), dispatches `estimate.update` queue item on change
- Right of title: `<SaveIndicator />` when draft, `<StatusBadge status="sent" />` when readOnly
- Far right: Send button, `data-testid="send-button"`, `onClick={onSendClick}`

### src/components/estimate/ClientDropdown.tsx
- Props: `{ readOnly: boolean }`
- Fetches `listClients()` on mount; searchable filter; `+ New client` button shows `NewClientInlineForm` inline (no navigation)
- On client select: calls `setEstimateField({ client_id })` + enqueues `estimate.update`
- New client cached in local list after save

### src/components/estimate/NewClientInlineForm.tsx
```tsx
interface Props { organizationId: string; onSaved: (client: ClientRow) => void; onDiscard: () => void }
```
- Exact placeholders: `"e.g. Apex Roofing Co."`, `"client@email.com"`, `"(555) 000-0000"`
- Exact button text: `"Save client"`, `"Discard"`
- Calls `createClient({ organization_id, name, email, phone })`

### src/components/estimate/SaveIndicator.tsx
- Four states from `useSyncQueue((s) => s.status)`:
  - `'saving'` → `"Saving..."` (slate-400)
  - `'saved'` → `"Saved ✓"` (blue-600, font-semibold)
  - `'queued'` → `"Queued"` (amber-600)
  - `'error'` → `"Failed to save · Retry"` (red-600, underline Retry button)

### src/components/estimate/StickyTotalsBar.tsx
- Fixed bottom bar, `h-14 bg-white border-t border-slate-200`
- Always shows Subtotal and Total (`text-xl font-semibold`)
- Tax row only renders when `tax_cents > 0`

### src/components/estimate/OfflineBanner.tsx
- Exact copy: `"You're offline — changes are saved locally and will sync when you reconnect."`
- Classes: `bg-amber-50 border-b border-amber-200 text-amber-800 text-sm h-10`
- Dismissible per session (local useState — reappears on page reload if still offline)

### src/components/estimate/ReadOnlyBanner.tsx
- Exact copy: `"This estimate has been marked as sent and is now read-only."`
- Classes: `bg-slate-100 border-b border-slate-200 text-slate-500 text-sm h-10`

## Deviations from Plan

### Deviation 1: Plan 02 hooks were already committed when Plan 03 started

**Found during:** Task 1 (parallel wave execution)
**Issue:** Plan 02 had already committed `useOnlineStatus`, `useAutosave`, and `useEstimate` to the branch by the time Plan 03 executed. The plan described creating stubs if Plan 02 wasn't done.
**Action:** Imported the real implementations directly — no stubs needed. No files overwritten.
**Impact:** None. Plan 02's hook implementations match the contracts Plan 03 imports.

## Known Stubs

- `data-testid="sections-placeholder"` div in `EstimateEditPage.tsx` with text `"Sections render here."` — Plan 04 will replace this with the real section list and add-section button.
- `EditorHeaderBar` Send button has `onClick={onSendClick}` where `onSendClick` is `undefined` in the current `EstimateEditPage` — Plan 05 will pass the modal trigger.

These stubs are intentional scaffolding, not missing features — they are placeholders for work explicitly assigned to later plans.

## Threat Flags

None. All STRIDE mitigations from the plan's threat register are implemented:
- T-02-11: `NewEstimatePage` derives `organization_id` from `organization_members` RLS query using `auth.uid()` — never from URL params
- T-02-12: `EstimateEditPage` renders error state on `getEstimate` failure (RLS deny = not-found treatment)
- T-02-13: Title input has `maxLength={200}` client-side guard

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/App.tsx (modified)
- FOUND: src/components/ui/Modal.tsx
- FOUND: src/pages/NewEstimatePage.tsx
- FOUND: src/pages/EstimateEditPage.tsx
- FOUND: src/components/estimate/EditorHeaderBar.tsx
- FOUND: src/components/estimate/ClientDropdown.tsx
- FOUND: src/components/estimate/NewClientInlineForm.tsx
- FOUND: src/components/estimate/SaveIndicator.tsx
- FOUND: src/components/estimate/StickyTotalsBar.tsx
- FOUND: src/components/estimate/OfflineBanner.tsx
- FOUND: src/components/estimate/ReadOnlyBanner.tsx

Commits verified:
- FOUND: 1edd566 (feat: routing, modal shell, pages scaffold and hooks)
- FOUND: fb77ff9 (feat: editor chrome components)

Quality gates:
- npm run type-check: PASSED (0 errors)
- npm run lint: PASSED (0 violations)
- npm run build: PASSED (490.67 kB bundle, 96 modules)
