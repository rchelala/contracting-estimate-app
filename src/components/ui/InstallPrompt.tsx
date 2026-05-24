import { useState } from 'react'
import { DeviceMobile, X } from '@phosphor-icons/react'
import { useInstallPrompt } from '../../contexts/InstallPromptContext'
import IOSInstallModal from './IOSInstallModal'

export default function InstallPrompt() {
  const { canInstall, isIOS, isDismissed, trigger, dismiss } = useInstallPrompt()
  const [showModal, setShowModal] = useState(false)

  if (!canInstall || isDismissed) return null

  async function handleInstall() {
    if (isIOS) {
      setShowModal(true)
    } else {
      await trigger()
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-orange-500/30 transition-colors"
        >
          <DeviceMobile size={16} weight="fill" />
          Install App
        </button>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-400 hover:text-stone-600 shadow-sm transition-colors"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
      <IOSInstallModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
