import { useSyncQueue } from '../../stores/syncQueueStore'

export default function SaveIndicator() {
  const status = useSyncQueue((s) => s.status)
  const lastError = useSyncQueue((s) => s.lastError)
  const setStatus = useSyncQueue((s) => s.setStatus)

  switch (status) {
    case 'saving':
      return <span className="text-slate-400 text-xs mr-4">Saving...</span>
    case 'saved':
      return <span className="text-blue-600 text-xs font-semibold mr-4">Saved ✓</span>
    case 'queued':
      return <span className="text-amber-600 text-xs mr-4">Queued</span>
    case 'error':
      return (
        <span className="text-red-600 text-xs mr-4">
          Failed to save ·{' '}
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
