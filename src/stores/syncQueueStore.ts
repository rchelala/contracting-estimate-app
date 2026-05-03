import { create } from 'zustand'
import { get as idbGet, set as idbSet } from 'idb-keyval'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'error'

export type QueueItem =
  | { kind: 'estimate.update'; estimateId: string; patch: Record<string, unknown> }
  | {
      kind: 'section.create'
      section: {
        id: string
        organization_id: string
        estimate_id: string
        name: string
        position: number
      }
    }
  | { kind: 'section.update'; id: string; patch: { name?: string; position?: number } }
  | { kind: 'section.delete'; id: string }
  | {
      kind: 'lineItem.create'
      item: {
        id: string
        organization_id: string
        estimate_id: string
        section_id: string
        description: string
        position: number
      }
    }
  | { kind: 'lineItem.update'; id: string; patch: Record<string, unknown> }
  | { kind: 'lineItem.delete'; id: string }

interface SyncQueueState {
  queue: QueueItem[]
  status: SaveStatus
  lastError: string | null
  enqueue: (item: QueueItem) => void
  dequeueBatch: (count: number) => QueueItem[]
  clear: () => void
  setStatus: (status: SaveStatus) => void
  setError: (msg: string | null) => void
  hydrateFromIDB: () => Promise<void>
}

const IDB_KEY = 'estimateflow:syncQueue:v1'

function persist(items: QueueItem[]): void {
  void idbSet(IDB_KEY, items)
}

/** Coalesce consecutive updates targeting same (kind,id) into the latest patch (last-write-wins). */
function coalesce(queue: QueueItem[], next: QueueItem): QueueItem[] {
  if (
    next.kind === 'estimate.update' ||
    next.kind === 'section.update' ||
    next.kind === 'lineItem.update'
  ) {
    for (let i = queue.length - 1; i >= 0; i--) {
      const prev = queue[i]
      if (prev.kind !== next.kind) continue
      const sameTarget =
        (next.kind === 'estimate.update' &&
          prev.kind === 'estimate.update' &&
          prev.estimateId === next.estimateId) ||
        ((next.kind === 'section.update' || next.kind === 'lineItem.update') &&
          (prev.kind === 'section.update' || prev.kind === 'lineItem.update') &&
          'id' in prev &&
          'id' in next &&
          prev.id === next.id)
      if (sameTarget) {
        const merged = {
          ...prev,
          patch: {
            ...('patch' in prev ? prev.patch : {}),
            ...('patch' in next ? next.patch : {}),
          },
        } as QueueItem
        return [...queue.slice(0, i), merged, ...queue.slice(i + 1)]
      }
    }
  }
  return [...queue, next]
}

export const useSyncQueue = create<SyncQueueState>((set, get) => ({
  queue: [],
  status: 'idle',
  lastError: null,

  enqueue: (item) =>
    set((s) => {
      const queue = coalesce(s.queue, item)
      persist(queue)
      return { queue, status: 'saving' }
    }),

  dequeueBatch: (count) => {
    const batch = get().queue.slice(0, count)
    set((s) => {
      const queue = s.queue.slice(count)
      persist(queue)
      return { queue }
    })
    return batch
  },

  clear: () => {
    persist([])
    set({ queue: [], status: 'idle' })
  },

  setStatus: (status) => set({ status }),

  setError: (msg) => set({ lastError: msg, status: msg ? 'error' : 'idle' }),

  hydrateFromIDB: async () => {
    const stored = await idbGet<QueueItem[]>(IDB_KEY)
    if (stored && stored.length > 0) set({ queue: stored, status: 'queued' })
  },
}))
