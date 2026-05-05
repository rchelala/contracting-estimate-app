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

  const textBody = await response.text()
  let body: any
  try {
    body = JSON.parse(textBody)
  } catch {
    body = null
  }

  if (!response.ok) {
    const details = body?.error ? body.error : textBody
    throw new Error(details || 'AI draft request failed')
  }

  // Refetch the estimate to get the updated data with AI-generated sections and line items
  return await getEstimate(estimateId)
}
