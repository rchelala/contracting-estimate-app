import { supabase } from '../lib/supabase'
import type { EditorAttachment } from '../types/editor'

const BUCKET = 'estimate-attachments'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]

function normalizeStoragePath(storagePath: string): string {
  return storagePath.replaceAll('\\', '/').replace(/^\/+/, '').trim()
}

export async function uploadAttachment(input: {
  file: File
  organization_id: string
  estimate_id: string
  section_id?: string | null
  line_item_id?: string | null
}): Promise<EditorAttachment> {
  if (input.file.size > MAX_BYTES) throw new Error('File exceeds 10 MB limit')
  if (!ALLOWED_TYPES.includes(input.file.type)) throw new Error('Unsupported file type')

  const path = normalizeStoragePath(`${input.organization_id}/${input.estimate_id}/${crypto.randomUUID()}-${input.file.name}`)
  
  try {
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, input.file, {
      contentType: input.file.type,
      upsert: false,
    })
    if (uploadErr) {
      console.error('[uploadAttachment] Storage upload failed:', uploadErr)
      throw new Error(`Failed to upload file: ${uploadErr.message}`)
    }
  } catch (e) {
    console.error('[uploadAttachment] Storage error:', e)
    throw e instanceof Error ? e : new Error('Failed to upload file to storage')
  }

  try {
    const { data, error } = await supabase.from('estimate_attachments').insert({
      organization_id: input.organization_id,
      estimate_id: input.estimate_id,
      section_id: input.section_id ?? null,
      line_item_id: input.line_item_id ?? null,
      storage_path: path,
      filename: input.file.name,
      content_type: input.file.type,
      size_bytes: input.file.size,
    }).select('*').single()
    
    if (error) {
      console.error('[uploadAttachment] Database insert failed:', error)
      throw new Error(`Failed to save attachment: ${error.message}`)
    }
    
    return data
  } catch (e) {
    console.error('[uploadAttachment] Database error:', e)
    throw e instanceof Error ? e : new Error('Failed to save attachment to database')
  }
}

export async function deleteAttachment(id: string, storagePath: string): Promise<void> {
  const normalizedPath = normalizeStoragePath(storagePath)
  try {
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([normalizedPath])
    if (storageErr) {
      console.error('[deleteAttachment] Storage delete failed:', normalizedPath, storageErr)
    }
  } catch (e) {
    console.error('[deleteAttachment] Storage error:', normalizedPath, e)
  }

  try {
    const { error: dbErr } = await supabase.from('estimate_attachments').delete().eq('id', id)
    if (dbErr) {
      console.error('[deleteAttachment] Database delete failed:', dbErr)
      throw new Error(`Failed to delete attachment: ${dbErr.message}`)
    }
  } catch (e) {
    console.error('[deleteAttachment] Error:', e)
    throw e instanceof Error ? e : new Error('Failed to delete attachment')
  }
}

export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const normalizedPath = normalizeStoragePath(storagePath)
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(normalizedPath, 3600)
    if (error) {
      console.error('[getAttachmentUrl] Failed to create signed URL:', normalizedPath, error)
      throw new Error(`Failed to load attachment: ${error.message}`)
    }
    return data.signedUrl
  } catch (e) {
    console.error('[getAttachmentUrl] Error:', normalizedPath, e)
    throw e instanceof Error ? e : new Error('Failed to load attachment')
  }
}
