import { supabase } from '../lib/supabase'
import type { CategoryId } from '../constants/categoryConfig'

export interface WizardDraftInput {
  estimateId: string
  description: string
  zipCode?: string
  qaPairs: { question: string; answer: string | null }[]
  attachmentIds: string[]
  category?: CategoryId
}

export async function fetchWizardQuestions(input: {
  description: string
  photoCount: number
  zipCode?: string
  category?: CategoryId
}): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch('/api/ai/wizard-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: input.description,
      photo_count: input.photoCount,
      zip_code: input.zipCode || undefined,
      category: input.category || undefined,
    }),
  })

  if (!response.ok) throw new Error('Failed to fetch questions')
  const data = await response.json() as { questions: string[] }
  return data.questions
}

export async function draftEstimateFromWizard(input: WizardDraftInput): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const response = await fetch('/api/ai/draft-estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      estimate_id: input.estimateId,
      description: input.description,
      zip_code: input.zipCode || undefined,
      qa_pairs: input.qaPairs,
      attachment_ids: input.attachmentIds,
      category: input.category || undefined,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
    throw new Error(err.error ?? 'Failed to draft estimate')
  }
}
