import { useEffect, useRef, useState } from 'react'
import { getEstimate } from '../services/estimates'
import { useEditorStore } from '../stores/editorStore'

export function useEstimate(estimateId: string | undefined): { loading: boolean; error: string | null } {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hydrate = useEditorStore((s) => s.hydrate)
  const reset = useEditorStore((s) => s.reset)
  // Track whether estimateId changed so we reset state only in async callbacks
  const prevEstimateId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!estimateId) {
      return
    }
    prevEstimateId.current = estimateId
    let cancelled = false
    getEstimate(estimateId)
      .then((full) => {
        if (!cancelled) {
          hydrate(full)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load estimate')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      reset()
    }
  }, [estimateId, hydrate, reset])

  return { loading, error }
}
