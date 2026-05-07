// src/components/wizard/WizardShell.tsx
import type { ReactNode } from 'react'

interface WizardShellProps {
  step: number        // 1–5
  totalSteps?: number // default 5
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
  const progress = (step / totalSteps) * 100
  const isLastStep = step === totalSteps
  const barColor = isLastStep ? 'bg-amber-400' : 'bg-blue-500'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={onBack}
          className="text-slate-400 text-sm w-14"
          disabled={!onBack}
        >
          {onBack ? '← Back' : ''}
        </button>
        <span className="font-semibold text-sm">New Estimate</span>
        <button
          onClick={onSkip}
          className="text-blue-500 text-sm w-14 text-right"
        >
          {onSkip ? skipLabel : ''}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200 rounded-full mb-5">
          <div
            className={`h-1 rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <h1 className="text-xl font-bold mb-1">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mb-5">{subtitle}</p>}

        {children}
      </div>
    </div>
  )
}
