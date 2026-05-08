import { useState } from 'react'
import Modal from '../ui/Modal'
import { sendEstimate } from '../../services/estimates'
import { useEditorStore } from '../../stores/editorStore'
import { formatCents } from '../../utils/money'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SendEstimateModal({ open, onClose }: Props) {
  const estimate = useEditorStore((s) => s.estimate)
  const replaceEstimateTotals = useEditorStore((s) => s.replaceEstimateTotals)
  const setReadOnly = useEditorStore((s) => s.setReadOnly)

  const defaultSubject = estimate
    ? `Estimate #${estimate.estimate_number}${estimate.title ? ` – ${estimate.title}` : ''}`
    : ''

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!estimate) return null

  const canSubmit = to.trim().length > 0 && subject.trim().length > 0

  async function handleSend() {
    if (!estimate || !canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await sendEstimate(estimate.id, to.trim(), subject.trim(), message.trim())
      replaceEstimateTotals({ ...estimate, status: 'sent' })
      setReadOnly(true)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send estimate')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Estimate"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            className="border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-md hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !canSubmit}
            className="bg-orange-500 text-white text-sm font-semibold px-3 py-2 rounded-md hover:bg-orange-600 disabled:opacity-60"
            onClick={() => { void handleSend() }}
          >
            {submitting ? 'Sending…' : 'Send Estimate'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-slate-500">
          #{estimate.estimate_number}
          {estimate.title && ` · ${estimate.title}`}
          {estimate.total_cents != null && ` · ${formatCents(estimate.total_cents)}`}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            To
          </label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="client@example.com"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Message <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Add a personal note to the client…"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}
        <p className="text-xs text-slate-400">Client will receive a link to view the full estimate.</p>
      </div>
    </Modal>
  )
}
