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
        data-testid="send-button"
        onClick={onSendClick}
        className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send →
      </button>
    </header>
  )
}
