import { supabase } from '../lib/supabase'
import type { EditorAttachment } from '../types/editor'

const BUCKET = 'estimate-attachments'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadAttachment(input: {
  file: File
  organization_id: string
  estimate_id: string
  section_id?: string | null
  line_item_id?: string | null
}): Promise<EditorAttachment> {
  if (input.file.size > MAX_BYTES) throw new Error('File exceeds 10 MB limit')
  if (!ALLOWED_TYPES.includes(input.file.type)) throw new Error('Unsupported file type')

  const path = `${input.organization_id}/${input.estimate_id}/${crypto.randomUUID()}-${input.file.name}`
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, input.file, {
    contentType: input.file.type, upsert: false,
  })
  if (uploadErr) throw uploadErr

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
  if (error) throw error
  return data
}

export async function deleteAttachment(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath])
  const { error } = await supabase.from('estimate_attachments').delete().eq('id', id)
  if (error) throw error
}

export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  if (error) throw error
  return data.signedUrl
}
