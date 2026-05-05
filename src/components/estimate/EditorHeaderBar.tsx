import { useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import ClientDropdown from './ClientDropdown'
import SaveIndicator from './SaveIndicator'
import StatusBadge from '../ui/StatusBadge'
import Modal from '../ui/Modal'
import { draftEstimate } from '../../services/ai'

interface Props {
  onSendClick?: () => void
}

export default function EditorHeaderBar({ onSendClick }: Props) {
  const estimate = useEditorStore((s) => s.estimate)
  const readOnly = useEditorStore((s) => s.readOnly)
  const setEstimateField = useEditorStore((s) => s.setEstimateField)
  const enqueue = useSyncQueue((s) => s.enqueue)
  const hydrate = useEditorStore((s) => s.hydrate)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiDescription, setAiDescription] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

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

  async function handleAiDraft() {
    if (!estimate || !aiDescription.trim()) return
    setAiLoading(true)
    try {
      const fullEstimate = await draftEstimate(estimate.id, aiDescription.trim())
      hydrate(fullEstimate)
      setAiModalOpen(false)
      setAiDescription('')
      // The store will update via the sync queue when the draft is inserted
    } catch (error) {
      console.error('AI draft failed:', error)
      // TODO: show error toast
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <header className="flex items-center h-14 px-6 bg-white border-b border-slate-200">
      <ClientDropdown readOnly={readOnly} />
      <input
        type="text"
        placeholder="Untitled estimate"
        maxLength={200}
        disabled={readOnly}
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        className="flex-1 text-base font-semibold text-slate-900 border-0 bg-transparent mx-4 focus:outline-none focus:ring-0 placeholder:text-slate-400 disabled:cursor-not-allowed"
      />
      {readOnly ? <StatusBadge status="sent" /> : <SaveIndicator />}
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setAiModalOpen(true)}
        className="bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-purple-700 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
      >
        ✨ AI Draft
      </button>
      <button
        type="button"
        disabled={readOnly}
        data-testid="send-button"
        onClick={onSendClick}
        className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send →
      </button>
      <Modal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title="AI Estimate Draft"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAiModalOpen(false)}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!aiDescription.trim() || aiLoading}
              onClick={handleAiDraft}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? 'Drafting...' : 'Generate Draft'}
            </button>
          </>
        }
      >
        <label htmlFor="ai-description" className="block text-sm font-medium text-slate-700 mb-2">
          Describe your project
        </label>
        <textarea
          id="ai-description"
          rows={4}
          placeholder="E.g., Kitchen remodel with granite countertops, new cabinets, and stainless steel appliances..."
          value={aiDescription}
          onChange={(e) => setAiDescription(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
        <p className="text-xs text-slate-500 mt-2">
          AI will suggest sections and line items based on your description. You can review and edit everything before sending.
        </p>
      </Modal>
    </header>
  )
}
