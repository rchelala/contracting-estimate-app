import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/layout/TopNav'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import { listEstimates, duplicateEstimate, deleteEstimate, type EstimateListRow } from '../services/estimates'
import { getMyMembership } from '../services/organizations'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCents } from '../utils/money'
import { formatRelativeDate } from '../utils/dates'

type SortKey = 'estimate_number' | 'status' | 'total_cents' | 'updated_at'
type SortDir = 'asc' | 'desc'

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

function NewEstimateButton({ extraClass = '' }: { extraClass?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/estimates/wizard')}
      className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2 ${extraClass}`}
    >
      New Estimate
    </button>
  )
}

interface RowActionsProps {
  estimateId: string
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  duplicating: boolean
  deleting: boolean
}

function RowActionsMenu({ estimateId, onDuplicate, onDelete, duplicating, deleting }: RowActionsProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const busy = duplicating || deleting

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return (
    <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Row actions"
        className="text-slate-400 hover:text-slate-600 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-slate-200 bg-white shadow-md">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false)
              onDuplicate(estimateId)
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            onClick={() => {
              setOpen(false)
              onDelete(estimateId)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState<string>('')
  const [rows, setRows] = useState<EstimateListRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('updated_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [reloadCounter, setReloadCounter] = useState(0)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EstimateListRow | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{
    selectedCount: number
    draftIds: string[]
  } | null>(null)

  // Load org name (via membership → organizations.name)
  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const m = await getMyMembership(session.user.id)
        if (!m) return
        const { data } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', m.organization_id)
          .maybeSingle()
        if (!cancelled && data) setOrgName(data.name)
      } catch {
        // Org name is non-critical; leave blank
      }
    })()
    return () => { cancelled = true }
  }, [session])

  // Load estimates — reset state via Promise chain to avoid synchronous setState in effect body
  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setRows(null)
          setError(null)
        }
        return listEstimates()
      })
      .then((data) => { if (!cancelled) setRows(data) })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
    return () => { cancelled = true }
  }, [reloadCounter])

  const sorted = useMemo(() => {
    if (!rows) return null
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return <span className="text-slate-400">↕</span>
    return <span className="text-blue-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  async function handleDuplicate(sourceId: string) {
    setActionError(null)
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .limit(1)
      .maybeSingle()
    if (!member) return
    setDuplicatingId(sourceId)
    try {
      const newEstimate = await duplicateEstimate(sourceId, member.organization_id)
      navigate(`/estimates/${newEstimate.id}`)
    } catch {
      setDuplicatingId(null)
    }
  }

  function handleRequestDelete(row: EstimateListRow) {
    setActionError(null)
    setDeleteTarget(row)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setActionError(null)
    if (deleteTarget.status !== 'draft') {
      setActionError('Only draft estimates can be deleted.')
      setDeletingId(null)
      return
    }
    setDeletingId(deleteTarget.id)
    try {
      await deleteEstimate(deleteTarget.id)
      setRows((current) => current?.filter((row) => row.id !== deleteTarget.id) ?? current)
      setDeleteTarget(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete estimate')
      setDeleteTarget(null)
    } finally {
      setDeletingId(null)
    }
  }

  function toggleSelectAll() {
    if (!sorted) return
    const allIds = sorted.map((r) => r.id)
    setSelectedIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds),
    )
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
    setBulkDeleteTarget(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="px-6 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-[1.3]">Estimates</h1>
            {orgName && <p className="mt-1 text-sm text-slate-500">{orgName}</p>}
          </div>
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
        </div>

        <div className="mt-6">
          {selectionMode && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                disabled={selectedIds.size === 0 || deletingId !== null || (sorted !== null && draftIdsFromSelection(selectedIds, sorted).length === 0)}
                onClick={() => {
                  if (!sorted) return
                  const drafts = draftIdsFromSelection(selectedIds, sorted)
                  if (drafts.length === 0) return
                  setBulkDeleteTarget({ selectedCount: selectedIds.size, draftIds: drafts })
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete {selectedIds.size} selected
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
          {actionError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {/* Loading */}
          {rows === null && !error && (
            <div aria-busy="true" aria-label="Loading estimates">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 animate-pulse rounded mb-2" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-12 text-center">
              <h2 className="text-xl font-semibold text-slate-900">Couldn&apos;t load your estimates</h2>
              <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => setReloadCounter((c) => c + 1)}
                className="mt-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-md px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2"
              >
                Reload estimates
              </button>
            </div>
          )}

          {/* Empty */}
          {sorted && sorted.length === 0 && !error && (
            <div className="mt-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-lg" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">No estimates yet</h2>
              <p className="mt-1 text-sm text-slate-500">Create your first estimate to get started.</p>
              <NewEstimateButton extraClass="mt-4" />
            </div>
          )}

          {/* Table */}
          {sorted && sorted.length > 0 && (
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
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
                  <th className="text-left text-sm font-semibold text-slate-600 py-2 px-4 cursor-pointer w-[100px]" onClick={() => toggleSort('estimate_number')}>
                    Estimate # {sortIndicator('estimate_number')}
                  </th>
                  <th className="text-left text-sm font-semibold text-slate-600 py-2 px-4">Client</th>
                  <th className="text-left text-sm font-semibold text-slate-600 py-2 px-4">Title</th>
                  <th className="text-left text-sm font-semibold text-slate-600 py-2 px-4 cursor-pointer w-[100px]" onClick={() => toggleSort('status')}>
                    Status {sortIndicator('status')}
                  </th>
                  <th className="text-right text-sm font-semibold text-slate-600 py-2 px-4 cursor-pointer w-[100px]" onClick={() => toggleSort('total_cents')}>
                    Total {sortIndicator('total_cents')}
                  </th>
                  <th className="text-left text-sm font-semibold text-slate-600 py-2 px-4 cursor-pointer w-[140px]" onClick={() => toggleSort('updated_at')}>
                    Last Updated {sortIndicator('updated_at')}
                  </th>
                  {!selectionMode && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (selectionMode) {
                        toggleRow(r.id)
                      } else {
                        navigate(`/estimates/${r.id}`)
                      }
                    }}
                    className="bg-white border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
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
                    <td className="text-sm text-slate-900 py-2 px-4">{r.estimate_number}</td>
                    <td className="text-sm text-slate-900 py-2 px-4">{r.client_name ?? '—'}</td>
                    <td className="text-sm text-slate-900 py-2 px-4">{r.title ?? '—'}</td>
                    <td className="text-sm text-slate-900 py-2 px-4"><StatusBadge status={r.status} /></td>
                    <td className="text-sm text-slate-900 py-2 px-4 text-right">{formatCents(r.total_cents)}</td>
                    <td className="text-sm text-slate-500 py-2 px-4">{formatRelativeDate(r.updated_at)}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deletingId) setDeleteTarget(null)
        }}
        title={`Delete ${deleteTarget?.estimate_number ?? 'estimate'}?`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingId !== null}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        This permanently deletes the estimate and its line items.
      </Modal>
    </div>
  )
}
