import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

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
