import { useRef, useState } from 'react'
import { uploadAttachment } from '../../services/attachments'
import { useEditorStore } from '../../stores/editorStore'

interface Props {
  lineItemId: string
  disabled?: boolean
}

export default function AttachPhotoButton({ lineItemId, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const item = useEditorStore((s) => s.lineItemsById[lineItemId])
  const addAttachmentLocal = useEditorStore((s) => s.addAttachmentLocal)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!item) return
    setUploading(true)
    setError(null)
    try {
      const att = await uploadAttachment({
        file,
        organization_id: item.organization_id,
        estimate_id: item.estimate_id,
        section_id: item.section_id,
        line_item_id: lineItemId,
      })
      addAttachmentLocal(att)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        className="text-slate-400 text-xs hover:text-slate-600 disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading...' : 'Attach photo'}
      </button>
      {error && (
        <span className="text-red-500 text-xs ml-2">Upload failed. Try again.</span>
      )}
    </>
  )
}
