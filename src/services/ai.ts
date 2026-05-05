import { supabase } from '../lib/supabase'
import { getEstimate } from './estimates'
import type { FullEstimate } from '../types/editor'

export interface AIDraftEstimateSection {
  id: string
  name: string
  line_item_ids: string[]
}

export interface DraftEstimateResult {
  estimate_id: string
  sections: AIDraftEstimateSection[]
}

export async function draftEstimate(estimateId: string, description: string): Promise<FullEstimate> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch('/api/ai/draft-estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ estimate_id: estimateId, description }),
  })

  const body = await response.json()
  if (!response.ok) {
    throw new Error((body && (body.error as string)) || 'AI draft request failed')
  }

  // Refetch the estimate to get the updated data with AI-generated sections and line items
  return await getEstimate(estimateId)
}
