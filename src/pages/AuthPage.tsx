import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import LogoBadge from '../components/ui/LogoBadge'

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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-stone-200 p-8">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <LogoBadge size={32} />
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight">EstimateFlow</span>
        </div>
        <p className="text-sm text-stone-500 text-center mb-8 leading-[1.5]">
          Professional estimates in minutes.
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: { brand: '#ea580c', brandAccent: '#c2410c' },
                radii: { borderRadiusButton: '8px', inputBorderRadius: '8px' },
              },
            },
          }}
          providers={[]}
          redirectTo={`${window.location.origin}/auth/callback`}
        />
        <p className="mt-5 text-center text-sm text-stone-400">
          New to EstimateFlow?{' '}
          <Link to="/how-it-works" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
            See how it works →
          </Link>
        </p>
      </div>
    </div>
  )
}
