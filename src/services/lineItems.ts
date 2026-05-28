import { supabase } from '../lib/supabase'
import type { EditorLineItem } from '../types/editor'

export async function createLineItem(input: {
  organization_id: string; estimate_id: string; section_id: string;
  description: string; position: number;
}): Promise<EditorLineItem> {
  const { data, error } = await supabase.from('estimate_line_items').insert({
    ...input, quantity: 1, unit_price_cents: 0, markup_pct: 0, optional: false, taxable: true,
  }).select('*').single()
  if (error) throw error
  return data
}

export async function updateLineItem(
  id: string,
  patch: Partial<Pick<EditorLineItem, 'billable' | 'description' | 'quantity' | 'unit_price_cents' | 'markup_pct' | 'optional' | 'position' | 'section_id'>>
): Promise<EditorLineItem> {
  const { data, error } = await supabase.from('estimate_line_items').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteLineItem(id: string): Promise<void> {
  const { error } = await supabase.from('estimate_line_items').delete().eq('id', id)
  if (error) throw error
}
