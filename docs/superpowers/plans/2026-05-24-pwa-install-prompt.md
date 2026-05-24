# PWA Install Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating "Install App" pill button and a Settings page row so contractors can install EstimateFlow to their phone home screen — Android gets the native Chrome prompt, iOS gets a 4-step instruction modal.

**Architecture:** A React context (`InstallPromptContext`) captures the Android `beforeinstallprompt` event once and shares install state across the tree. Two consumers use `useInstallPrompt()`: the floating `InstallPrompt` button (auto-shown, dismissible) and the Settings page row (always visible). iOS instructions live in a shared `IOSInstallModal` component that wraps the existing `Modal`.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS, Phosphor Icons, Vitest + Testing Library

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/contexts/InstallPromptContext.tsx` | Captures browser install event, detects iOS/standalone, exposes shared state |
| Create | `src/components/ui/IOSInstallModal.tsx` | 4-step iOS instruction modal, wraps existing `Modal` |
| Create | `src/components/ui/InstallPrompt.tsx` | Floating pill button, shown to unauthenticated users only |
| Modify | `src/components/RequireAuth.tsx` | Wrap outlet with provider + render `<InstallPrompt />` |
| Modify | `src/pages/SettingsPage.tsx` | Add "App" section with install row |
| Create | `src/contexts/InstallPromptContext.test.tsx` | Context logic tests |
| Create | `src/components/ui/IOSInstallModal.test.tsx` | Modal render tests |
| Create | `src/components/ui/InstallPrompt.test.tsx` | Floating button behaviour tests |

---

## Task 1: InstallPromptContext

**Files:**
- Create: `src/contexts/InstallPromptContext.tsx`
- Create: `src/contexts/InstallPromptContext.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/contexts/InstallPromptContext.test.tsx
import { render, screen, act, fireEvent } from '@testing-library/react'
import { InstallPromptProvider, useInstallPrompt } from './InstallPromptContext'

// jsdom doesn't implement matchMedia — stub it
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('standalone') ? false : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  })
  localStorage.clear()
})

function TestConsumer() {
  const { canInstall, isIOS, isStandalone, isDismissed, dismiss } = useInstallPrompt()
  return (
    <div>
      <span data-testid="canInstall">{String(canInstall)}</span>
      <span data-testid="isIOS">{String(isIOS)}</span>
      <span data-testid="isStandalone">{String(isStandalone)}</span>
      <span data-testid="isDismissed">{String(isDismissed)}</span>
      <button onClick={dismiss}>dismiss</button>
    </div>
  )
}

test('canInstall is false with no prompt and non-iOS', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  expect(screen.getByTestId('canInstall').textContent).toBe('false')
})

test('canInstall becomes true when beforeinstallprompt fires', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  act(() => {
    const event = new Event('beforeinstallprompt')
    ;(event as any).prompt = vi.fn().mockResolvedValue(undefined)
    window.dispatchEvent(event)
  })
  expect(screen.getByTestId('canInstall').textContent).toBe('true')
})

test('dismiss sets isDismissed and writes localStorage', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  fireEvent.click(screen.getByText('dismiss'))
  expect(screen.getByTestId('isDismissed').textContent).toBe('true')
  expect(localStorage.getItem('pwa-install-dismissed')).toBe('true')
})

test('isDismissed reads from localStorage on mount', () => {
  localStorage.setItem('pwa-install-dismissed', 'true')
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  expect(screen.getByTestId('isDismissed').textContent).toBe('true')
})

test('isStandalone is false in jsdom', () => {
  render(<InstallPromptProvider><TestConsumer /></InstallPromptProvider>)
  expect(screen.getByTestId('isStandalone').textContent).toBe('false')
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/contexts/InstallPromptContext.test.tsx
```

Expected: `Cannot find module './InstallPromptContext'`

- [ ] **Step 3: Implement the context**

```tsx
// src/contexts/InstallPromptContext.tsx
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/contexts/InstallPromptContext.test.tsx
```

Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/contexts/InstallPromptContext.tsx src/contexts/InstallPromptContext.test.tsx
git commit -m "feat: add InstallPromptContext for PWA install state"
```

---

## Task 2: IOSInstallModal component

**Files:**
- Create: `src/components/ui/IOSInstallModal.tsx`
- Create: `src/components/ui/IOSInstallModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/ui/IOSInstallModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import IOSInstallModal from './IOSInstallModal'

test('renders nothing when closed', () => {
  render(<IOSInstallModal open={false} onClose={vi.fn()} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('renders 4 steps when open', () => {
  render(<IOSInstallModal open={true} onClose={vi.fn()} />)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByText(/Tap "\.\.\."/)).toBeInTheDocument()
  expect(screen.getByText(/Tap "Share"/)).toBeInTheDocument()
  expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument()
  expect(screen.getByText(/Tap "Add"/)).toBeInTheDocument()
})

test('calls onClose when Got it is clicked', () => {
  const onClose = vi.fn()
  render(<IOSInstallModal open={true} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: /got it/i }))
  expect(onClose).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/ui/IOSInstallModal.test.tsx
```

Expected: `Cannot find module './IOSInstallModal'`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/ui/IOSInstallModal.tsx
import Modal from './Modal'

interface Props {
  open: boolean
  onClose: () => void
}

const STEPS = [
  'Tap "..." at the bottom of Safari to open the menu',
  'Tap "Share" ⬆️',
  'Scroll down and tap "Add to Home Screen"',
  'Tap "Add" in the top right corner',
]

export default function IOSInstallModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to Home Screen"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          Got it
        </button>
      }
    >
      <p className="text-xs text-slate-500 mb-4">Follow these steps in Safari</p>
      <ol className="flex flex-col gap-3 list-none p-0 m-0">
        {STEPS.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/components/ui/IOSInstallModal.test.tsx
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/IOSInstallModal.tsx src/components/ui/IOSInstallModal.test.tsx
git commit -m "feat: add IOSInstallModal with 4-step Safari instructions"
```

---

## Task 3: InstallPrompt floating button

**Files:**
- Create: `src/components/ui/InstallPrompt.tsx`
- Create: `src/components/ui/InstallPrompt.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/ui/InstallPrompt.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import InstallPrompt from './InstallPrompt'
import { InstallPromptContext } from '../../contexts/InstallPromptContext'
import type { ReactNode } from 'react'

// Helper to render with a mocked context value
function renderWithContext(value: Parameters<typeof InstallPromptContext.Provider>[0]['value'], ui: ReactNode) {
  return render(
    <InstallPromptContext.Provider value={value}>
      {ui}
    </InstallPromptContext.Provider>
  )
}

const base = {
  canInstall: true,
  isIOS: false,
  isStandalone: false,
  isDismissed: false,
  trigger: vi.fn().mockResolvedValue(undefined),
  dismiss: vi.fn(),
}

test('renders nothing when canInstall is false', () => {
  renderWithContext({ ...base, canInstall: false }, <InstallPrompt />)
  expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument()
})

test('renders nothing when isDismissed is true', () => {
  renderWithContext({ ...base, isDismissed: true }, <InstallPrompt />)
  expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument()
})

test('renders floating button when canInstall and not dismissed', () => {
  renderWithContext(base, <InstallPrompt />)
  expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument()
})

test('calls trigger on Android install click', () => {
  const trigger = vi.fn().mockResolvedValue(undefined)
  renderWithContext({ ...base, trigger }, <InstallPrompt />)
  fireEvent.click(screen.getByRole('button', { name: /install app/i }))
  expect(trigger).toHaveBeenCalledOnce()
})

test('opens iOS modal instead of calling trigger on iOS', () => {
  renderWithContext({ ...base, isIOS: true }, <InstallPrompt />)
  fireEvent.click(screen.getByRole('button', { name: /install app/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(base.trigger).not.toHaveBeenCalled()
})

test('dismiss button calls dismiss', () => {
  const dismiss = vi.fn()
  renderWithContext({ ...base, dismiss }, <InstallPrompt />)
  fireEvent.click(screen.getByRole('button', { name: /dismiss install prompt/i }))
  expect(dismiss).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/ui/InstallPrompt.test.tsx
```

Expected: `Cannot find module './InstallPrompt'`

- [ ] **Step 3: Export context object from InstallPromptContext so tests can inject it**

The tests import `InstallPromptContext` directly to provide mock values. Add this named export to `src/contexts/InstallPromptContext.tsx` — add the line below the `const InstallPromptContext = createContext<...>(null)` line:

```tsx
// Add this export so tests can provide mock context values directly
export { InstallPromptContext }
```

- [ ] **Step 4: Implement the floating button**

```tsx
// src/components/ui/InstallPrompt.tsx
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
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/components/ui/InstallPrompt.test.tsx
```

Expected: 6 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/contexts/InstallPromptContext.tsx src/components/ui/InstallPrompt.tsx src/components/ui/InstallPrompt.test.tsx
git commit -m "feat: add InstallPrompt floating button with iOS modal"
```

---

## Task 4: Wire context and button into RequireAuth

**Files:**
- Modify: `src/components/RequireAuth.tsx`

No new tests needed — the context and button are already tested in isolation. This is wiring only.

- [ ] **Step 1: Update RequireAuth**

Replace the entire file content:

```tsx
// src/components/RequireAuth.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { InstallPromptProvider } from '../contexts/InstallPromptContext'
import InstallPrompt from './ui/InstallPrompt'

export default function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }
  if (!session) return <Navigate to="/auth" replace />
  return (
    <InstallPromptProvider>
      <Outlet />
      <InstallPrompt />
    </InstallPromptProvider>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/RequireAuth.tsx
git commit -m "feat: mount InstallPromptProvider and InstallPrompt in RequireAuth"
```

---

## Task 5: Settings page install section

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add imports at the top of SettingsPage.tsx**

After the existing imports, add:

```tsx
import { DeviceMobile } from '@phosphor-icons/react'
import { useInstallPrompt } from '../contexts/InstallPromptContext'
import IOSInstallModal from '../components/ui/IOSInstallModal'
```

- [ ] **Step 2: Add hook call and modal state inside the component**

After `const [orgName, setOrgName] = useState<string | null>(null)`, add:

```tsx
const { isIOS, isStandalone, trigger } = useInstallPrompt()
const [showIOSModal, setShowIOSModal] = useState(false)

async function handleInstall() {
  if (isIOS) {
    setShowIOSModal(true)
  } else {
    await trigger()
  }
}
```

- [ ] **Step 3: Add the App section before the closing `</main>` tag**

Add this block after the Organization `</section>`:

```tsx
{/* App */}
<section className="mt-6">
  <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
    <DeviceMobile size={14} />
    App
  </h2>
  <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between">
    <div>
      <p className="text-sm font-semibold text-stone-900">Install App</p>
      <p className="text-xs text-stone-500 mt-0.5">
        {isStandalone
          ? 'Already installed on this device'
          : 'Add EstimateFlow to your home screen'}
      </p>
    </div>
    <button
      type="button"
      onClick={handleInstall}
      disabled={isStandalone}
      className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:text-stone-300 disabled:cursor-not-allowed transition-colors"
    >
      <DeviceMobile size={16} />
      {isStandalone ? 'Installed' : 'Install'}
    </button>
  </div>
  <IOSInstallModal open={showIOSModal} onClose={() => setShowIOSModal(false)} />
</section>
```

- [ ] **Step 4: Type-check and run all tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: no type errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: add Install App section to Settings page"
```

---

## Task 6: Build and push

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: build succeeds, `[inject-sw-assets] Injected 2 assets into sw.js` in output

- [ ] **Step 2: Smoke test the floating button locally**

```bash
npx vite preview --port 4173
```

Open http://localhost:4173 in Chrome. Open DevTools → Application → Service Workers. On Android or by simulating the `beforeinstallprompt` event in the console:

```js
// Paste in DevTools console to simulate Android prompt
const e = new Event('beforeinstallprompt')
e.prompt = () => Promise.resolve()
window.dispatchEvent(e)
```

Expected: orange "Install App" pill appears in bottom-right corner

- [ ] **Step 3: Push to Vercel**

```bash
git push
```

Expected: Vercel deploys preview. On a real Android device visiting the preview URL, the native install dialog appears when the pill is tapped. On iPhone Safari, the 4-step modal appears. In Settings → App section, the install row is visible.
