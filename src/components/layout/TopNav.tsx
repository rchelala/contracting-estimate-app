import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function getInitials(email: string | undefined): string {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return (local.slice(0, 2) || '?').toUpperCase()
}

export default function TopNav() {
  const { session, signOut } = useAuth()
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
    `text-sm font-semibold ${isActive ? 'text-slate-900 border-b-2 border-blue-600 pb-3' : 'text-slate-500 hover:text-slate-700'}`

  return (
    <nav className="h-14 bg-slate-100 border-b border-slate-200 flex items-center justify-between px-6">
      <span className="text-sm font-semibold text-slate-900">EstimateFlow</span>
      <div className="flex items-center gap-8">
        <NavLink to="/dashboard" className={linkClass}>Estimates</NavLink>
        <NavLink to="/settings" className={linkClass}>Settings</NavLink>
      </div>
      <div ref={popoverRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 text-sm font-semibold flex items-center justify-center focus:outline-hidden focus:ring-3 focus:ring-blue-600 focus:ring-offset-2"
        >
          {initials}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-md shadow-xs py-1 z-10">
            <button
              role="menuitem"
              type="button"
              onClick={() => { void signOut() }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
