# UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic slate/blue UI with a warm professional aesthetic (stone palette, orange accent) and swap all emoji/unicode icons for Phosphor Icons across all four pages.

**Architecture:** Install `@phosphor-icons/react`, create a shared `LogoBadge` component, then update each component/page in isolation. No new data fetching — stat cards on the dashboard derive counts from the existing `rows` state already fetched. Color changes are mechanical class-name swaps (slate→stone, blue→orange).

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS v4, `@phosphor-icons/react`

**Design spec:** `docs/superpowers/specs/2026-05-08-ui-modernization-design.md`

---

### Task 1: Install Phosphor Icons

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
npm install @phosphor-icons/react
```

Expected output: `added 1 package` (or similar). No peer-dep warnings expected.

- [ ] **Step 2: Verify it imported correctly**

```bash
npm run type-check
```

Expected: no errors (nothing changed yet, just verifying the install didn't break anything).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @phosphor-icons/react"
```

---

### Task 2: Create shared LogoBadge component

**Files:**
- Create: `src/components/ui/LogoBadge.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/ui/LogoBadge.tsx
import { FileText } from '@phosphor-icons/react'

interface Props {
  size?: number
}

export default function LogoBadge({ size = 28 }: Props) {
  const iconSize = Math.round(size * 0.57)
  return (
    <div
      style={{ width: size, height: size }}
      className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center shrink-0"
    >
      <FileText weight="fill" size={iconSize} color="white" />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LogoBadge.tsx
git commit -m "feat(ui): add LogoBadge shared component"
```

---

### Task 3: Update TopNav

**Files:**
- Modify: `src/components/layout/TopNav.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Gear } from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'
import LogoBadge from '../ui/LogoBadge'

function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return (local.slice(0, 2) || '?').toUpperCase()
}

export default function TopNav() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const initials = getInitials(session?.user.email)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-stone-900 border-b-2 border-orange-500 pb-3' : 'text-stone-500 hover:text-stone-700'}`

  return (
    <nav className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <LogoBadge size={28} />
        <span className="text-sm font-bold text-stone-900 tracking-tight">EstimateFlow</span>
      </div>
      <div className="flex items-center gap-8">
        <NavLink to="/dashboard" className={linkClass}>Estimates</NavLink>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        >
          <Gear size={18} />
        </button>
        <div ref={popoverRef} className="relative ml-1">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white text-sm font-bold flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            {initials}
          </button>
          {open && (
            <div role="menu" className="absolute right-0 mt-2 w-40 bg-white border border-stone-200 rounded-lg shadow-md py-1 z-10">
              <button
                role="menuitem"
                type="button"
                onClick={() => { void signOut() }}
                className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-stone-900"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopNav.tsx
git commit -m "feat(ui): update TopNav with logo badge, gear icon, warm palette"
```

---

### Task 4: Update StatusBadge

**Files:**
- Modify: `src/components/ui/StatusBadge.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import type { Database } from '../../types/database.types'

type EstimateStatus = Database['public']['Enums']['estimate_status']

const BADGE_CLASSES: Partial<Record<EstimateStatus, string>> = {
  draft:    'bg-stone-100 text-stone-600',
  sent:     'bg-green-100 text-green-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  expired:  'bg-amber-100 text-amber-700',
  invoiced: 'bg-purple-100 text-purple-700',
}

const LABELS: Partial<Record<EstimateStatus, string>> = {
  draft:    'Draft',
  sent:     'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired:  'Expired',
  invoiced: 'Invoiced',
}

interface Props {
  status: EstimateStatus
}

export default function StatusBadge({ status }: Props) {
  const classes = BADGE_CLASSES[status] ?? 'bg-stone-100 text-stone-600'
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/StatusBadge.tsx
git commit -m "feat(ui): update StatusBadge with warm palette and full status coverage"
```

---

### Task 5: Update DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
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
      className={`bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold text-sm rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm focus:outline-hidden focus:ring-3 focus:ring-orange-500 focus:ring-offset-2 ${extraClass}`}
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
      <main className="px-6 pt-8 pb-16">
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
          <div className="mt-6 grid grid-cols-3 gap-4">
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
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
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
                Filter
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

          {/* Table */}
          {sorted && sorted.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
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
```

- [ ] **Step 2: Type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(ui): update dashboard with stat cards, Phosphor icons, warm palette"
```

---

### Task 6: Update small editor components

**Files:**
- Modify: `src/components/estimate/DragHandle.tsx`
- Modify: `src/components/estimate/LineItemActions.tsx`
- Modify: `src/components/estimate/SectionHeader.tsx`
- Modify: `src/components/estimate/AddLineItemButton.tsx`
- Modify: `src/components/estimate/AddSectionButton.tsx`
- Modify: `src/components/estimate/AISuggestedBadge.tsx`
- Modify: `src/components/estimate/SaveIndicator.tsx`
- Modify: `src/components/estimate/AttachPhotoButton.tsx`
- Modify: `src/components/estimate/AttachmentThumbnails.tsx`

- [ ] **Step 1: Update `DragHandle.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { DotsSixVertical } from '@phosphor-icons/react'

interface Props {
  listeners?: Record<string, unknown>
  attributes?: Record<string, unknown>
  className?: string
}

export default function DragHandle({ listeners, attributes, className }: Props) {
  const listenerProps = listeners as ButtonHTMLAttributes<HTMLButtonElement> | undefined
  const attributeProps = attributes as ButtonHTMLAttributes<HTMLButtonElement> | undefined
  return (
    <button
      type="button"
      aria-label="Reorder"
      className={`text-stone-300 hover:text-stone-500 active:text-stone-700 cursor-grab active:cursor-grabbing min-h-[44px] w-5 flex items-center justify-center ${className ?? ''}`}
      {...attributeProps}
      {...listenerProps}
    >
      <DotsSixVertical size={16} weight="bold" aria-hidden="true" />
    </button>
  )
}
```

- [ ] **Step 2: Update `LineItemActions.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { DotsThreeVertical } from '@phosphor-icons/react'

interface Props {
  optional: boolean
  onToggleOptional: () => void
  onDelete: () => void
  disabled?: boolean
}

export default function LineItemActions({ optional, onToggleOptional, onDelete, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  return (
    <div ref={ref} className="relative w-8">
      <button
        type="button"
        aria-label="Row actions"
        disabled={disabled}
        className="text-stone-400 hover:text-stone-600 min-h-[44px] w-8 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setOpen((v) => !v)}
      >
        <DotsThreeVertical size={16} weight="bold" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-44 bg-white border border-stone-200 rounded-lg shadow-md z-20 py-1">
          <button
            role="menuitem"
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            onClick={() => { onToggleOptional(); setOpen(false) }}
          >
            {optional ? 'Remove optional' : 'Mark optional'}
          </button>
          <button
            role="menuitem"
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { onDelete(); setOpen(false) }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `SectionHeader.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { DotsThreeVertical } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import DragHandle from './DragHandle'

interface Props {
  sectionId: string
  readOnly: boolean
  onRequestDelete: () => void
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
}

export default function SectionHeader({
  sectionId,
  readOnly,
  onRequestDelete,
  dragListeners,
  dragAttributes,
}: Props) {
  const section = useEditorStore((s) => s.sectionsById[sectionId])
  const updateLocal = useEditorStore((s) => s.updateSectionLocal)
  const enqueue = useSyncQueue((s) => s.enqueue)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  if (!section) return null

  function handleNameBlur(next: string) {
    if (next === section!.name) return
    updateLocal(sectionId, { name: next })
    enqueue({ kind: 'section.update', id: sectionId, patch: { name: next } })
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-200">
      <DragHandle
        {...(dragListeners !== undefined ? { listeners: dragListeners } : {})}
        {...(dragAttributes !== undefined ? { attributes: dragAttributes } : {})}
      />
      <input
        type="text"
        defaultValue={section.name}
        maxLength={200}
        disabled={readOnly}
        className="flex-1 text-base font-bold text-stone-900 border-0 bg-transparent focus:outline-none focus:border-b-2 focus:border-orange-500 placeholder:text-stone-400 disabled:cursor-not-allowed"
        onBlur={(e) => handleNameBlur(e.target.value)}
      />
      <div ref={ref} className="relative ml-auto">
        <button
          type="button"
          aria-label="Section actions"
          disabled={readOnly}
          className="text-stone-400 hover:text-stone-600 min-h-[44px] w-8 flex items-center justify-center disabled:opacity-50"
          onClick={() => setOpen((v) => !v)}
        >
          <DotsThreeVertical size={16} weight="bold" />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-1 w-40 bg-white border border-stone-200 rounded-lg shadow-md z-20 py-1"
          >
            <button
              role="menuitem"
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                onRequestDelete()
                setOpen(false)
              }}
            >
              Delete section
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `AddLineItemButton.tsx`**

```tsx
import { Plus } from '@phosphor-icons/react'

interface Props {
  onClick: () => void
  disabled?: boolean
}

export default function AddLineItemButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex items-center gap-1.5 text-orange-600 text-sm pl-9 py-2 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      <Plus size={13} weight="bold" />
      Add line item
    </button>
  )
}
```

- [ ] **Step 5: Update `AddSectionButton.tsx`**

```tsx
import { Plus } from '@phosphor-icons/react'

interface Props {
  onClick: () => void
  disabled?: boolean
}

export default function AddSectionButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex items-center gap-1.5 bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
    >
      <Plus size={14} weight="bold" />
      Add section
    </button>
  )
}
```

- [ ] **Step 6: Update `AISuggestedBadge.tsx`**

```tsx
import { Sparkle } from '@phosphor-icons/react'

export default function AISuggestedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
      <Sparkle size={10} weight="fill" />
      AI Suggested
    </span>
  )
}
```

- [ ] **Step 7: Update `SaveIndicator.tsx`**

```tsx
import { CheckCircle, CircleNotch, CloudSlash } from '@phosphor-icons/react'
import { useSyncQueue } from '../../stores/syncQueueStore'

export default function SaveIndicator() {
  const status = useSyncQueue((s) => s.status)
  const lastError = useSyncQueue((s) => s.lastError)
  const setStatus = useSyncQueue((s) => s.setStatus)

  switch (status) {
    case 'saving':
      return (
        <span className="flex items-center gap-1.5 text-stone-400 text-xs mr-4">
          <CircleNotch size={13} className="animate-spin" />
          Saving…
        </span>
      )
    case 'saved':
      return (
        <span className="flex items-center gap-1.5 text-green-600 text-xs font-semibold mr-4">
          <CheckCircle size={13} weight="fill" />
          Saved
        </span>
      )
    case 'queued':
      return <span className="text-amber-600 text-xs mr-4">Queued</span>
    case 'error':
      return (
        <span className="flex items-center gap-1.5 text-red-600 text-xs mr-4">
          <CloudSlash size={13} />
          Failed ·{' '}
          <button
            type="button"
            className="text-red-600 underline cursor-pointer"
            onClick={() => {
              void lastError
              setStatus('saving')
            }}
          >
            Retry
          </button>
        </span>
      )
    default:
      return <span className="text-xs mr-4" />
  }
}
```

- [ ] **Step 8: Update `AttachPhotoButton.tsx`** — replace `'Attach photo'` text label with a Camera icon

Replace only the button content (the `{uploading ? 'Uploading...' : 'Attach photo'}` text). Add import at top, change button contents:

```tsx
import { useRef, useState, useEffect } from 'react'
import { Camera } from '@phosphor-icons/react'
import { uploadAttachment } from '../../services/attachments'
import { useEditorStore } from '../../stores/editorStore'

interface Props {
  lineItemId: string
  disabled?: boolean
}

export default function AttachPhotoButton({ lineItemId, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const item = useEditorStore((s) => s.lineItemsById[lineItemId])
  const addAttachmentLocal = useEditorStore((s) => s.addAttachmentLocal)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  async function handleFile(file: File) {
    if (!item) {
      console.warn('[AttachPhotoButton] Line item not found in store')
      setError('Unable to find line item. Please try refreshing.')
      return
    }
    console.log('[AttachPhotoButton] Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lineItemId,
    })
    setUploading(true)
    setError(null)
    try {
      const att = await uploadAttachment({
        file,
        organization_id: item.organization_id,
        estimate_id: item.estimate_id,
        section_id: item.section_id,
        line_item_id: lineItemId,
      })
      console.log('[AttachPhotoButton] Upload successful:', att.id)
      addAttachmentLocal(att)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Upload failed. Try again.'
      console.error('[AttachPhotoButton] Upload error:', errorMsg, e)
      setError(errorMsg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        className="text-stone-400 hover:text-stone-600 disabled:opacity-50 flex items-center gap-1"
        onClick={() => inputRef.current?.click()}
        title={error || 'Attach a photo'}
      >
        <Camera size={14} />
        {uploading && <span className="text-xs">Uploading…</span>}
      </button>
      {error && (
        <span className="text-red-500 text-xs ml-2 inline-block max-w-xs truncate" title={error}>
          {error}
        </span>
      )}
    </>
  )
}
```

- [ ] **Step 9: Update `AttachmentThumbnails.tsx`** — replace `×` remove button with X icon

```tsx
import { useEffect, useMemo, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editorStore'
import { deleteAttachment, getAttachmentUrl } from '../../services/attachments'

interface Props {
  lineItemId: string
  readOnly: boolean
}

export default function AttachmentThumbnails({ lineItemId, readOnly }: Props) {
  const attachmentsById = useEditorStore((s) => s.attachmentsById)
  const attachments = useMemo(
    () => Object.values(attachmentsById).filter((a) => a.line_item_id === lineItemId),
    [attachmentsById, lineItemId],
  )
  const removeLocal = useEditorStore((s) => s.removeAttachmentLocal)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      const next: Record<string, string> = { ...urls }
      const errors: Record<string, string> = {}
      let changed = false
      for (const a of attachments) {
        if (next[a.id]) continue
        try {
          next[a.id] = await getAttachmentUrl(a.storage_path)
          changed = true
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Failed to load image'
          errors[a.id] = errorMsg
          console.error(`[AttachmentThumbnails] Failed to load attachment ${a.id}:`, e)
        }
      }
      if (!cancelled) {
        if (changed) setUrls(next)
        if (Object.keys(errors).length > 0) setLoadErrors(errors)
      }
    }
    if (attachments.length > 0) void loadAll()
    return () => {
      cancelled = true
    }
  }, [attachments, urls])

  if (attachments.length === 0) return null

  async function handleRemove(id: string, path: string) {
    try {
      console.log('[AttachmentThumbnails] Removing attachment:', id)
      await deleteAttachment(id, path)
      removeLocal(id)
    } catch (e) {
      console.error('[AttachmentThumbnails] Failed to remove attachment:', e)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 pb-2 overflow-x-auto">
      {attachments.map((a) => (
        <div key={a.id} className="relative shrink-0 group" title={a.filename}>
          {urls[a.id] ? (
            <img
              src={urls[a.id]}
              alt={a.filename}
              className="w-12 h-12 rounded-md object-cover border border-stone-200"
            />
          ) : loadErrors[a.id] ? (
            <div
              className="w-12 h-12 rounded-md bg-red-50 border border-red-200 flex items-center justify-center"
              title={loadErrors[a.id]}
            >
              <span className="text-xs text-red-500">!</span>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-md bg-stone-100 animate-pulse" />
          )}
          {!readOnly && (
            <button
              type="button"
              aria-label="Remove photo"
              className="absolute -top-1 -right-1 bg-white border border-stone-200 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-300 hover:text-red-600 text-stone-400"
              onClick={() => {
                void handleRemove(a.id, a.storage_path)
              }}
            >
              <X size={8} weight="bold" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 10: Type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/estimate/DragHandle.tsx src/components/estimate/LineItemActions.tsx src/components/estimate/SectionHeader.tsx src/components/estimate/AddLineItemButton.tsx src/components/estimate/AddSectionButton.tsx src/components/estimate/AISuggestedBadge.tsx src/components/estimate/SaveIndicator.tsx src/components/estimate/AttachPhotoButton.tsx src/components/estimate/AttachmentThumbnails.tsx
git commit -m "feat(ui): update editor components with Phosphor icons and warm palette"
```

---

### Task 7: Update EditorHeaderBar and StickyTotalsBar

**Files:**
- Modify: `src/components/estimate/EditorHeaderBar.tsx`
- Modify: `src/components/estimate/StickyTotalsBar.tsx`

- [ ] **Step 1: Replace `EditorHeaderBar.tsx`**

```tsx
import { PaperPlaneTilt } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import ClientDropdown from './ClientDropdown'
import SaveIndicator from './SaveIndicator'
import StatusBadge from '../ui/StatusBadge'

interface Props {
  onSendClick?: () => void
}

export default function EditorHeaderBar({ onSendClick }: Props) {
  const estimate = useEditorStore((s) => s.estimate)
  const readOnly = useEditorStore((s) => s.readOnly)
  const setEstimateField = useEditorStore((s) => s.setEstimateField)
  const enqueue = useSyncQueue((s) => s.enqueue)

  if (!estimate) return null
  const title = estimate.title ?? ''

  function handleTitleChange(next: string) {
    setEstimateField({ title: next })
    enqueue({
      kind: 'estimate.update',
      estimateId: estimate!.id,
      patch: { title: next || null },
    })
  }

  return (
    <header className="flex items-center h-14 px-6 bg-white border-b border-stone-200">
      <ClientDropdown readOnly={readOnly} />
      <input
        type="text"
        placeholder="Untitled estimate"
        maxLength={200}
        disabled={readOnly}
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="flex-1 text-base font-semibold text-stone-900 border-0 bg-transparent mx-4 focus:outline-none focus:ring-0 placeholder:text-stone-400 disabled:cursor-not-allowed"
      />
      {readOnly ? <StatusBadge status="sent" /> : <SaveIndicator />}
      <button
        type="button"
        disabled={readOnly}
        data-testid="send-button"
        onClick={onSendClick}
        className="flex items-center gap-2 bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
        <PaperPlaneTilt size={14} weight="fill" />
      </button>
    </header>
  )
}
```

- [ ] **Step 2: Replace `StickyTotalsBar.tsx`**

```tsx
import { useEditorStore } from '../../stores/editorStore'
import { formatCents, lineItemTotal } from '../../utils/money'

export default function StickyTotalsBar() {
  const estimate = useEditorStore((s) => s.estimate)
  const lineItemsById = useEditorStore((s) => s.lineItemsById)
  if (!estimate) return null

  let subtotal = 0
  let taxableSubtotal = 0
  for (const item of Object.values(lineItemsById)) {
    if (item.optional) continue
    const itemTotal = lineItemTotal(
      Number(item.quantity),
      item.unit_price_cents,
      Number(item.markup_pct),
    )
    subtotal += itemTotal
    if (item.taxable) taxableSubtotal += itemTotal
  }

  const taxRate = Number(estimate.tax_rate_pct ?? 0)
  const tax = Math.round(taxableSubtotal * (taxRate / 100))
  const total = subtotal + tax

  return (
    <div className="fixed bottom-0 left-0 w-full h-14 bg-white border-t border-stone-200 flex items-center justify-end gap-6 px-6 z-30">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Subtotal</span>
        <span className="text-sm font-semibold text-stone-900">{formatCents(subtotal)}</span>
      </div>
      {tax > 0 && (
        <>
          <div className="h-5 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Tax</span>
            <span className="text-sm font-semibold text-stone-900">{formatCents(tax)}</span>
          </div>
        </>
      )}
      <div className="h-5 w-px bg-stone-200" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Total</span>
        <span className="text-xl font-extrabold text-orange-600 tracking-tight">{formatCents(total)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/estimate/EditorHeaderBar.tsx src/components/estimate/StickyTotalsBar.tsx
git commit -m "feat(ui): update editor header bar and totals bar with warm palette and icons"
```

---

### Task 8: Update banners

**Files:**
- Modify: `src/components/estimate/OfflineBanner.tsx`
- Modify: `src/components/estimate/ReadOnlyBanner.tsx`

- [ ] **Step 1: Replace `OfflineBanner.tsx`**

```tsx
import { useState } from 'react'
import { WifiSlash, X } from '@phosphor-icons/react'

export default function OfflineBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm h-10 flex items-center justify-between px-6">
      <span className="flex items-center gap-2">
        <WifiSlash size={15} weight="fill" />
        You're offline — changes are saved locally and will sync when you reconnect.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-amber-600 hover:text-amber-800"
        onClick={() => setDismissed(true)}
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Replace `ReadOnlyBanner.tsx`**

```tsx
import { Lock } from '@phosphor-icons/react'

export default function ReadOnlyBanner() {
  return (
    <div className="bg-stone-100 border-b border-stone-200 text-stone-500 text-sm h-10 flex items-center gap-2 px-6">
      <Lock size={14} weight="fill" />
      This estimate has been marked as sent and is now read-only.
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/estimate/OfflineBanner.tsx src/components/estimate/ReadOnlyBanner.tsx
git commit -m "feat(ui): update banners with Phosphor icons and stone palette"
```

---

### Task 9: Update WizardGenerating

**Files:**
- Modify: `src/components/wizard/WizardGenerating.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Robot, CheckCircle, CircleNotch, X, Circle } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { createEstimate, updateEstimate } from '../../services/estimates'
import { uploadAttachment } from '../../services/attachments'
import { createClient } from '../../services/clients'
import { draftEstimateFromWizard } from '../../services/wizard'

type ProgressStep = {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

export function WizardGenerating() {
  const {
    organizationId, clientId, newClientName, newClientEmail, newClientPhone,
    zipCode, photoFiles, videoFile, description, qaPairs, reset,
  } = useWizardStore()

  const navigate = useNavigate()
  const hasRun = useRef(false)

  const [steps, setSteps] = useState<ProgressStep[]>([
    { label: 'Reviewed job description', status: 'pending' },
    { label: 'Uploading photos', status: 'pending' },
    { label: 'Writing line items…', status: 'pending' },
    { label: `Applying ${zipCode || 'regional'} labor rates`, status: 'pending' },
  ])
  const [error, setError] = useState<string | null>(null)

  function updateStep(index: number, status: ProgressStep['status']) {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, status } : s))
  }

  async function run() {
    if (!organizationId) {
      setError('Organization not found. Please reload and try again.')
      return
    }

    try {
      updateStep(0, 'running')
      const estimate = await createEstimate(organizationId)

      let resolvedClientId = clientId
      if (!resolvedClientId && newClientName.trim()) {
        const created = await createClient({
          organization_id: organizationId,
          name: newClientName.trim(),
          email: newClientEmail || null,
          phone: newClientPhone || null,
        })
        resolvedClientId = created.id
      }

      if (resolvedClientId) {
        await updateEstimate(estimate.id, { client_id: resolvedClientId })
      }

      updateStep(0, 'done')

      updateStep(1, 'running')
      const attachmentIds: string[] = []

      for (const file of photoFiles) {
        const att = await uploadAttachment({
          file,
          organization_id: organizationId,
          estimate_id: estimate.id,
        })
        attachmentIds.push(att.id)
      }

      if (videoFile) {
        const att = await uploadAttachment({
          file: videoFile,
          organization_id: organizationId,
          estimate_id: estimate.id,
        })
        attachmentIds.push(att.id)
      }

      updateStep(1, 'done')

      updateStep(2, 'running')
      updateStep(3, 'running')

      await draftEstimateFromWizard({
        estimateId: estimate.id,
        description,
        ...(zipCode ? { zipCode } : {}),
        qaPairs,
        attachmentIds,
      })

      updateStep(2, 'done')
      updateStep(3, 'done')

      reset()
      navigate(`/estimates/${estimate.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      setSteps((prev) => prev.map((s) =>
        s.status === 'running' ? { ...s, status: 'error' } : s
      ))
    }
  }

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const statusIcon = (status: ProgressStep['status']) => {
    if (status === 'done') return <CheckCircle size={16} weight="fill" className="text-green-500" />
    if (status === 'running') return <CircleNotch size={16} className="text-orange-500 animate-spin" />
    if (status === 'error') return <X size={16} weight="bold" className="text-red-500" />
    return <Circle size={16} className="text-stone-300" />
  }

  const statusColor = (status: ProgressStep['status']) => {
    if (status === 'done') return 'text-green-600'
    if (status === 'running') return 'text-orange-600'
    if (status === 'error') return 'text-red-600'
    return 'text-stone-400'
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-5">
          <Robot size={36} weight="fill" className="text-orange-500" />
        </div>

        <h1 className="text-xl font-bold text-stone-900 mb-2 tracking-tight">Drafting your estimate…</h1>
        <p className="text-stone-400 text-sm leading-relaxed mb-6">
          {photoFiles.length > 0 && `Analyzing ${photoFiles.length} photo${photoFiles.length > 1 ? 's' : ''} + `}
          your description
          {zipCode && ` · Factoring in zip ${zipCode} rates`}
        </p>

        <div className="text-left space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm ${statusColor(s.status)}`}>
              {statusIcon(s.status)}
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Something went wrong</p>
            <p className="mb-3">{error}</p>
            <button
              onClick={() => navigate('/estimates/wizard')}
              className="text-sm text-red-600 underline"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/wizard/WizardGenerating.tsx
git commit -m "feat(ui): update WizardGenerating with Phosphor icons and warm palette"
```

---

### Task 10: Update Wizard Shell and Steps

**Files:**
- Modify: `src/components/wizard/WizardShell.tsx`
- Modify: `src/components/wizard/WizardStep1Client.tsx`
- Modify: `src/components/wizard/WizardStep3Capture.tsx`

- [ ] **Step 1: Replace `WizardShell.tsx`**

```tsx
import type { ReactNode } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'

interface WizardShellProps {
  step: number
  totalSteps?: number
  title: string
  subtitle?: string
  onBack?: () => void
  onSkip?: () => void
  skipLabel?: string
  children: ReactNode
}

export function WizardShell({
  step,
  totalSteps = 5,
  title,
  subtitle,
  onBack,
  onSkip,
  skipLabel = 'Skip',
  children,
}: WizardShellProps) {
  const progress = (step / totalSteps) * 100
  const isLastStep = step === totalSteps
  const barColor = isLastStep ? 'bg-amber-400' : 'bg-orange-500'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm w-14 disabled:opacity-0"
          disabled={!onBack}
        >
          {onBack && <><ArrowLeft size={14} weight="bold" /> Back</>}
        </button>
        <span className="font-semibold text-sm text-stone-900">New Estimate</span>
        <button
          onClick={onSkip}
          className="text-orange-500 hover:text-orange-600 text-sm w-14 text-right font-medium"
          disabled={!onSkip}
          style={{ visibility: onSkip ? 'visible' : 'hidden' }}
        >
          {skipLabel}
        </button>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <div className="h-1.5 bg-stone-100 rounded-full mb-5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="text-xl font-extrabold text-stone-900 mb-1 tracking-tight">{title}</h1>
        {subtitle && <p className="text-stone-500 text-sm mb-5">{subtitle}</p>}

        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `WizardStep1Client.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { listClients, createClient, type ClientRow } from '../../services/clients'
import { WizardShell } from './WizardShell'

export function WizardStep1Client() {
  const { setStep, setClientId, setNewClientFields, newClientName, newClientEmail,
    newClientPhone, clientId, organizationId } = useWizardStore()

  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    listClients()
      .then((rows) => setClients(rows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const canContinue = clientId !== null || newClientName.trim().length > 0

  async function handleContinue() {
    setSaveError(null)
    if (newClientName.trim() && !clientId) {
      if (!organizationId) {
        setSaveError('Organization not loaded yet. Please wait a moment and try again.')
        return
      }
      setSaving(true)
      try {
        const created = await createClient({
          organization_id: organizationId,
          name: newClientName.trim(),
          email: newClientEmail || null,
          phone: newClientPhone || null,
        })
        setClientId(created.id)
      } catch (err) {
        setSaving(false)
        setSaveError(err instanceof Error ? err.message : 'Failed to create client. Try again.')
        return
      }
      setSaving(false)
    }
    setStep(2)
  }

  const initials = (name: string) =>
    name.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <WizardShell
      step={1}
      title="Who's the client?"
      subtitle="Step 1 of 5"
      onSkip={() => setStep(2)}
    >
      <div className="relative mb-3">
        <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Search clients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!loading && (
        <div className="border border-stone-200 rounded-lg overflow-hidden mb-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { setClientId(c.id); setShowNewForm(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-stone-100 last:border-0 hover:bg-stone-50 ${
                clientId === c.id ? 'bg-orange-50' : ''
              }`}
            >
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">
                {initials(c.name)}
              </div>
              <div>
                <div className="font-medium text-sm text-stone-900">{c.name}</div>
                {c.email && <div className="text-stone-500 text-xs">{c.email}</div>}
              </div>
            </button>
          ))}

          <button
            onClick={() => { setShowNewForm(true); setClientId(null) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-orange-600 hover:bg-stone-50"
          >
            <Plus size={16} weight="bold" />
            <span className="text-sm font-semibold">New client</span>
          </button>
        </div>
      )}

      {showNewForm && (
        <div className="border border-orange-200 rounded-lg p-3 mb-4 bg-orange-50 space-y-2">
          <input
            type="text"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            placeholder="Full name *"
            value={newClientName}
            onChange={(e) => setNewClientFields({ name: e.target.value })}
          />
          <input
            type="email"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            placeholder="Email (optional)"
            value={newClientEmail}
            onChange={(e) => setNewClientFields({ email: e.target.value })}
          />
          <input
            type="tel"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            placeholder="Phone (optional)"
            value={newClientPhone}
            onChange={(e) => setNewClientFields({ phone: e.target.value })}
          />
        </div>
      )}

      {saveError && (
        <p className="text-red-500 text-sm mb-3">{saveError}</p>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue || saving}
        className="w-full bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40 shadow-sm"
      >
        Continue
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 3: Replace `WizardStep3Capture.tsx`**

```tsx
import { useRef, useMemo, useEffect } from 'react'
import { Camera, Images, FilmSlate, X, Plus } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { WizardShell } from './WizardShell'

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/gif'
const ACCEPTED_VIDEO = 'video/mp4,video/quicktime,video/webm'

export function WizardStep3Capture() {
  const { photoFiles, videoFile, addPhotoFile, removePhotoFile, setVideoFile, setStep } = useWizardStore()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((f) => addPhotoFile(f))
  }

  const thumbnails = useMemo(
    () => photoFiles.map((f) => URL.createObjectURL(f)),
    [photoFiles]
  )

  useEffect(() => {
    return () => {
      thumbnails.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [thumbnails])

  return (
    <WizardShell
      step={3}
      title="Capture the job"
      subtitle="Step 3 of 5 · Photos help AI understand the scope"
      onBack={() => setStep(2)}
      onSkip={() => setStep(4)}
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        {thumbnails.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhotoFile(i)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
        ))}

        {videoFile && (
          <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-200 flex items-center justify-center">
            <FilmSlate size={28} weight="fill" className="text-stone-500" />
            <button
              onClick={() => setVideoFile(null)}
              className="absolute top-1 right-1 bg-black/40 text-white rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X size={10} weight="bold" />
            </button>
          </div>
        )}

        {photoFiles.length < 10 && (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 hover:border-orange-300 hover:text-orange-400"
          >
            <Plus size={24} weight="bold" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          <Camera size={15} weight="fill" /> Camera
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
        >
          <Images size={15} weight="fill" /> Library
        </button>
        <button
          onClick={() => videoInputRef.current?.click()}
          disabled={!!videoFile}
          className="flex items-center justify-center gap-1.5 border border-stone-200 rounded-lg py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
        >
          <FilmSlate size={15} weight="fill" /> Video
        </button>
      </div>

      <input ref={photoInputRef} type="file" accept={ACCEPTED_IMAGES} multiple className="hidden" onChange={(e) => handlePhotoFiles(e.target.files)} />
      <input ref={cameraInputRef} type="file" accept={ACCEPTED_IMAGES} capture="environment" className="hidden" onChange={(e) => handlePhotoFiles(e.target.files)} />
      <input ref={videoInputRef} type="file" accept={ACCEPTED_VIDEO} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f) }} />

      <button
        onClick={() => setStep(4)}
        className="w-full bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg py-2.5 font-semibold text-sm shadow-sm"
      >
        Continue
      </button>
    </WizardShell>
  )
}
```

- [ ] **Step 4: Type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/wizard/WizardShell.tsx src/components/wizard/WizardStep1Client.tsx src/components/wizard/WizardStep3Capture.tsx
git commit -m "feat(ui): update wizard with Phosphor icons, orange palette, and improved layout"
```

---

### Task 11: Update Auth and Onboarding pages

**Files:**
- Modify: `src/pages/AuthPage.tsx`
- Modify: `src/pages/OnboardingPage.tsx`

- [ ] **Step 1: Replace `AuthPage.tsx`**

```tsx
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import LogoBadge from '../components/ui/LogoBadge'

/**
 * /auth page — sign in / sign up form using Supabase Auth UI.
 * D-01: Uses @supabase/auth-ui-react with ThemeSupa (archived upstream; locked decision).
 * D-02: Sign-in and sign-up toggle is handled internally by the Auth component.
 * D-03: Only email+password auth — providers={[]} hides all OAuth buttons.
 *
 * If the user already has a session, redirects to /auth/callback to
 * determine the correct landing page (/dashboard or /onboarding).
 */
export default function AuthPage() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/auth/callback" replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-stone-200 p-8">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <LogoBadge size={32} />
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight">EstimateFlow</span>
        </div>
        <p className="text-sm text-stone-500 text-center mb-8 leading-[1.5]">
          Professional estimates in minutes.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: { brand: '#ea580c', brandAccent: '#c2410c' },
                radii: { borderRadiusButton: '8px', inputBorderRadius: '8px' },
              },
            },
          }}
          providers={[]}
          redirectTo={`${window.location.origin}/auth/callback`}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `OnboardingPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrganization } from '../services/organizations'
import { useAuth } from '../hooks/useAuth'
import LogoBadge from '../components/ui/LogoBadge'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const trimmed = name.trim()
  const showRequiredError = submitted && trimmed.length === 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)
    if (trimmed.length === 0) return
    if (!session) return

    setSubmitting(true)
    try {
      await createOrganization(trimmed)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't create your workspace. Please try again."
      setServerError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-stone-200 p-8"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <LogoBadge size={28} />
          <span className="text-lg font-extrabold text-stone-900 tracking-tight">EstimateFlow</span>
        </div>

        <h1 className="text-xl font-bold text-stone-900 leading-[1.3] mb-2">
          Set up your workspace
        </h1>
        <p className="text-sm text-stone-500 leading-[1.5] mb-8">
          Your company name will appear on all estimates you send.
        </p>

        <label htmlFor="company-name" className="block text-sm font-semibold text-stone-700 mb-1">
          Company name
        </label>
        <input
          id="company-name"
          name="company-name"
          type="text"
          autoFocus
          autoComplete="organization"
          placeholder="e.g. Apex Roofing Co."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          maxLength={120}
          aria-invalid={showRequiredError || serverError !== null}
          aria-describedby={showRequiredError ? 'company-name-error' : serverError ? 'company-name-server-error' : undefined}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 ${showRequiredError ? 'border-red-500' : 'border-stone-200'}`}
        />
        {showRequiredError && (
          <p id="company-name-error" className="mt-1 text-sm text-red-600">
            Company name is required.
          </p>
        )}
        {serverError && !showRequiredError && (
          <p id="company-name-server-error" className="mt-1 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait"
        >
          {submitting ? 'Creating...' : 'Create workspace'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/AuthPage.tsx src/pages/OnboardingPage.tsx
git commit -m "feat(ui): update Auth and Onboarding pages with logo badge and warm palette"
```

---

### Task 12: Final build verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: build completes with no errors. Check that `@phosphor-icons/react` is tree-shaken (only imported icons ship) — Vite handles this automatically via ESM imports.

- [ ] **Step 2: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:5173` and check:
- **Auth page**: Logo badge + wordmark visible, orange Supabase auth buttons
- **Onboarding**: Logo badge, orange submit button
- **Dashboard**: Stat cards (Drafts/Sent/Approved), orange estimate numbers, Phosphor sort arrows, DotsThreeVertical actions menu, orange gradient "New Estimate" button
- **Estimate Editor**: DotsSixVertical drag handles, Sparkle AI badge, CheckCircle save indicator, orange gradient Send button, orange Total in sticky bar
- **Wizard Step 1**: MagnifyingGlass search, orange gradient avatar initials, orange Continue button
- **Wizard Step 3**: Camera/Images/FilmSlate upload buttons, X remove buttons, orange Continue button
- **Wizard Generating**: Robot icon (orange), CircleNotch spinner, CheckCircle done states

- [ ] **Step 3: Commit**

No new changes needed — this is a verification step. If anything looks off, fix it and commit with `fix(ui): ...`.
