import { useRef, useState, useEffect } from 'react'
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

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  async function handleFile(file: File) {
    if (!item) {
      console.warn('[AttachPhotoButton] Line item not found in store')
      setError('Unable to find line item. Please try refreshing.')
      return
    }
    
    console.log('[AttachPhotoButton] Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lineItemId,
    })
    
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
      console.log('[AttachPhotoButton] Upload successful:', att.id)
      addAttachmentLocal(att)
      // Reset input so same file can be selected again
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Upload failed. Try again.'
      console.error('[AttachPhotoButton] Upload error:', errorMsg, e)
      setError(errorMsg)
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
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        className="text-slate-400 text-xs hover:text-slate-600 disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        title={error || 'Attach a photo'}
      >
        {uploading ? 'Uploading...' : 'Attach photo'}
      </button>
      {error && (
        <span className="text-red-500 text-xs ml-2 inline-block max-w-xs truncate" title={error}>
          {error}
        </span>
      )}
    </>
  )
}
