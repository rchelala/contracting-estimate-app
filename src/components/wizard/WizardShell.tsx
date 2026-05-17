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
  totalSteps = 6,
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
