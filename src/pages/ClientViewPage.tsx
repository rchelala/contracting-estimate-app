import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCents, lineItemTotal } from '../utils/money'
import StatusBadge from '../components/ui/StatusBadge'
import type { EstimateStatus } from '../services/estimates'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price_cents: number
  markup_pct: number
  position: number
}

interface Section {
  id: string
  name: string
  position: number
  estimate_line_items: LineItem[]
}

interface ClientEstimate {
  id: string
  estimate_number: string
  title: string | null
  total_cents: number
  subtotal_cents: number
  tax_cents: number
  status: EstimateStatus
  sent_at: string | null
  public_token: string
  organizations: { name: string } | null
  estimate_sections: Section[]
}

export default function ClientViewPage() {
  const { token } = useParams<{ token: string }>()
  const [estimate, setEstimate] = useState<ClientEstimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    supabase
      .from('estimates')
      .select(`
        id, estimate_number, title, total_cents, subtotal_cents, tax_cents,
        status, sent_at, public_token,
        organizations ( name ),
        estimate_sections (
          id, name, position,
          estimate_line_items ( id, description, quantity, unit_price_cents, markup_pct, position )
        )
      `)
      .eq('public_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setEstimate(data as ClientEstimate)
        }
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading estimate…</p>
      </div>
    )
  }

  if (notFound || !estimate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Estimate not found.</p>
      </div>
    )
  }

  const orgName = estimate.organizations?.name ?? 'Your contractor'
  const sections = [...estimate.estimate_sections].sort((a, b) => a.position - b.position)

  const sentDate = estimate.sent_at
    ? new Date(estimate.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gray-900 px-5 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-sm">⚡ EstimateFlow</span>
        <StatusBadge status={estimate.status} />
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Estimate from</p>
          <p className="text-lg font-bold text-slate-900">{orgName}</p>
          {sentDate && <p className="text-xs text-slate-400 mt-1">Sent {sentDate}</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-base font-bold text-slate-900">{estimate.title ?? 'Estimate'}</p>
          <p className="text-xs text-slate-400">Estimate #{estimate.estimate_number}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-2xl font-extrabold text-slate-900">
              {formatCents(estimate.total_cents)}
            </span>
          </div>
        </div>

        {sections.map((section) => {
          const items = [...section.estimate_line_items].sort((a, b) => a.position - b.position)
          return (
            <div key={section.id} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                {section.name}
              </p>
              <div className="space-y-2">
                {items.map((item) => {
                  const total = lineItemTotal(item.quantity, item.unit_price_cents, item.markup_pct)
                  return (
                    <div key={item.id} className="flex justify-between items-start">
                      <span className="text-sm text-slate-600 flex-1 pr-4">{item.description}</span>
                      <span className="text-sm font-medium text-slate-900 shrink-0">
                        {formatCents(total)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {(estimate.subtotal_cents !== estimate.total_cents || estimate.tax_cents > 0) && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span>{formatCents(estimate.subtotal_cents)}</span>
            </div>
            {estimate.tax_cents > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span>
                <span>{formatCents(estimate.tax_cents)}</span>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-300 pb-4">Powered by EstimateFlow</p>
      </div>
    </div>
  )
}
