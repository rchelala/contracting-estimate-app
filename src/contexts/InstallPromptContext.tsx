import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

interface InstallPromptState {
  canInstall: boolean
  isIOS: boolean
  isStandalone: boolean
  isDismissed: boolean
  trigger: () => Promise<void>
  dismiss: () => void
}

const InstallPromptContext = createContext<InstallPromptState | null>(null)

// Export context object so tests can inject mock values directly
export { InstallPromptContext }

function detectIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window)
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS] = useState(detectIOS)
  const [isStandalone] = useState(detectStandalone)
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const canInstall = !isStandalone && (deferredPrompt !== null || isIOS)

  const trigger = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // private browsing — ignore
    }
    setIsDismissed(true)
  }, [])

  return (
    <InstallPromptContext.Provider value={{ canInstall, isIOS, isStandalone, isDismissed, trigger, dismiss }}>
      {children}
    </InstallPromptContext.Provider>
  )
}

export function useInstallPrompt(): InstallPromptState {
  const ctx = useContext(InstallPromptContext)
  if (!ctx) throw new Error('useInstallPrompt must be used within InstallPromptProvider')
  return ctx
}
