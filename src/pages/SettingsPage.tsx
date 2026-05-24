import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnvelopeSimple, Buildings, UserCircle, House, PlayCircle, DeviceMobile } from '@phosphor-icons/react'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../hooks/useAuth'
import { getMyMembership, type MyMembership } from '../services/organizations'
import { supabase } from '../lib/supabase'
import { useInstallPrompt } from '../contexts/InstallPromptContext'
import IOSInstallModal from '../components/ui/IOSInstallModal'

function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return (local.slice(0, 2) || '?').toUpperCase()
}

export default function SettingsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [membership, setMembership] = useState<MyMembership | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const { isIOS, isStandalone, trigger } = useInstallPrompt()
  const [showIOSModal, setShowIOSModal] = useState(false)

  async function handleInstall() {
    if (isIOS) {
      setShowIOSModal(true)
    } else {
      try {
        await trigger()
      } catch {
        // prompt dismissed or unavailable — no action needed
      }
    }
  }

  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const m = await getMyMembership(session.user.id)
        if (!m || cancelled) return
        setMembership(m)
        const { data } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', m.organization_id)
          .maybeSingle()
        if (!cancelled && data) setOrgName(data.name)
      } catch {
        // non-critical
      }
    })()
    return () => { cancelled = true }
  }, [session])

  const email = session?.user.email
  const initials = getInitials(email)

  return (
    <div className="min-h-screen bg-stone-50">
      <TopNav />
      <main className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <div className="flex items-center -ml-1">
          <button
            type="button"
            aria-label="Go to dashboard"
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          >
            <House size={18} />
          </button>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight ml-2">Settings</h1>
        </div>

        {/* Profile */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <UserCircle size={14} />
            Profile
          </h2>
          <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{email ?? '—'}</p>
              {membership && (
                <p className="text-xs text-stone-500 mt-0.5 capitalize">{membership.role}</p>
              )}
            </div>
            <EnvelopeSimple size={18} className="text-stone-300 ml-auto shrink-0" />
          </div>
          <div className="mt-3 flex justify-end">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <PlayCircle size={15} />
              Watch intro video
            </Link>
          </div>
        </section>

        {/* Organization */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Buildings size={14} />
            Organization
          </h2>
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <p className="text-xs text-stone-400 uppercase tracking-wide font-semibold mb-1">Workspace</p>
            <p className="text-base font-semibold text-stone-900">
              {orgName ?? <span className="text-stone-400">Loading…</span>}
            </p>
          </div>
        </section>

        {/* App */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <DeviceMobile size={14} />
            App
          </h2>
          <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900">Install App</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {isStandalone
                  ? 'Already installed on this device'
                  : 'Add EstimateFlow to your home screen'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstall}
              disabled={isStandalone}
              className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:text-stone-300 disabled:cursor-not-allowed transition-colors"
            >
              <DeviceMobile size={16} />
              {isStandalone ? 'Installed' : 'Install'}
            </button>
          </div>
          <IOSInstallModal open={showIOSModal} onClose={() => setShowIOSModal(false)} />
        </section>
      </main>
    </div>
  )
}
