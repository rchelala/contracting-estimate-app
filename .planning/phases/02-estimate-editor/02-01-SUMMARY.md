---
phase: 2
plan: 1
subsystem: services
tags: [services, types, storage]
key-files:
  created:
    - src/types/editor.ts
    - src/services/clients.ts
    - src/services/clients.test.ts
    - src/services/sections.ts
    - src/services/lineItems.ts
    - src/services/attachments.ts
    - supabase/migrations/20260503000001_storage_estimate_attachments.sql
  modified:
    - src/services/estimates.ts
    - package.json
    - package-lock.json
decisions:
  - "@dnd-kit/utilities installed alongside core and sortable per plan spec — all three packages are peer-required"
  - "estimate-attachments bucket is private (public=false); signed URLs used for client access via getAttachmentUrl"
  - "duplicateEstimate aborts if source estimate unreachable (RLS returns empty) — T-02-05 mitigation"
  - "File validation in uploadAttachment (size > 10MB, non-image MIME) is client-side guard before storage call — T-02-03 mitigation"
metrics:
  duration: ~15 minutes
  completed: 2026-05-03
  tasks_completed: 2
  files_created: 9
  files_modified: 3
requirements: [CLT-01, CLT-02, CLT-03, EST-01, EST-02, EST-07, EST-16]
---

# Phase 2 Plan 1: Service Foundations Summary

**One-liner:** Installed @dnd-kit drag-and-drop deps, created org-scoped private storage bucket migration, and defined six typed service modules (clients, estimates, sections, lineItems, attachments) plus editor types that all Wave 2 plans import.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | f5721aa | chore(02-01): install @dnd-kit deps and create storage bucket migration |
| Task 2 | 8c6a705 | feat(02-01): add editor types and all service modules |

## Exported Service Function Signatures

### src/types/editor.ts
```typescript
export type EditorEstimate = Database['public']['Tables']['estimates']['Row']
export type EditorSection = Database['public']['Tables']['estimate_sections']['Row']
export type EditorLineItem = Database['public']['Tables']['estimate_line_items']['Row']
export type EditorAttachment = Database['public']['Tables']['estimate_attachments']['Row']
export type EditorClient = Database['public']['Tables']['clients']['Row']

export interface FullEstimate {
  estimate: EditorEstimate
  sections: EditorSection[]
  lineItems: EditorLineItem[]
  attachments: EditorAttachment[]
}
```

### src/services/clients.ts
```typescript
export type ClientRow = EditorClient
export async function listClients(): Promise<ClientRow[]>
export async function createClient(input: {
  organization_id: string; name: string; email?: string | null; phone?: string | null
}): Promise<ClientRow>
```

### src/services/estimates.ts
```typescript
export type EstimateStatus = Database['public']['Enums']['estimate_status']
export interface EstimateListRow { id, estimate_number, title, status, total_cents, updated_at, client_name }
export async function listEstimates(): Promise<EstimateListRow[]>              // preserved from Phase 1
export async function createEstimate(organizationId: string): Promise<EditorEstimate>
export async function getEstimate(estimateId: string): Promise<FullEstimate>
export async function updateEstimate(estimateId: string, patch: Partial<Pick<EditorEstimate, 'title' | 'client_id' | 'notes'>>): Promise<EditorEstimate>
export async function recalcTotals(estimateId: string): Promise<void>
export async function markEstimateSent(estimateId: string): Promise<EditorEstimate>
export async function duplicateEstimate(sourceEstimateId: string, organizationId: string): Promise<EditorEstimate>
```

### src/services/sections.ts
```typescript
export async function createSection(input: {
  organization_id: string; estimate_id: string; name: string; position: number
}): Promise<EditorSection>
export async function updateSection(id: string, patch: Partial<Pick<EditorSection, 'name' | 'position'>>): Promise<EditorSection>
export async function deleteSection(id: string): Promise<void>
```

### src/services/lineItems.ts
```typescript
export async function createLineItem(input: {
  organization_id: string; estimate_id: string; section_id: string;
  description: string; position: number;
}): Promise<EditorLineItem>
export async function updateLineItem(id: string, patch: Partial<Pick<EditorLineItem,
  'description' | 'quantity' | 'unit_price_cents' | 'markup_pct' | 'optional' | 'position' | 'section_id'
>>): Promise<EditorLineItem>
export async function deleteLineItem(id: string): Promise<void>
```

### src/services/attachments.ts
```typescript
export async function uploadAttachment(input: {
  file: File; organization_id: string; estimate_id: string;
  section_id?: string | null; line_item_id?: string | null;
}): Promise<EditorAttachment>
export async function deleteAttachment(id: string, storagePath: string): Promise<void>
export async function getAttachmentUrl(storagePath: string): Promise<string>
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Service modules are complete interface contracts; no placeholder return values.

## Threat Flags

None. All threat model mitigations from the plan's STRIDE register are implemented:
- T-02-01: bucket `public=false` in migration
- T-02-02: Storage RLS INSERT policy enforces org path prefix
- T-02-03: `uploadAttachment` validates `file.size > MAX_BYTES` and `ALLOWED_TYPES.includes(file.type)` before any Supabase call
- T-02-04: all inserts use `organization_id` from authenticated session, never from client request body
- T-02-05: `duplicateEstimate` calls `getEstimate` first — RLS blocks cross-org reads before duplication proceeds

## Self-Check: PASSED

Files verified to exist:
- FOUND: src/types/editor.ts
- FOUND: src/services/clients.ts
- FOUND: src/services/clients.test.ts
- FOUND: src/services/estimates.ts
- FOUND: src/services/sections.ts
- FOUND: src/services/lineItems.ts
- FOUND: src/services/attachments.ts
- FOUND: supabase/migrations/20260503000001_storage_estimate_attachments.sql

Commits verified:
- FOUND: f5721aa (chore: install @dnd-kit deps + storage migration)
- FOUND: 8c6a705 (feat: editor types + all service modules)

Quality gates:
- npm run type-check: PASSED (0 errors)
- npm run lint: PASSED (0 violations)
- npm run test: PASSED (119 tests, 16 files)
