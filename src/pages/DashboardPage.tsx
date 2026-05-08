import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowsDownUp, ArrowUp, ArrowDown, DotsThreeVertical, MagnifyingGlass, Plus, Funnel } from '@phosphor-icons/react'
import TopNav from '../components/layout/TopNav'
import StatusBadge from '../components/ui/StatusBadge'
import Modal from '../components/ui/Modal'
import { listEstimates, duplicateEstimate, deleteEstimate, type EstimateListRow } from '../services/estimates'
import { getMyMembership } from '../services/organizations'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCents } from '../utils/money'
import { formatRelativeDate } from '../utils/dates'
import { draftIdsFromSelection, bulkDeleteModalMessage } from './DashboardPage.helpers'

type SortKey = 'estimate_number' | 'status' | 'total_cents' | 'updated_at'
type SortDir = 'asc' | 'desc'

function NewEstimateButton({ extraClass = '' }: { extraClass?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/estimates/wizard')}
      className={`bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold text-sm rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2 ${extraClass}`}
    >
      <Plus size={14} weight="bold" />
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
        className="text-stone-400 hover:text-stone-600 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-stone-200 bg-white shadow-md">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
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

  const statCounts = useMemo(() => {
    if (!rows) return null
    return {
      draft: rows.filter((r) => r.status === 'draft').length,
      sent: rows.filter((r) => r.status === 'sent').length,
      approved: rows.filter((r) => r.status === 'approved').length,
    }
  }, [rows])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return <ArrowsDownUp size={13} className="inline ml-1 text-stone-400" />
    return sortDir === 'asc'
      ? <ArrowUp size={13} className="inline ml-1 text-orange-500" />
      : <ArrowDown size={13} className="inline ml-1 text-orange-500" />
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

  async function handleConfirmBulkDelete() {
    if (!bulkDeleteTarget || bulkDeleteTarget.draftIds.length === 0) return
    setActionError(null)
    setDeletingId('bulk')
    const deletedIds: string[] = []
    try {
      for (const id of bulkDeleteTarget.draftIds) {
        await deleteEstimate(id)
        deletedIds.push(id)
      }
      setRows((current) =>
        current?.filter((r) => !deletedIds.includes(r.id)) ?? current
      )
      exitSelectionMode()
    } catch (err) {
      if (deletedIds.length > 0) {
        setRows((current) =>
          current?.filter((r) => !deletedIds.includes(r.id)) ?? current
        )
        setSelectedIds((prev) => {
          const next = new Set(prev)
          deletedIds.forEach((id) => next.delete(id))
          return next
        })
      }
      setActionError(err instanceof Error ? err.message : 'Failed to delete some estimates')
      setBulkDeleteTarget(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <main className="px-4 sm:px-6 pt-8 pb-16">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Estimates</h1>
            {orgName && <p className="mt-1 text-sm text-stone-500">{orgName}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!selectionMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectionMode(true)}
                  className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-lg px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Select
                </button>
                <NewEstimateButton />
              </>
            ) : (
              <button
                type="button"
                onClick={exitSelectionMode}
                className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-lg px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        {statCounts && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Drafts</p>
              <p className="mt-1 text-2xl font-extrabold text-stone-900">{statCounts.draft}</p>
              <p className="text-xs text-stone-500 mt-0.5">In progress</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Sent</p>
              <p className="mt-1 text-2xl font-extrabold text-stone-900">{statCounts.sent}</p>
              <p className="text-xs text-stone-500 mt-0.5">Awaiting response</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Approved</p>
              <p className="mt-1 text-2xl font-extrabold text-stone-900">{statCounts.approved}</p>
              <p className="text-xs text-stone-500 mt-0.5">Approved</p>
            </div>
          </div>
        )}

        <div className="mt-6">
          {/* Search + filter bar */}
          {!selectionMode && sorted && sorted.length > 0 && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-2">
                <MagnifyingGlass size={15} className="text-stone-400 shrink-0" />
                <span className="text-sm text-stone-400">Search estimates or clients…</span>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-medium text-sm rounded-lg px-3 py-2"
              >
                <Funnel size={14} />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          )}

          {selectionMode && (
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-stone-600">
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
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete {selectedIds.size} selected
              </button>
              <button
                type="button"
                onClick={exitSelectionMode}
                className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-lg px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          )}

          {actionError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {/* Loading */}
          {rows === null && !error && (
            <div aria-busy="true" aria-label="Loading estimates">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-stone-100 animate-pulse rounded-lg mb-2" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-12 text-center">
              <h2 className="text-xl font-semibold text-stone-900">Couldn&apos;t load your estimates</h2>
              <p className="mt-1 text-sm text-stone-500">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => setReloadCounter((c) => c + 1)}
                className="mt-4 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-lg px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2"
              >
                Reload estimates
              </button>
            </div>
          )}

          {/* Empty */}
          {sorted && sorted.length === 0 && !error && (
            <div className="mt-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 border-2 border-dashed border-stone-200 rounded-xl" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-stone-900">No estimates yet</h2>
              <p className="mt-1 text-sm text-stone-500">Create your first estimate to get started.</p>
              <NewEstimateButton extraClass="mt-4" />
            </div>
          )}

          {/* Mobile card list */}
          {sorted && sorted.length > 0 && (
            <div className="block sm:hidden divide-y divide-stone-200">
              {sorted.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 bg-white active:bg-stone-50 cursor-pointer min-h-15"
                  onClick={() => navigate(`/estimates/${r.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-900 truncate">
                      {r.client_name ?? 'No client'}
                    </div>
                    <div className="text-sm text-stone-600 truncate">
                      {r.title}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5">
                      Est. #{r.estimate_number} · {formatRelativeDate(r.updated_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-stone-900 text-sm">
                      {formatCents(r.total_cents ?? 0)}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-stone-300 text-lg">›</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {sorted && sorted.length > 0 && (
            <div className="hidden sm:block bg-white border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
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
                          className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                        />
                      </th>
                    )}
                    <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide py-3 px-4 cursor-pointer w-[100px]" onClick={() => toggleSort('estimate_number')}>
                      Est # {sortIndicator('estimate_number')}
                    </th>
                    <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide py-3 px-4">Client</th>
                    <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide py-3 px-4">Title</th>
                    <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide py-3 px-4 cursor-pointer w-[110px]" onClick={() => toggleSort('status')}>
                      Status {sortIndicator('status')}
                    </th>
                    <th className="text-right text-xs font-semibold text-stone-500 uppercase tracking-wide py-3 px-4 cursor-pointer w-[100px]" onClick={() => toggleSort('total_cents')}>
                      Total {sortIndicator('total_cents')}
                    </th>
                    <th className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wide py-3 px-4 cursor-pointer w-[140px]" onClick={() => toggleSort('updated_at')}>
                      Updated {sortIndicator('updated_at')}
                    </th>
                    {!selectionMode && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => {
                        if (selectionMode) {
                          toggleRow(r.id)
                        } else {
                          navigate(`/estimates/${r.id}`)
                        }
                      }}
                      className={`border-t border-stone-100 hover:bg-stone-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}
                    >
                      {selectionMode && (
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select estimate ${r.estimate_number}`}
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleRow(r.id)}
                            className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                      )}
                      <td className="text-sm font-semibold text-orange-600 py-3 px-4">{r.estimate_number}</td>
                      <td className="text-sm font-medium text-stone-900 py-3 px-4">{r.client_name ?? '—'}</td>
                      <td className="text-sm text-stone-600 py-3 px-4">{r.title ?? '—'}</td>
                      <td className="text-sm py-3 px-4"><StatusBadge status={r.status} /></td>
                      <td className="text-sm font-semibold text-stone-900 py-3 px-4 text-right">{formatCents(r.total_cents)}</td>
                      <td className="text-sm text-stone-400 py-3 px-4">{formatRelativeDate(r.updated_at)}</td>
                      {!selectionMode && (
                        <td className="py-3 px-2">
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
            </div>
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
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        This permanently deletes the estimate and its line items.
      </Modal>

      <Modal
        open={bulkDeleteTarget !== null}
        onClose={() => {
          if (!deletingId) setBulkDeleteTarget(null)
        }}
        title={`Delete ${bulkDeleteTarget?.selectedCount ?? 0} selected estimate${(bulkDeleteTarget?.selectedCount ?? 0) === 1 ? '' : 's'}?`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBulkDeleteTarget(null)}
              disabled={deletingId !== null}
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkDelete}
              disabled={deletingId !== null || (bulkDeleteTarget?.draftIds.length ?? 0) === 0}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-hidden focus:ring-3 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingId ? 'Deleting...' : `Delete ${bulkDeleteTarget?.draftIds.length ?? 0} estimate${(bulkDeleteTarget?.draftIds.length ?? 0) === 1 ? '' : 's'}`}
            </button>
          </>
        }
      >
        {bulkDeleteTarget
          ? bulkDeleteModalMessage(bulkDeleteTarget.selectedCount, bulkDeleteTarget.draftIds.length)
          : ''}
      </Modal>
    </div>
  )
}
