import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UseAuthResult {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

/**
 * Hook that mirrors Supabase auth session state.
 * Reads the current session on mount and subscribes to auth state changes.
 * Unsubscribes on unmount.
 */
export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { session, loading, signOut }
}
