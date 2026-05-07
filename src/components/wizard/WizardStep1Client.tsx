// src/components/wizard/WizardStep1Client.tsx
import { useState, useEffect } from 'react'
import { useWizardStore } from '../../stores/wizardStore'
import { listClients, createClient, type ClientRow } from '../../services/clients'
import { WizardShell } from './WizardShell'

export function WizardStep1Client() {
  const { setStep, setClientId, setNewClientFields, newClientName, newClientEmail,
    newClientPhone, clientId, organizationId } = useWizardStore()

  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    listClients()
      .then((rows) => setClients(rows))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(query.toLowerCase())
  )

  const canContinue = clientId !== null || newClientName.trim().length > 0

  async function handleContinue() {
    setSaveError(null)
    if (newClientName.trim() && !clientId) {
      if (!organizationId) {
        setSaveError('Organization not loaded yet. Please wait a moment and try again.')
        return
      }
      setSaving(true)
      try {
        const created = await createClient({
          organization_id: organizationId,
          name: newClientName.trim(),
          email: newClientEmail || null,
          phone: newClientPhone || null,
        })
        setClientId(created.id)
      } catch (err) {
        setSaving(false)
        setSaveError(err instanceof Error ? err.message : 'Failed to create client. Try again.')
        return
      }
      setSaving(false)
    }
    setStep(2)
  }

  const initials = (name: string) =>
    name.split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <WizardShell
      step={1}
      title="Who's the client?"
      subtitle="Step 1 of 5"
      onSkip={() => setStep(2)}
    >
      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          type="text"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search clients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Results */}
      {!loading && (
        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { setClientId(c.id); setShowNewForm(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                clientId === c.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0">
                {initials(c.name)}
              </div>
              <div>
                <div className="font-medium text-sm">{c.name}</div>
                {c.email && <div className="text-slate-500 text-xs">{c.email}</div>}
              </div>
            </button>
          ))}

          <button
            onClick={() => { setShowNewForm(true); setClientId(null) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-blue-500 hover:bg-slate-50"
          >
            <span className="text-lg font-light">+</span>
            <span className="text-sm font-semibold">New client</span>
          </button>
        </div>
      )}

      {/* New client inline form */}
      {showNewForm && (
        <div className="border border-blue-200 rounded-lg p-3 mb-4 bg-blue-50 space-y-2">
          <input
            type="text"
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="Full name *"
            value={newClientName}
            onChange={(e) => setNewClientFields({ name: e.target.value })}
          />
          <input
            type="email"
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="Email (optional)"
            value={newClientEmail}
            onChange={(e) => setNewClientFields({ email: e.target.value })}
          />
          <input
            type="tel"
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm"
            placeholder="Phone (optional)"
            value={newClientPhone}
            onChange={(e) => setNewClientFields({ phone: e.target.value })}
          />
        </div>
      )}

      {saveError && (
        <p className="text-red-500 text-sm mb-3">{saveError}</p>
      )}

      <button
        onClick={handleContinue}
        disabled={!canContinue || saving}
        className="w-full bg-blue-500 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40"
      >
        Continue →
      </button>
    </WizardShell>
  )
}
