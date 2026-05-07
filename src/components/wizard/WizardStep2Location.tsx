import { useWizardStore } from '../../stores/wizardStore'
import { WizardShell } from './WizardShell'

export function WizardStep2Location() {
  const { zipCode, setZipCode, setStep } = useWizardStore()

  const canContinue = zipCode.length === 5 && /^\d{5}$/.test(zipCode)

  return (
    <WizardShell
      step={2}
      title="Job location?"
      subtitle="Step 2 of 5"
      onBack={() => setStep(1)}
      onSkip={() => setStep(3)}
    >
      <div className="flex flex-col items-center mb-6">
        <input
          type="tel"
          inputMode="numeric"
          maxLength={5}
          className="border-2 border-blue-500 rounded-xl text-3xl font-bold tracking-widest text-center w-44 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="·····"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
        />
        <p className="text-slate-400 text-sm mt-2">Enter zip code</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 mb-6 text-sm text-slate-600">
        <strong>Why we ask:</strong> Helps AI estimate local labor and material costs.
        Also used for tax rates when payments are added.
      </div>

      <button
        onClick={() => setStep(3)}
        disabled={!canContinue}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
