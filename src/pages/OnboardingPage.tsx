import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrganization } from '../services/organizations'
import { useAuth } from '../hooks/useAuth'
import LogoBadge from '../components/ui/LogoBadge'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const trimmed = name.trim()
  const showRequiredError = submitted && trimmed.length === 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
    setServerError(null)
    if (trimmed.length === 0) return
    if (!session) return

    setSubmitting(true)
    try {
      await createOrganization(trimmed)
      fetch('/api/email/send-welcome', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch((err) => console.warn('[welcome-email] non-critical send failure', err))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't create your workspace. Please try again."
      setServerError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-stone-200 p-8"
      >
        <div className="flex items-center gap-2.5 mb-6">
          <LogoBadge size={28} />
          <span className="text-lg font-extrabold text-stone-900 tracking-tight">EstimateFlow</span>
        </div>

        <h1 className="text-xl font-bold text-stone-900 leading-[1.3] mb-2">
          Set up your workspace
        </h1>
        <p className="text-sm text-stone-500 leading-[1.5] mb-8">
          Your company name will appear on all estimates you send.
        </p>

        <label htmlFor="company-name" className="block text-sm font-semibold text-stone-700 mb-1">
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
          className={`w-full rounded-lg border px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 ${showRequiredError ? 'border-red-500' : 'border-stone-200'}`}
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
          className="mt-4 w-full rounded-lg bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait"
        >
          {submitting ? 'Creating...' : 'Create workspace'}
        </button>
      </form>
    </div>
  )
}
