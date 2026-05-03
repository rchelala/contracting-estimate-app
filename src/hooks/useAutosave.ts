import { useEffect, useRef } from 'react'
import { useSyncQueue, type QueueItem } from '../stores/syncQueueStore'
import { useEditorStore } from '../stores/editorStore'
import { useOnlineStatus } from './useOnlineStatus'
import { recalcTotals, updateEstimate } from '../services/estimates'
import { updateSection, deleteSection } from '../services/sections'
import { updateLineItem, deleteLineItem } from '../services/lineItems'
import { supabase } from '../lib/supabase'

const DEBOUNCE_MS = 800

async function applyOne(item: QueueItem): Promise<void> {
  switch (item.kind) {
    case 'estimate.update':
      await updateEstimate(item.estimateId, item.patch as never)
      break
    case 'section.create': {
      const { error } = await supabase.from('estimate_sections').insert(item.section)
      if (error) throw error
      break
    }
    case 'section.update':
      await updateSection(item.id, item.patch)
      break
    case 'section.delete':
      await deleteSection(item.id)
      break
    case 'lineItem.create': {
      const { error } = await supabase.from('estimate_line_items').insert({
        ...item.item,
        quantity: 1,
        unit_price_cents: 0,
        markup_pct: 0,
        optional: false,
        taxable: true,
      })
      if (error) throw error
      break
    }
    case 'lineItem.update':
      await updateLineItem(item.id, item.patch as never)
      break
    case 'lineItem.delete':
      await deleteLineItem(item.id)
      break
  }
}

export function useAutosave(): void {
  const online = useOnlineStatus()
  const queueLength = useSyncQueue((s) => s.queue.length)
  const status = useSyncQueue((s) => s.status)
  const setStatus = useSyncQueue((s) => s.setStatus)
  const setError = useSyncQueue((s) => s.setError)
  const hydrateFromIDB = useSyncQueue((s) => s.hydrateFromIDB)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushing = useRef(false)

  // Hydrate any pending items left from previous session.
  useEffect(() => {
    void hydrateFromIDB()
  }, [hydrateFromIDB])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (queueLength === 0) {
      if (status === 'saving') setStatus('saved')
      return
    }
    if (!online) {
      setStatus('queued')
      return
    }
    timer.current = setTimeout(async () => {
      if (flushing.current) return
      flushing.current = true
      setStatus('saving')
      try {
        // Drain the queue in order, one mutation at a time.
        for (;;) {
          const batch = useSyncQueue.getState().dequeueBatch(1)
          if (batch.length === 0) break
          await applyOne(batch[0]!)
        }
        // Recompute server-authoritative totals and replace store totals.
        const estimateId = useEditorStore.getState().estimateId
        if (estimateId) {
          await recalcTotals(estimateId)
          const { data } = await supabase.from('estimates').select('*').eq('id', estimateId).single()
          if (data) useEditorStore.getState().replaceEstimateTotals(data)
        }
        setStatus('saved')
        setError(null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Save failed'
        setError(msg)
      } finally {
        flushing.current = false
      }
    }, DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [queueLength, online, status, setStatus, setError])

  // When we come back online and queue is non-empty, the effect above re-runs because `online` is a dep.
}
