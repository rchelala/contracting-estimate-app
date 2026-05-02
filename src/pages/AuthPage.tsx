import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * /auth page — sign in / sign up form using Supabase Auth UI.
 * D-01: Uses @supabase/auth-ui-react with ThemeSupa (archived upstream; locked decision).
 * D-02: Sign-in and sign-up toggle is handled internally by the Auth component.
 * D-03: Only email+password auth — providers={[]} hides all OAuth buttons.
 *
 * If the user already has a session, redirects to /auth/callback to
 * determine the correct landing page (/dashboard or /onboarding).
 */
export default function AuthPage() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/auth/callback" replace />

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[400px] bg-white rounded-lg shadow-xs border border-slate-200 p-8">
        <h1 className="text-[28px] font-semibold text-slate-900 text-center mb-4 leading-[1.2]">
          EstimateFlow
        </h1>
        <p className="text-sm text-slate-500 text-center mb-8 leading-[1.5]">
          Professional estimates in minutes.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: { brand: '#2563EB', brandAccent: '#1D4ED8' },
                radii: { borderRadiusButton: '6px', inputBorderRadius: '6px' },
              },
            },
          }}
          providers={[]}
          redirectTo={`${window.location.origin}/auth/callback`}
        />
      </div>
    </div>
  )
}
