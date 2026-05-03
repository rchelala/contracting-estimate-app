import { useEffect, useState } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { deleteAttachment, getAttachmentUrl } from '../../services/attachments'

interface Props {
  lineItemId: string
  readOnly: boolean
}

export default function AttachmentThumbnails({ lineItemId, readOnly }: Props) {
  const attachments = useEditorStore((s) =>
    Object.values(s.attachmentsById).filter((a) => a.line_item_id === lineItemId)
  )
  const removeLocal = useEditorStore((s) => s.removeAttachmentLocal)
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      const next: Record<string, string> = {}
      for (const a of attachments) {
        if (urls[a.id]) {
          next[a.id] = urls[a.id]!
          continue
        }
        try {
          next[a.id] = await getAttachmentUrl(a.storage_path)
        } catch {
          // ignore single failure — thumbnail will show skeleton
        }
      }
      if (!cancelled) setUrls(next)
    }
    if (attachments.length > 0) void loadAll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments.length])

  if (attachments.length === 0) return null

  async function handleRemove(id: string, path: string) {
    try {
      await deleteAttachment(id, path)
      removeLocal(id)
    } catch {
      // surface elsewhere if needed
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 pb-2 overflow-x-auto">
      {attachments.map((a) => (
        <div key={a.id} className="relative shrink-0">
          {urls[a.id] ? (
            <img
              src={urls[a.id]}
              alt={a.filename}
              className="w-12 h-12 rounded-sm object-cover border border-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-sm bg-slate-100 animate-pulse" />
          )}
          {!readOnly && (
            <button
              type="button"
              aria-label="Remove photo"
              className="absolute -top-1 -right-1 bg-white border border-slate-200 rounded-full w-4 h-4 text-xs text-slate-500 hover:text-red-600 flex items-center justify-center"
              onClick={() => { void handleRemove(a.id, a.storage_path) }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
