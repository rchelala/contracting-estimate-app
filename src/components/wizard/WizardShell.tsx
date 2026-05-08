import type { ReactNode } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'

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
  const progress = (step / totalSteps) * 100
  const isLastStep = step === totalSteps
  const barColor = isLastStep ? 'bg-amber-400' : 'bg-orange-500'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm w-14 disabled:opacity-0"
          disabled={!onBack}
        >
          {onBack && <><ArrowLeft size={14} weight="bold" /> Back</>}
        </button>
        <span className="font-semibold text-sm text-stone-900">New Estimate</span>
        <button
          onClick={onSkip}
          className="text-orange-500 hover:text-orange-600 text-sm w-14 text-right font-medium"
          disabled={!onSkip}
          style={{ visibility: onSkip ? 'visible' : 'hidden' }}
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
    </div>
  )
}
