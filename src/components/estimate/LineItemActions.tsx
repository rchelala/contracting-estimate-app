import { useEffect, useRef, useState } from 'react'

interface Props {
  optional: boolean
  onToggleOptional: () => void
  onDelete: () => void
  disabled?: boolean
}

export default function LineItemActions({ optional, onToggleOptional, onDelete, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  return (
    <div ref={ref} className="relative w-8">
      <button
        type="button"
        aria-label="Row actions"
        disabled={disabled}
        className="text-slate-400 hover:text-slate-600 min-h-[44px] w-8 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => setOpen((v) => !v)}
      >
        ⋮
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-md z-20 py-1">
          <button
            role="menuitem"
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => { onToggleOptional(); setOpen(false) }}
          >
            {optional ? 'Remove optional' : 'Mark optional'}
          </button>
          <button
            role="menuitem"
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50"
            onClick={() => { onDelete(); setOpen(false) }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
