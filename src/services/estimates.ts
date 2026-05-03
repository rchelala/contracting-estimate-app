import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'
import type { FullEstimate, EditorEstimate } from '../types/editor'

type EstimateRow = Database['public']['Tables']['estimates']['Row']
export type EstimateStatus = Database['public']['Enums']['estimate_status']

export interface EstimateListRow {
  id: EstimateRow['id']
  estimate_number: EstimateRow['estimate_number']
  title: EstimateRow['title']
  status: EstimateStatus
  total_cents: EstimateRow['total_cents']
  updated_at: EstimateRow['updated_at']
  client_name: string | null
}

export async function listEstimates(): Promise<EstimateListRow[]> {
  const { data, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, title, status, total_cents, updated_at, clients ( name )')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw error
  const rows = (data ?? []) as Array<EstimateRow & { clients: { name: string } | null }>
  return rows.map((r) => ({
    id: r.id,
    estimate_number: r.estimate_number,
    title: r.title,
    status: r.status as EstimateStatus,
    total_cents: r.total_cents,
    updated_at: r.updated_at,
    client_name: r.clients?.name ?? null,
  }))
}

export async function createEstimate(organizationId: string): Promise<EditorEstimate> {
  const { data: estimateNumber, error: rpcError } = await supabase.rpc('next_estimate_number', { p_org_id: organizationId })
  if (rpcError) throw rpcError
  if (!estimateNumber) throw new Error('Failed to allocate estimate number')

  const { data: estimate, error: insertError } = await supabase
    .from('estimates')
    .insert({ organization_id: organizationId, estimate_number: estimateNumber, status: 'draft' })
    .select('*')
    .single()
  if (insertError) throw insertError

  // Default first section so estimate is never empty (EST-03)
  const { error: sectionError } = await supabase
    .from('estimate_sections')
    .insert({ organization_id: organizationId, estimate_id: estimate.id, name: 'Section 1', position: 10 })
  if (sectionError) throw sectionError

  return estimate
}

export async function getEstimate(estimateId: string): Promise<FullEstimate> {
  const [estimateRes, sectionsRes, lineItemsRes, attachmentsRes] = await Promise.all([
    supabase.from('estimates').select('*').eq('id', estimateId).single(),
    supabase.from('estimate_sections').select('*').eq('estimate_id', estimateId).order('position', { ascending: true }),
    supabase.from('estimate_line_items').select('*').eq('estimate_id', estimateId).order('position', { ascending: true }),
    supabase.from('estimate_attachments').select('*').eq('estimate_id', estimateId),
  ])
  if (estimateRes.error) throw estimateRes.error
  if (sectionsRes.error) throw sectionsRes.error
  if (lineItemsRes.error) throw lineItemsRes.error
  if (attachmentsRes.error) throw attachmentsRes.error
  return {
    estimate: estimateRes.data,
    sections: sectionsRes.data ?? [],
    lineItems: lineItemsRes.data ?? [],
    attachments: attachmentsRes.data ?? [],
  }
}

export async function updateEstimate(
  estimateId: string,
  patch: Partial<Pick<EditorEstimate, 'title' | 'client_id' | 'notes'>>
): Promise<EditorEstimate> {
  const { data, error } = await supabase
    .from('estimates').update(patch).eq('id', estimateId).select('*').single()
  if (error) throw error
  return data
}

export async function recalcTotals(estimateId: string): Promise<void> {
  const { error } = await supabase.rpc('recalculate_estimate_totals', { p_estimate_id: estimateId })
  if (error) throw error
}

export async function markEstimateSent(estimateId: string): Promise<EditorEstimate> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('estimates')
    .update({ status: 'sent', sent_at: now, first_sent_at: now })
    .eq('id', estimateId).select('*').single()
  if (error) throw error
  return data
}

export async function duplicateEstimate(sourceEstimateId: string, organizationId: string): Promise<EditorEstimate> {
  const source = await getEstimate(sourceEstimateId)
  const { data: estimateNumber, error: rpcErr } = await supabase.rpc('next_estimate_number', { p_org_id: organizationId })
  if (rpcErr) throw rpcErr

  const { data: newEst, error: estErr } = await supabase.from('estimates').insert({
    organization_id: organizationId,
    estimate_number: estimateNumber!,
    status: 'draft',
    client_id: source.estimate.client_id,
    title: source.estimate.title ? `${source.estimate.title} (copy)` : null,
    notes: source.estimate.notes,
  }).select('*').single()
  if (estErr) throw estErr

  // Map old section ids -> new section ids
  const sectionIdMap = new Map<string, string>()
  for (const s of source.sections) {
    const { data: newSec, error: secErr } = await supabase.from('estimate_sections').insert({
      organization_id: organizationId, estimate_id: newEst.id, name: s.name, position: s.position,
    }).select('id').single()
    if (secErr) throw secErr
    sectionIdMap.set(s.id, newSec.id)
  }
  for (const li of source.lineItems) {
    const newSectionId = sectionIdMap.get(li.section_id)
    if (!newSectionId) continue
    const { error: liErr } = await supabase.from('estimate_line_items').insert({
      organization_id: organizationId, estimate_id: newEst.id, section_id: newSectionId,
      description: li.description, quantity: li.quantity, unit_price_cents: li.unit_price_cents,
      markup_pct: li.markup_pct, optional: li.optional, taxable: li.taxable, position: li.position,
    })
    if (liErr) throw liErr
  }
  await recalcTotals(newEst.id)
  const { data: refreshed } = await supabase.from('estimates').select('*').eq('id', newEst.id).single()
  return refreshed ?? newEst
}
