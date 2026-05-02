import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * /auth/callback — exchanges the email verification token and routes the user:
 *   - No session → /auth (token expired or invalid)
 *   - Session + membership row → /dashboard (returning user)
 *   - Session + no membership row → /onboarding (new user, needs org setup)
 *
 * Threat model T-02-02: token exchange is handled by supabase-js (detectSessionInUrl: true);
 * we never parse the URL token manually.
 * Threat model T-02-06: membership query is scoped to current user via RLS.
 */
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function run() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        navigate('/auth', { replace: true })
        return
      }
      const { data: membership, error } = await supabase
        .from('organization_members')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        // Fail closed: send to onboarding so the user can set up their org
        navigate('/onboarding', { replace: true })
        return
      }
      navigate(membership ? '/dashboard' : '/onboarding', { replace: true })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Verifying your email...</p>
    </div>
  )
}
