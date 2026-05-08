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
