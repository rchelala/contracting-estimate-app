import { useState } from 'react'

export default function OfflineBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm h-10 flex items-center justify-between px-6">
      <span>You're offline — changes are saved locally and will sync when you reconnect.</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-amber-600 hover:text-amber-800"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
    </div>
  )
}
