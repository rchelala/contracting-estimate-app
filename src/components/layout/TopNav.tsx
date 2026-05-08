import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Gear } from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'
import LogoBadge from '../ui/LogoBadge'

function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return (local.slice(0, 2) || '?').toUpperCase()
}

export default function TopNav() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const initials = getInitials(session?.user.email)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-stone-900 border-b-2 border-orange-500 pb-3' : 'text-stone-500 hover:text-stone-700'}`

  return (
    <nav className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <LogoBadge size={28} />
        <span className="text-sm font-bold text-stone-900 tracking-tight">EstimateFlow</span>
      </div>
      <div className="flex items-center gap-8">
        <NavLink to="/dashboard" className={linkClass}>Estimates</NavLink>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        >
          <Gear size={18} />
        </button>
        <div ref={popoverRef} className="relative ml-1">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-white text-sm font-bold flex items-center justify-center focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            {initials}
          </button>
          {open && (
            <div role="menu" className="absolute right-0 mt-2 w-40 bg-white border border-stone-200 rounded-lg shadow-md py-1 z-10">
              <button
                role="menuitem"
                type="button"
                onClick={() => { void signOut() }}
                className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-stone-900"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
