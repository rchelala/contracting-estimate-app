import { useEffect, useState } from 'react'
import { EnvelopeSimple, Buildings, UserCircle } from '@phosphor-icons/react'
import TopNav from '../components/layout/TopNav'
import { useAuth } from '../hooks/useAuth'
import { getMyMembership, type MyMembership } from '../services/organizations'
import { supabase } from '../lib/supabase'

function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return (local.slice(0, 2) || '?').toUpperCase()
}

export default function SettingsPage() {
  const { session } = useAuth()
  const [membership, setMembership] = useState<MyMembership | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)

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
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Settings</h1>

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
      </main>
    </div>
  )
}
