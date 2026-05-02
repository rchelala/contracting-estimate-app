import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrganization } from '../services/organizations'
import { useAuth } from '../hooks/useAuth'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Validation state (per UI-SPEC: shown only after first submit attempt)
  const trimmed = name.trim()
  const showRequiredError = submitted && trimmed.length === 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)
    if (trimmed.length === 0) return
    if (!session) return // RequireAuth should prevent this; defense in depth

    setSubmitting(true)
    try {
      await createOrganization(trimmed)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't create your workspace. Please try again."
      setServerError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-[400px] bg-white rounded-lg shadow-xs border border-slate-200 p-8"
      >
        <h1 className="text-xl font-semibold text-slate-900 leading-[1.3] mb-2">
          Set up your workspace
        </h1>
        <p className="text-sm text-slate-500 leading-[1.5] mb-8">
          Your company name will appear on all estimates you send.
        </p>

        <label htmlFor="company-name" className="block text-sm font-semibold text-slate-700 mb-1">
          Company name
        </label>
        <input
          id="company-name"
          name="company-name"
          type="text"
          autoFocus
          autoComplete="organization"
          placeholder="e.g. Apex Roofing Co."
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          maxLength={120}
          aria-invalid={showRequiredError || serverError !== null}
          aria-describedby={showRequiredError ? 'company-name-error' : serverError ? 'company-name-server-error' : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 ${showRequiredError ? 'border-red-500' : 'border-slate-200'}`}
        />
        {showRequiredError && (
          <p id="company-name-error" className="mt-1 text-sm text-red-600">
            Company name is required.
          </p>
        )}
        {serverError && !showRequiredError && (
          <p id="company-name-server-error" className="mt-1 text-sm text-red-600">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait"
        >
          {submitting ? 'Creating...' : 'Create workspace'}
        </button>
      </form>
    </div>
  )
}
