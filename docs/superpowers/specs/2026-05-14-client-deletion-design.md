# Client Deletion — Design Spec

**Date:** 2026-05-14
**Status:** Approved

## Problem

There is no way to remove a client from the system. The only client operations available are create and list. Users need to be able to clean up clients they no longer need — from both desktop and mobile.

## Scope

Inline client deletion within the existing `ClientDropdown` component. No new pages or routes.

## Decisions

| Question | Decision |
|---|---|
| Where does delete live? | Inline in the `ClientDropdown` list |
| How is it triggered? | Always-visible `Trash` icon (Phosphor) to the right of each client name |
| Confirmation required? | Yes — reuse existing `Modal` component |
| Mobile support | Always-visible icon works on touch; no hover required |
| What happens to linked estimates? | DB `ON DELETE SET NULL` — estimates are unlinked, not deleted |

## Files Changed

### `src/services/clients.ts`

Add one new export:

```ts
export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

RLS already enforces org membership on DELETE — no additional auth logic needed.

### `src/components/estimate/ClientDropdown.tsx`

**State additions:**
- `pendingDelete: ClientRow | null` — client staged for deletion

**Row layout change:**
Each client `<li>` becomes a flex row:
- Left: existing name button (flex-1, selects the client)
- Right: `Trash` icon button (Phosphor, always visible, small touch target, does not close the dropdown)

**Handlers:**
- `handleDeleteClick(client, e)` — calls `e.stopPropagation()` to prevent dropdown close, sets `pendingDelete`
- `confirmDelete()` — calls `deleteClient(pendingDelete.id)`, removes client from local `clients` state, clears `client_id` on the estimate if the deleted client was selected (via `setEstimateField` + sync queue enqueue), clears `pendingDelete`. If the call throws, display an inline error message in the modal and leave it open (do not remove the client from state).
- `cancelDelete()` — clears `pendingDelete`

**Modal (appended to component return):**

```
Title:   "Remove client?"
Body:    "[Client Name] will be removed. Existing estimates using this client will be unlinked but not deleted."
Footer:  [Cancel]  [Remove]  ← Remove styled as destructive (red)
```

Uses the existing `Modal` component from `src/components/ui/Modal.tsx`.

## Data Behavior

- Supabase RLS policy `"members can delete clients"` already exists (`is_org_member(organization_id)`)
- `estimates.client_id` is `REFERENCES clients(id) ON DELETE SET NULL` — no estimate data is lost
- `invoices.client_id` is also `ON DELETE SET NULL` — same protection
- Local `clients` state in `ClientDropdown` is updated immediately on confirm (optimistic removal)

## Out of Scope

- Client editing (name, email, phone)
- Bulk deletion
- Dedicated client management page
- Undo / soft delete
