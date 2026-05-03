import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNav from '../components/layout/TopNav'
import StatusBadge from '../components/ui/StatusBadge'
import { listEstimates, type EstimateListRow } from '../services/estimates'
import { getMyMembership } from '../services/organizations'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCents } from '../utils/money'
import { formatRelativeDate } from '../utils/dates'

type SortKey = 'estimate_number' | 'status' | 'total_cents' | 'updated_at'
type SortDir = 'asc' | 'desc'

function NewEstimateButton({ extraClass = '' }: { extraClass?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate('/estimates/new')}
      className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md px-4 py-2 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2 ${extraClass}`}
    >
      New Estimate
    </button>
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

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="px-6 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-[1.3]">Estimates</h1>
            {orgName && <p className="mt-1 text-sm text-slate-500">{orgName}</p>}
          </div>
          <NewEstimateButton />
        </div>

        <div className="mt-6">
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
              <h2 className="text-xl font-semibold text-slate-900">Couldn't load your estimates</h2>
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
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/estimates/${r.id}`)}
                    className="bg-white border-t border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="text-sm text-slate-900 py-2 px-4">{r.estimate_number}</td>
                    <td className="text-sm text-slate-900 py-2 px-4">{r.client_name ?? '—'}</td>
                    <td className="text-sm text-slate-900 py-2 px-4">{r.title ?? '—'}</td>
                    <td className="text-sm text-slate-900 py-2 px-4"><StatusBadge status={r.status} /></td>
                    <td className="text-sm text-slate-900 py-2 px-4 text-right">{formatCents(r.total_cents)}</td>
                    <td className="text-sm text-slate-500 py-2 px-4">{formatRelativeDate(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
