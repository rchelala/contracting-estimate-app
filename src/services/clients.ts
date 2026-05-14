import { supabase } from '../lib/supabase'
import type { EditorClient } from '../types/editor'

export type ClientRow = EditorClient

export async function listClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createClient(input: {
  organization_id: string
  name: string
  email?: string | null
  phone?: string | null
}): Promise<ClientRow> {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: input.organization_id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}
