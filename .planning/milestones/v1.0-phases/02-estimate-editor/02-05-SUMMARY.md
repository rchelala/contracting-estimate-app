---
phase: 2
plan: 5
subsystem: completion-features
tags: [mark-sent, attachments, duplicate]
key-files:
  created:
    - src/components/estimate/MarkAsSentModal.tsx
    - src/components/estimate/AttachPhotoButton.tsx
    - src/components/estimate/AttachmentThumbnails.tsx
  modified:
    - src/pages/EstimateEditPage.tsx
    - src/components/estimate/LineItemRow.tsx
    - src/pages/DashboardPage.tsx
decisions:
  - "MarkAsSentModal body uses HTML entity &apos; for apostrophe to avoid JSX parser ambiguity — satisfies ESLint react/no-unescaped-entities"
  - "DashboardPage RowActionsMenu is a named inner component (not inline JSX) to allow useRef/useEffect for outside-click dismissal without violating React hooks rules"
  - "AttachmentThumbnails eslint-disable react-hooks/exhaustive-deps on attachments.length dep — full attachments array reference changes every render; length is the correct trigger for signed-URL refresh"
  - "LineItemRow outer wrapper div takes setNodeRef/style; inner row div keeps all styling — preserves dnd transform isolation while allowing thumbnail strip below the row"
metrics:
  duration: ~12 minutes
  completed: 2026-05-03
  tasks_completed: 2
  files_created: 3
  files_modified: 3
requirements: [EST-14, EST-15, EST-16]
---

# Phase 2 Plan 5: Completion Features Summary

**One-liner:** Closed Phase 2 with mark-as-sent confirmation modal wired to editor read-only lockdown, per-line-item photo attachment upload with signed-URL thumbnail strip, and one-click duplicate from the dashboard row action menu.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | d22fe93 | feat(02-05): add MarkAsSentModal and wire Send button in EstimateEditPage |
| Task 2 | 754ec32 | feat(02-05): photo attachments per line item and duplicate from dashboard |

## Component API Reference

### `src/components/estimate/MarkAsSentModal`
```tsx
interface Props { open: boolean; onClose: () => void }
export default function MarkAsSentModal({ open, onClose }: Props)
```
- Reads `estimate` from `useEditorStore` — returns null if no estimate loaded
- Title: `Mark ${estimate.estimate_number} as sent?`
- Body: `You won't be able to edit it after this.`
- On confirm: `markEstimateSent(estimate.id)` → `replaceEstimateTotals(updated)` → `setReadOnly(true)` → `onClose()`
- Error display: `text-red-600 text-xs mt-2` below body text

### `src/components/estimate/AttachPhotoButton`
```tsx
interface Props { lineItemId: string; disabled?: boolean }
export default function AttachPhotoButton({ lineItemId, disabled }: Props)
```
- Hidden `<input type="file" accept="image/*">` triggered by visible button
- On select: `uploadAttachment({ file, organization_id, estimate_id, section_id, line_item_id })` → `addAttachmentLocal(att)`
- Uploading state: button text changes to `"Uploading..."`, disabled
- Error: hardcoded `"Upload failed. Try again."` in `text-red-500 text-xs ml-2`

### `src/components/estimate/AttachmentThumbnails`
```tsx
interface Props { lineItemId: string; readOnly: boolean }
export default function AttachmentThumbnails({ lineItemId, readOnly }: Props)
```
- Filters `attachmentsById` by `a.line_item_id === lineItemId`
- Returns null when no attachments
- Signed URLs via `getAttachmentUrl(a.storage_path)` (1hr TTL), loaded on mount and when count changes
- Loading skeleton: `w-12 h-12 rounded-sm bg-slate-100 animate-pulse`
- Image: `w-12 h-12 rounded-sm object-cover border border-slate-200`
- Remove button: `aria-label="Remove photo"`, calls `deleteAttachment` + `removeAttachmentLocal`

### `src/pages/DashboardPage` — RowActionsMenu addition
```tsx
interface RowActionsProps { estimateId: string; onDuplicate: (id: string) => void; duplicating: boolean }
function RowActionsMenu({ estimateId, onDuplicate, duplicating }: RowActionsProps)
```
- `aria-label="Row actions"` trigger button with `⋮` character
- Outside-click close via `useRef + mousedown listener`
- Single menu item: `"Duplicate"` → `onDuplicate(estimateId)`
- `handleDuplicate`: resolves org_id from `organization_members` RLS query → `duplicateEstimate(sourceId, orgId)` → `navigate(/estimates/${newEstimate.id})`
- `e.stopPropagation()` on menu container prevents row click navigation when menu is open

## Phase 2 Requirement Coverage

All 19 requirement IDs addressed across Plans 01–05:

| Req ID | Addressed by | Description |
|--------|-------------|-------------|
| CLT-01 | Plan 03 | Client dropdown in editor header |
| CLT-02 | Plan 03 | New client inline form |
| CLT-03 | Plan 03 | Client selection persisted to estimate |
| EST-01 | Plan 03 | Create new estimate (NewEstimatePage) |
| EST-02 | Plan 03 | Estimate title editable inline |
| EST-03 | Plan 04 | Add/remove sections |
| EST-04 | Plan 04 | Add/remove line items per section |
| EST-05 | Plan 04 | Inline cell editing (description, qty, unit price, markup) |
| EST-06 | Plan 03 | Save indicator (autosave 800ms) |
| EST-07 | Plan 02 | Offline queue persisted to IndexedDB |
| EST-08 | Plan 02 | Sync replay on reconnect |
| EST-09 | Plan 02 | Online status banner |
| EST-10 | Plan 04 | Drag-to-reorder sections |
| EST-11 | Plan 04 | Drag-to-reorder line items within section |
| EST-12 | Plan 04 | Optional line item toggle |
| EST-13 | Plan 04 | Delete section with confirmation modal |
| EST-14 | Plan 05 (this) | Mark as sent → read-only lockdown |
| EST-15 | Plan 05 (this) | Photo attachment per line item with thumbnail strip |
| EST-16 | Plan 05 (this) | Duplicate estimate from dashboard |

## Deviations from Plan

None — plan executed exactly as written. No auto-fix deviations were needed; type-check, lint, build, and tests all passed on first attempt.

## Known Stubs

None. All components are fully implemented and wired.

## Threat Flags

None. All STRIDE mitigations from the plan's threat register are implemented:
- T-02-18 (Client-side readOnly bypass): documented as accepted — `disabled` attributes are UX-only; server-side status RLS is v2 hardening per plan
- T-02-19 (Photo signed URL disclosure): `createSignedUrl` scoped to 1hr TTL; only fetched on-demand by `AttachmentThumbnails`
- T-02-20 (Photo upload size/type): `uploadAttachment` service validates 10MB cap and `image/*` MIME whitelist before storage write
- T-02-21 (Duplicate cross-org elevation): `duplicateEstimate` reads source via RLS; org_id comes from caller's `organization_members` lookup, not source row

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/components/estimate/MarkAsSentModal.tsx
- FOUND: src/components/estimate/AttachPhotoButton.tsx
- FOUND: src/components/estimate/AttachmentThumbnails.tsx
- FOUND: src/pages/EstimateEditPage.tsx (modified)
- FOUND: src/components/estimate/LineItemRow.tsx (modified)
- FOUND: src/pages/DashboardPage.tsx (modified)

Commits verified:
- FOUND: d22fe93 (feat: MarkAsSentModal and wire Send button)
- FOUND: 754ec32 (feat: photo attachments and duplicate from dashboard)

Quality gates:
- npm run type-check: PASSED (0 errors)
- npm run lint: PASSED (0 violations, full src/)
- npm run build: PASSED (552 kB bundle, 117 modules)
- npm run test: PASSED (123 tests, 17 files)
