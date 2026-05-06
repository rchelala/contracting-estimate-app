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
  let body: unknown
  try {
    body = JSON.parse(textBody)
  } catch {
    body = null
  }

  function isErrorPayload(value: unknown): value is { error?: string; details?: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'error' in value &&
      (typeof (value as { error?: unknown }).error === 'string' ||
        typeof (value as { error?: unknown }).error === 'undefined') &&
      (typeof (value as { details?: unknown }).details === 'string' ||
        typeof (value as { details?: unknown }).details === 'undefined')
    )
  }

  if (!response.ok) {
    const details =
      isErrorPayload(body) && body.error
        ? [body.error, body.details].filter(Boolean).join(': ')
        : textBody
    throw new Error(details || 'AI draft request failed')
  }

  // Refetch the estimate to get the updated data with AI-generated sections and line items
  return await getEstimate(estimateId)
}
