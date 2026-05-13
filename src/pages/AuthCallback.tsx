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
    // Read type from the URL hash before the SDK clears it on session exchange.
    // Supabase appends #access_token=...&type=signup when the user clicks a
    // confirmation link, which lets us route them to the verified success page.
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const authType = hashParams.get('type')

    async function run() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        navigate('/auth', { replace: true })
        return
      }
      if (authType === 'signup') {
        navigate('/auth/email-verified', { replace: true })
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
