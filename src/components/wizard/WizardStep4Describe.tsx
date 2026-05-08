import { useWizardStore } from '../../stores/wizardStore'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { WizardShell } from './WizardShell'

export function WizardStep4Describe() {
  const { description, setDescription, setStep } = useWizardStore()

  const { isSupported, isListening, error, start, stop } = useVoiceInput({
    onTranscript: (text) => setDescription(description + (description ? ' ' : '') + text),
  })

  return (
    <WizardShell
      step={4}
      title="Describe the job"
      subtitle="Step 4 of 5 · Speak or type what needs to be done"
      onBack={() => setStep(3)}
      onSkip={() => setStep(5)}
    >
      <div className="relative mb-3">
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={5}
          placeholder="e.g. Replace roof on 2,000 sq ft home, tear-off needed, been leaking in the northeast corner for 2 weeks..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {isSupported && (
          <button
            onClick={isListening ? stop : start}
            className={`absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors ${
              isListening ? 'bg-red-500' : 'bg-blue-500'
            } text-white`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            🎤
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 rounded-lg px-3 py-2 text-sm text-red-600 mb-3">
          {error}
        </div>
      )}
      {isSupported && !error && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-600 flex items-center gap-2 mb-5">
          <span>💡</span>
          <span>
            {isListening
              ? 'Listening… speak now'
              : 'Tap 🎤 to speak — your words appear here automatically'}
          </span>
        </div>
      )}

      <button
        onClick={() => setStep(5)}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
