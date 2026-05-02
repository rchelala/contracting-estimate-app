import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Route guard that renders <Outlet /> when the user has an active session,
 * and redirects to /auth when there is no session.
 * Shows a loading spinner while the session is being determined.
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
  return session ? <Outlet /> : <Navigate to="/auth" replace />
}
