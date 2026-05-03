import { supabase } from '../lib/supabase'
import type { EditorSection } from '../types/editor'

export async function createSection(input: {
  organization_id: string; estimate_id: string; name: string; position: number
}): Promise<EditorSection> {
  const { data, error } = await supabase.from('estimate_sections').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function updateSection(id: string, patch: Partial<Pick<EditorSection, 'name' | 'position'>>): Promise<EditorSection> {
  const { data, error } = await supabase.from('estimate_sections').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteSection(id: string): Promise<void> {
  const { error } = await supabase.from('estimate_sections').delete().eq('id', id)
  if (error) throw error
}
