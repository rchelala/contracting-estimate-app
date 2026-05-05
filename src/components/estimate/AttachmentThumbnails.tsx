import { useEffect, useMemo, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { deleteAttachment, getAttachmentUrl } from '../../services/attachments'

interface Props {
  lineItemId: string
  readOnly: boolean
}

export default function AttachmentThumbnails({ lineItemId, readOnly }: Props) {
  const attachmentsById = useEditorStore((s) => s.attachmentsById)
  const attachments = useMemo(
    () => Object.values(attachmentsById).filter((a) => a.line_item_id === lineItemId),
    [attachmentsById, lineItemId],
  )
  const removeLocal = useEditorStore((s) => s.removeAttachmentLocal)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      const next: Record<string, string> = { ...urls }
      const errors: Record<string, string> = {}
      let changed = false
      for (const a of attachments) {
        if (next[a.id]) continue
        try {
          next[a.id] = await getAttachmentUrl(a.storage_path)
          changed = true
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Failed to load image'
          errors[a.id] = errorMsg
          console.error(`[AttachmentThumbnails] Failed to load attachment ${a.id}:`, e)
        }
      }
      if (!cancelled) {
        if (changed) setUrls(next)
        if (Object.keys(errors).length > 0) setLoadErrors(errors)
      }
    }
    if (attachments.length > 0) void loadAll()
    return () => {
      cancelled = true
    }
  }, [attachments, urls])

  if (attachments.length === 0) return null

  async function handleRemove(id: string, path: string) {
    try {
      console.log('[AttachmentThumbnails] Removing attachment:', id)
      await deleteAttachment(id, path)
      removeLocal(id)
    } catch (e) {
      console.error('[AttachmentThumbnails] Failed to remove attachment:', e)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 pb-2 overflow-x-auto">
      {attachments.map((a) => (
        <div key={a.id} className="relative shrink-0 group" title={a.filename}>
          {urls[a.id] ? (
            <img
              src={urls[a.id]}
              alt={a.filename}
              className="w-12 h-12 rounded-sm object-cover border border-slate-200"
            />
          ) : loadErrors[a.id] ? (
            <div
              className="w-12 h-12 rounded-sm bg-red-50 border border-red-200 flex items-center justify-center"
              title={loadErrors[a.id]}
            >
              <span className="text-xs text-red-500">!</span>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-sm bg-slate-100 animate-pulse" />
          )}
          {!readOnly && (
            <button
              type="button"
              aria-label="Remove photo"
              className="absolute -top-1 -right-1 bg-white border border-slate-200 rounded-full w-4 h-4 text-xs text-slate-500 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                void handleRemove(a.id, a.storage_path)
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
