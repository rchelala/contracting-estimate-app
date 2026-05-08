import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PaperPlaneTilt } from '@phosphor-icons/react'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import ClientDropdown from './ClientDropdown'
import SaveIndicator from './SaveIndicator'
import StatusBadge from '../ui/StatusBadge'

interface Props {
  onSendClick?: () => void
}

export default function EditorHeaderBar({ onSendClick }: Props) {
  const navigate = useNavigate()
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
    <header className="flex flex-wrap sm:flex-nowrap bg-white border-b border-stone-200">
      {/* Back button — order 1 on both mobile and desktop */}
      <div className="flex items-center h-12 sm:h-14 pl-4 pr-2 sm:pr-0 order-1">
        <button
          type="button"
          aria-label="Back to estimates"
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 shrink-0"
        >
          <ArrowLeft size={18} weight="bold" />
        </button>
      </div>

      {/* Title input — order 2 on mobile (row 1), order 3 on desktop */}
      <div className="flex items-center h-12 sm:h-14 flex-1 min-w-0 order-2 sm:order-3 px-2">
        <input
          type="text"
          placeholder="Untitled estimate"
          maxLength={200}
          disabled={readOnly}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="flex-1 text-base font-semibold text-stone-900 border-0 bg-transparent focus:outline-none focus:ring-0 placeholder:text-stone-400 disabled:cursor-not-allowed"
        />
      </div>

      {/* Save indicator / status badge — order 3 on mobile (row 1), order 4 on desktop */}
      <div className="flex items-center h-12 sm:h-14 order-3 sm:order-4 pr-4 sm:pr-0">
        {readOnly ? <StatusBadge status="sent" /> : <SaveIndicator />}
      </div>

      {/* Full-width separator — forces row break between row 1 and row 2 on mobile; hidden on desktop */}
      <div className="w-full sm:hidden order-4 border-t border-stone-100" />

      {/* Client dropdown — order 5 on mobile (row 2), order 2 on desktop */}
      <div className="flex items-center h-11 sm:h-14 flex-1 min-w-0 order-5 sm:order-2 pl-4 sm:pl-3 pr-2">
        <ClientDropdown readOnly={readOnly} />
      </div>

      {/* Send button — order 6 on mobile (row 2), order 5 on desktop */}
      <div className="flex items-center h-11 sm:h-14 order-6 sm:order-5 pr-4">
        <button
          type="button"
          disabled={readOnly}
          data-testid="send-button"
          onClick={onSendClick}
          className="flex items-center gap-2 bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
          <PaperPlaneTilt size={14} weight="fill" />
        </button>
      </div>
    </header>
  )
}
