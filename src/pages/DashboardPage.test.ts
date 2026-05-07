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
