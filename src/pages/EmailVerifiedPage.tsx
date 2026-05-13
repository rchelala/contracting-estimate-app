import { useNavigate } from 'react-router-dom'
import LogoBadge from '../components/ui/LogoBadge'

export default function EmailVerifiedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <LogoBadge size={32} />
          <span className="text-2xl font-extrabold text-stone-900 tracking-tight">EstimateFlow</span>
        </div>
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-5">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-stone-900 mb-2">Email verified!</h1>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          Your account is confirmed. You're all set to start creating professional estimates.
        </p>
        <button
          onClick={() => navigate('/auth/callback')}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors"
        >
          Continue to app
        </button>
      </div>
    </div>
  )
}
