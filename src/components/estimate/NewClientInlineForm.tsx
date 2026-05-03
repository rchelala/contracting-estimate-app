import { useState } from 'react'
import { createClient as createClientRow } from '../../services/clients'
import type { ClientRow } from '../../services/clients'

interface Props {
  organizationId: string
  onSaved: (client: ClientRow) => void
  onDiscard: () => void
}

export default function NewClientInlineForm({ organizationId, onSaved, onDiscard }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const client = await createClientRow({
        organization_id: organizationId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      })
      onSaved(client)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-slate-200 rounded-md shadow-md p-4 z-20">
      <input
        type="text"
        placeholder="e.g. Apex Roofing Co."
        maxLength={200}
        className="w-full text-sm border border-slate-200 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        type="email"
        placeholder="client@email.com"
        maxLength={200}
        className="w-full text-sm border border-slate-200 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-600"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="tel"
        placeholder="(555) 000-0000"
        maxLength={32}
        className="w-full text-sm border border-slate-200 rounded px-2 py-1 mb-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" className="text-slate-500 text-sm underline" onClick={onDiscard}>
          Discard
        </button>
        <button
          type="button"
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-60"
          onClick={() => {
            void handleSave()
          }}
        >
          Save client
        </button>
      </div>
    </div>
  )
}
