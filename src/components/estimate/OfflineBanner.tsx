import { useState } from 'react'
import { WifiSlash, X } from '@phosphor-icons/react'

export default function OfflineBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm h-10 flex items-center justify-between px-6">
      <span className="flex items-center gap-2">
        <WifiSlash size={15} weight="fill" />
        You're offline — changes are saved locally and will sync when you reconnect.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-amber-600 hover:text-amber-800"
        onClick={() => setDismissed(true)}
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}
