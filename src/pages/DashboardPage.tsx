import { useAuth } from '../hooks/useAuth'

/**
 * /dashboard — stub page. Full implementation in Plan 04.
 * Exposes sign-out for smoke-testing the auth lifecycle.
 */
export default function DashboardPage() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <p className="text-sm text-slate-500">Dashboard (Plan 04)</p>
      <button
        onClick={() => {
          void signOut()
        }}
        className="mt-4 text-sm font-semibold text-slate-700 hover:text-slate-900"
      >
        Sign out
      </button>
    </div>
  )
}
