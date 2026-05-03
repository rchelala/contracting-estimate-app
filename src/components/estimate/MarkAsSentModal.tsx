import { useState } from 'react'
import Modal from '../ui/Modal'
import { markEstimateSent } from '../../services/estimates'
import { useEditorStore } from '../../stores/editorStore'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MarkAsSentModal({ open, onClose }: Props) {
  const estimate = useEditorStore((s) => s.estimate)
  const replaceEstimateTotals = useEditorStore((s) => s.replaceEstimateTotals)
  const setReadOnly = useEditorStore((s) => s.setReadOnly)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!estimate) return null

  async function handleConfirm() {
    if (!estimate) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await markEstimateSent(estimate.id)
      replaceEstimateTotals(updated)
      setReadOnly(true)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark as sent')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Mark ${estimate.estimate_number} as sent?`}
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
            disabled={submitting}
            className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
            onClick={() => { void handleConfirm() }}
          >
            Mark as Sent
          </button>
        </>
      }
    >
      <div>
        <p>You won&apos;t be able to edit it after this.</p>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>
    </Modal>
  )
}
