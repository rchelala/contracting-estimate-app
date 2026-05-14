import { useEffect, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { listClients, deleteClient } from '../../services/clients'
import type { ClientRow } from '../../services/clients'
import NewClientInlineForm from './NewClientInlineForm'
import Modal from '../ui/Modal'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'

interface Props {
  readOnly: boolean
}

export default function ClientDropdown({ readOnly }: Props) {
  const estimate = useEditorStore((s) => s.estimate)
  const setEstimateField = useEditorStore((s) => s.setEstimateField)
  const enqueue = useSyncQueue((s) => s.enqueue)

  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [filter, setFilter] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ClientRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void listClients()
      .then(setClients)
      .catch(() => setClients([]))
  }, [])

  const selected =
    estimate?.client_id ? (clients.find((c) => c.id === estimate.client_id) ?? null) : null
  const orgId = estimate?.organization_id ?? ''

  function handleDeleteClick(client: ClientRow, e: React.MouseEvent) {
    e.stopPropagation()
    setPendingDelete(client)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteClient(pendingDelete.id)
      setClients((prev) => prev.filter((c) => c.id !== pendingDelete.id))
      if (estimate?.client_id === pendingDelete.id && estimate) {
        setEstimateField({ client_id: null })
        enqueue({ kind: 'estimate.update', estimateId: estimate.id, patch: { client_id: null } })
      }
      setPendingDelete(null)
    } catch {
      setDeleteError('Failed to remove client. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  function cancelDelete() {
    setPendingDelete(null)
    setDeleteError(null)
  }

  function selectClient(client: ClientRow) {
    if (!estimate) return
    setEstimateField({ client_id: client.id })
    enqueue({ kind: 'estimate.update', estimateId: estimate.id, patch: { client_id: client.id } })
    setOpen(false)
    setShowNew(false)
    setFilter('')
    // Cache new client in local list if not present.
    setClients((prev) => (prev.some((c) => c.id === client.id) ? prev : [...prev, client]))
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="relative w-48">
      <button
        type="button"
        disabled={readOnly}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full text-sm text-left border border-slate-200 rounded px-2 py-1 bg-white hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-600"
        onClick={() => setOpen((v) => !v)}
      >
        {selected?.name ?? <span className="text-slate-400">Select client...</span>}
      </button>
      {open && !showNew && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-md shadow-md z-20"
        >
          <input
            type="text"
            placeholder="Search clients..."
            className="w-full text-sm border-b border-slate-200 px-3 py-2 focus:outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="text-xs text-slate-400 px-3 py-2">No matches</li>
            )}
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center">
                <button
                  type="button"
                  className="flex-1 text-left text-sm px-3 py-2 hover:bg-slate-50"
                  onClick={() => selectClient(c)}
                >
                  {c.name}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  className="px-2 py-2 text-slate-400 hover:text-red-500 focus:outline-none"
                  onClick={(e) => handleDeleteClick(c, e)}
                >
                  <Trash size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="w-full text-left text-sm text-blue-600 px-3 py-2 border-t border-slate-200 hover:bg-slate-50"
            onClick={() => setShowNew(true)}
          >
            + New client
          </button>
        </div>
      )}
      {open && showNew && orgId && (
        <NewClientInlineForm
          organizationId={orgId}
          onSaved={(c) => selectClient(c)}
          onDiscard={() => {
            setShowNew(false)
            setOpen(false)
          }}
        />
      )}
      <Modal
        open={pendingDelete !== null}
        onClose={cancelDelete}
        title="Remove client?"
        footer={
          <>
            <button
              type="button"
              className="text-sm px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50"
              onClick={cancelDelete}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </>
        }
      >
        <p>
          <strong>{pendingDelete?.name}</strong> will be removed. Existing estimates using this client will be unlinked but not deleted.
        </p>
        {deleteError && <p className="mt-2 text-red-600 text-xs">{deleteError}</p>}
      </Modal>
    </div>
  )
}
