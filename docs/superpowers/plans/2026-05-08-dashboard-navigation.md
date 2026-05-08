# Dashboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a home-icon escape hatch to the estimate wizard (with leave confirmation) and to the settings page (direct navigation).

**Architecture:** WizardShell owns the full leave-wizard flow — it imports `useNavigate` and `useWizardStore` directly, shows a `House` icon, and renders the leave-confirmation `Modal` internally. No individual step component needs to change except WizardStep5QA, which doesn't use WizardShell. SettingsPage gets a standalone home button above its `<h1>`.

**Tech Stack:** React 18, React Router v6 `useNavigate`, `@phosphor-icons/react` (`House`), existing `Modal` component, Zustand `useWizardStore`.

---

### Task 1: Update WizardShell with home icon and leave confirmation modal

**Files:**
- Modify: `src/components/wizard/WizardShell.tsx`

- [ ] **Step 1: Replace the full file contents**

```tsx
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, House } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useWizardStore } from '../../stores/wizardStore'
import Modal from '../ui/Modal'

interface WizardShellProps {
  step: number
  totalSteps?: number
  title: string
  subtitle?: string
  onBack?: () => void
  onSkip?: () => void
  skipLabel?: string
  children: ReactNode
}

export function WizardShell({
  step,
  totalSteps = 5,
  title,
  subtitle,
  onBack,
  onSkip,
  skipLabel = 'Skip',
  children,
}: WizardShellProps) {
  const navigate = useNavigate()
  const reset = useWizardStore((s) => s.reset)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const progress = (step / totalSteps) * 100
  const isLastStep = step === totalSteps
  const barColor = isLastStep ? 'bg-amber-400' : 'bg-orange-500'

  function handleLeaveConfirm() {
    reset()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-1 w-24">
          <button
            type="button"
            aria-label="Go to dashboard"
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          >
            <House size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm disabled:opacity-0 disabled:pointer-events-none"
          >
            {onBack && <><ArrowLeft size={14} weight="bold" /> Back</>}
          </button>
        </div>
        <span className="font-semibold text-sm text-stone-900">New Estimate</span>
        <button
          type="button"
          onClick={onSkip}
          disabled={!onSkip}
          style={{ visibility: onSkip ? 'visible' : 'hidden' }}
          className="text-orange-500 hover:text-orange-600 text-sm w-14 text-right font-medium"
        >
          {skipLabel}
        </button>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        <div className="h-1.5 bg-stone-100 rounded-full mb-5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="text-xl font-extrabold text-stone-900 mb-1 tracking-tight">{title}</h1>
        {subtitle && <p className="text-stone-500 text-sm mb-5">{subtitle}</p>}

        {children}
      </div>

      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Leave estimate?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowLeaveModal(false)}
              className="px-4 py-2 text-sm font-medium text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={handleLeaveConfirm}
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg"
            >
              Leave
            </button>
          </>
        }
      >
        Your progress will be lost if you leave now.
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/wizard/WizardShell.tsx
git commit -m "feat: add home icon and leave confirmation to WizardShell"
```

---

### Task 2: Add home icon to WizardStep5QA (doesn't use WizardShell)

**Files:**
- Modify: `src/components/wizard/WizardStep5QA.tsx`

- [ ] **Step 1: Read the full file to understand layout**

Read `src/components/wizard/WizardStep5QA.tsx` fully.

- [ ] **Step 2: Add home icon and leave modal**

Import `House` from `@phosphor-icons/react`, `useNavigate` from `react-router-dom`, `useState`, `Modal`, and `useWizardStore`. Add a `showLeaveModal` state. Render a `House` button in the step's header area with the same modal pattern as WizardShell.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/wizard/WizardStep5QA.tsx
git commit -m "feat: add home icon and leave confirmation to WizardStep5QA"
```

---

### Task 3: Add home icon to SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add imports and home button**

Add `House` to the `@phosphor-icons/react` import. Add `useNavigate` from `react-router-dom`. Add a home button above the `<h1>Settings</h1>`:

```tsx
import { useNavigate } from 'react-router-dom'
import { EnvelopeSimple, Buildings, UserCircle, House } from '@phosphor-icons/react'
```

In the component, add `const navigate = useNavigate()` and render this above the h1:

```tsx
<div className="flex items-center mb-6">
  <button
    type="button"
    aria-label="Go to dashboard"
    onClick={() => navigate('/dashboard')}
    className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 -ml-1"
  >
    <House size={18} />
  </button>
  <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight ml-2">Settings</h1>
</div>
```

Remove the standalone `<h1>` that was previously there.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: add home icon to SettingsPage"
```

---

### Task 4: Lint, build, and push

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: build completes with no errors

- [ ] **Step 3: Push to GitHub**

```bash
git push
```
