import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useSyncQueue } from '../../stores/syncQueueStore'
import DragHandle from './DragHandle'

interface Props {
  sectionId: string
  readOnly: boolean
  onRequestDelete: () => void
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
}

export default function SectionHeader({
  sectionId,
  readOnly,
  onRequestDelete,
  dragListeners,
  dragAttributes,
}: Props) {
  const section = useEditorStore((s) => s.sectionsById[sectionId])
  const updateLocal = useEditorStore((s) => s.updateSectionLocal)
  const enqueue = useSyncQueue((s) => s.enqueue)
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

  if (!section) return null

  function handleNameBlur(next: string) {
    if (next === section!.name) return
    updateLocal(sectionId, { name: next })
    enqueue({ kind: 'section.update', id: sectionId, patch: { name: next } })
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-200">
      <DragHandle
        {...(dragListeners !== undefined ? { listeners: dragListeners } : {})}
        {...(dragAttributes !== undefined ? { attributes: dragAttributes } : {})}
      />
      <input
        type="text"
        defaultValue={section.name}
        maxLength={200}
        disabled={readOnly}
        className="flex-1 text-base font-semibold text-slate-900 border-0 bg-transparent focus:outline-none focus:border-b-2 focus:border-blue-600 placeholder:text-slate-400 disabled:cursor-not-allowed"
        onBlur={(e) => handleNameBlur(e.target.value)}
      />
      <div ref={ref} className="relative ml-auto">
        <button
          type="button"
          aria-label="Row actions"
          disabled={readOnly}
          className="text-slate-400 hover:text-slate-600 min-h-[44px] w-8 flex items-center justify-center disabled:opacity-50"
          onClick={() => setOpen((v) => !v)}
        >
          ⋮
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-md z-20 py-1"
          >
            <button
              role="menuitem"
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50"
              onClick={() => {
                onRequestDelete()
                setOpen(false)
              }}
            >
              Delete section
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
