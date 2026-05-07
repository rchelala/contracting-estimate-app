import type { EstimateListRow } from '../services/estimates'

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
  if (draftCount === 0) {
    return `None of the ${selectedCount} selected estimate${selectedCount === 1 ? '' : 's'} are drafts — nothing will be deleted.`
  }
  const skipped = selectedCount - draftCount
  if (skipped === 0) {
    return `Permanently delete ${draftCount} estimate${draftCount === 1 ? '' : 's'} and ${draftCount === 1 ? 'its' : 'their'} line items?`
  }
  return `${draftCount} of ${selectedCount} selected estimate${selectedCount === 1 ? '' : 's'} ${draftCount === 1 ? 'is a draft' : 'are drafts'} and will be deleted. ${skipped} non-draft estimate${skipped === 1 ? '' : 's'} will be skipped.`
}
