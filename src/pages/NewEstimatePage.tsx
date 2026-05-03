import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { createEstimate } from '../services/estimates'

export default function NewEstimatePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      // Resolve current user's organization via organization_members (RLS-scoped to auth.uid()).
      const { data: memberRow, error: memberErr } = await supabase
        .from('organization_members')
        .select('organization_id')
        .limit(1)
        .maybeSingle()
      if (memberErr) {
        if (!cancelled) setError(memberErr.message)
        return
      }
      if (!memberRow) {
        if (!cancelled) setError('No organization found for current user')
        return
      }
      try {
        const estimate = await createEstimate(memberRow.organization_id)
        if (!cancelled) navigate(`/estimates/${estimate.id}`, { replace: true })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to create estimate')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
      {error ? <div className="text-red-600">Error: {error}</div> : 'Creating new estimate...'}
    </div>
  )
}
