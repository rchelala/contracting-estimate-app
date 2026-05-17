// src/components/wizard/WizardStep5QA.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { House } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { fetchWizardQuestions } from '../../services/wizard'
import Modal from '../ui/Modal'

export function WizardStep5QA() {
  const {
    description, zipCode, photoFiles, qaPairs, setQAPairs, answerQuestion,
    currentQuestionIndex, setCurrentQuestionIndex, showAllMode, setShowAllMode, setStep,
    reset,
  } = useWizardStore()

  const navigate = useNavigate()
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [inputText, setInputText] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  function handleLeaveConfirm() {
    reset()
    navigate('/dashboard')
  }

  const { isSupported, isListening, error: voiceError, interimText, start, stop } = useVoiceInput({
    onTranscript: (text) => setInputText((prev) => prev + (prev ? ' ' : '') + text),
  })

  useEffect(() => {
    fetchWizardQuestions({
      description,
      photoCount: photoFiles.length,
      ...(zipCode ? { zipCode } : {}),
    })
      .then((questions) => {
        setQAPairs(questions.map((q) => ({ question: q, answer: null })))
      })
      .catch(() => {
        // Fallback: proceed without questions
        setFetchError('Could not load questions. You can still generate your estimate.')
        setQAPairs([])
      })
      .finally(() => setLoadingQuestions(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSend() {
    if (!inputText.trim()) return
    answerQuestion(currentQuestionIndex, inputText.trim())
    setInputText('')
    setCurrentQuestionIndex(currentQuestionIndex + 1)
  }

  function handleSkipQuestion() {
    if (currentQuestionIndex < qaPairs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const allAnsweredOrSkipped = currentQuestionIndex >= qaPairs.length - 1 || qaPairs.every((p) => p.answer !== null)
  const canGenerate = !loadingQuestions

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🤖</div>
          <p className="text-slate-500 text-sm">Thinking of questions…</p>
        </div>
      </div>
    )
  }

  const currentPair = qaPairs[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1 w-24">
          <button
            type="button"
            aria-label="Go to dashboard"
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          >
            <House size={16} weight="bold" />
          </button>
          <button onClick={() => setStep(4)} className="text-slate-400 text-sm">← Back</button>
        </div>
        <span className="font-semibold text-sm">New Estimate</span>
        <button
          onClick={() => setShowAllMode(!showAllMode)}
          className="text-blue-500 text-sm w-24 text-right"
        >
          {showAllMode ? 'One at a time' : 'Show all'}
        </button>
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {/* Progress bar — full amber */}
        <div className="h-1 bg-slate-200 rounded-full mb-5">
          <div className="h-1 rounded-full bg-amber-400 w-full" />
        </div>

        {fetchError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700 mb-4">
            {fetchError}
          </div>
        )}

        {!showAllMode ? (
          /* Chat mode */
          <>
            <h1 className="text-xl font-bold mb-1">A few quick questions</h1>
            <p className="text-slate-400 text-xs mb-5">
              {qaPairs.length === 0 || !currentPair
                ? 'Step 5 of 6 · Ready to generate'
                : `Step 5 of 6 · Question ${currentQuestionIndex + 1} of ${qaPairs.length}`}
            </p>

            {/* Previous answered questions */}
            {qaPairs.slice(0, currentQuestionIndex).map((p, i) => (
              <div key={i} className="mb-3 opacity-50">
                <div className="text-xs text-slate-400 mb-1">AI Contractor</div>
                <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500">{`"${p.question}"`}</div>
                {p.answer && (
                  <div className="flex justify-end mt-1">
                    <div className="bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm">{`"${p.answer}"`}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Current question */}
            {currentPair && (
              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-1">AI Contractor</div>
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg px-3 py-2.5 text-sm text-blue-800 leading-relaxed">
                  {`"${currentPair.question}"`}
                </div>
              </div>
            )}

            {/* Input (only show if there are questions left) */}
            {currentPair && (
              <>
                <div className="relative mb-3">
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type or tap mic to speak..."
                    value={isListening && interimText
                      ? inputText + (inputText ? ' ' : '') + interimText
                      : inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  {isSupported && (
                    <button
                      onClick={isListening ? stop : start}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs ${
                        isListening ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                    >
                      🎤
                    </button>
                  )}
                </div>

                {voiceError && (
                  <div className="bg-red-50 rounded-lg px-3 py-2 text-sm text-red-600 mb-2">
                    {voiceError}
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={handleSkipQuestion} className="text-sm text-slate-400">
                    Skip question →
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
              </>
            )}

            {(allAnsweredOrSkipped || qaPairs.length === 0) && (
              <button
                onClick={() => setStep('generating')}
                disabled={!canGenerate}
                className="w-full bg-amber-400 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40"
              >
                Generate Estimate →
              </button>
            )}
          </>
        ) : (
          /* Show-all form mode */
          <>
            <h1 className="text-xl font-bold mb-1">AI follow-up questions</h1>
            <p className="text-slate-400 text-xs mb-5">Answer what you know — skip the rest</p>

            {qaPairs.map((p, i) => (
              <div key={i} className={`mb-4 ${p.answer ? 'opacity-50' : ''}`}>
                <div className={`text-xs mb-1.5 ${p.answer ? 'text-slate-400' : 'font-semibold text-blue-800'}`}>
                  {i + 1}. {p.question}
                </div>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Skip if unsure"
                  value={p.answer ?? ''}
                  onChange={(e) => answerQuestion(i, e.target.value || '')}
                />
              </div>
            ))}

            <button
              onClick={() => setStep('generating')}
              disabled={!canGenerate}
              className="w-full bg-amber-400 text-white rounded-lg py-2.5 font-semibold text-sm mt-2 disabled:opacity-40"
            >
              Generate Estimate →
            </button>
          </>
        )}
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
