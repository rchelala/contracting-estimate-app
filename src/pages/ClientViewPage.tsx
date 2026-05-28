import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCents, lineItemTotal } from '../utils/money'
import StatusBadge from '../components/ui/StatusBadge'
import { submitApproval } from '../services/estimates'
import type { EstimateStatus } from '../services/estimates'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price_cents: number
  markup_pct: number
  position: number
  billable: boolean
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
  approved_by_name: string | null
  organizations: { name: string } | null
  estimate_sections: Section[]
}

export default function ClientViewPage() {
  const { token } = useParams<{ token: string }>()
  const [estimate, setEstimate] = useState<ClientEstimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    supabase
      .from('estimates')
      .select(`
        id, estimate_number, title, total_cents, subtotal_cents, tax_cents,
        status, sent_at, public_token, approved_by_name,
        organizations ( name ),
        estimate_sections (
          id, name, position,
          estimate_line_items ( id, description, quantity, unit_price_cents, markup_pct, position, billable )
        )
      `)
      .eq('public_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          const est = data as ClientEstimate
          setEstimate(est)
          if (est.status === 'approved') setResult('approved')
          else if (est.status === 'rejected') setResult('rejected')
        }
        setLoading(false)
      })
  }, [token])

  async function handleAction(action: 'approve' | 'reject') {
    if (!token || !name.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await submitApproval(token, name.trim(), action, message.trim() || undefined)
      setResult(res.status)
    } catch {
      setSubmitError('Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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
          const items = [...section.estimate_line_items]
            .filter((item) => item.billable)
            .sort((a, b) => a.position - b.position)
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

        {/* Approval form — shown only when estimate is sent and not yet actioned */}
        {estimate.status === 'sent' && !result && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Your Response</p>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="approval-name">
                Your name <span className="text-red-500">*</span>
              </label>
              <input
                id="approval-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                placeholder="Jane Smith"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1" htmlFor="approval-message">
                Message to contractor <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="approval-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="Looks great, please proceed."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 resize-none"
              />
            </div>
            {submitError && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleAction('approve')}
                disabled={!name.trim() || submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {submitting ? 'Submitting…' : 'Approve Estimate'}
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={!name.trim() || submitting}
                className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Reject Estimate
              </button>
            </div>
          </div>
        )}

        {/* Confirmation banner — shown after action or if already actioned */}
        {result === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800">Estimate approved</p>
            <p className="text-xs text-green-700 mt-1">{orgName} has been notified.</p>
          </div>
        )}
        {result === 'rejected' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">Estimate declined</p>
            <p className="text-xs text-amber-700 mt-1">{orgName} has been notified.</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 pb-4">Powered by EstimateFlow</p>
      </div>
    </div>
  )
}
