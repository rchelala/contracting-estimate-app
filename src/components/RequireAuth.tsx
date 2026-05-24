import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { InstallPromptProvider } from '../contexts/InstallPromptContext'
import InstallPrompt from './ui/InstallPrompt'

/**
 * Route guard that renders <Outlet /> when the user has an active session,
 * and redirects to /auth when there is no session.
 * Shows a loading spinner while the session is being determined.
 *
 * Wraps authenticated pages with InstallPromptProvider to enable the PWA
 * install prompt overlay across all authenticated routes.
 */
export default function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }
  if (!session) return <Navigate to="/auth" replace />
  return (
    <InstallPromptProvider>
      <Outlet />
      <InstallPrompt />
    </InstallPromptProvider>
  )
}
