import Anthropic from '@anthropic-ai/sdk'
import { createAuthSupabase } from '../lib/supabase.js'
import { CATEGORY_PROMPT_MAP } from '../../src/constants/categoryConfig.js'
import type { CategoryId } from '../../src/constants/categoryConfig.js'

interface WizardQuestionsRequest {
  description: string
  video_transcript?: string
  photo_count: number
  zip_code?: string
  category?: CategoryId
}

interface JsonResponseWriter {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body: string): void
}

type RawRequest = { body?: unknown; headers: Record<string, string | string[] | undefined>; method?: string }

function jsonResponse(res: JsonResponseWriter, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: RawRequest, res: JsonResponseWriter) {
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' })
  }

  const authorization = (req.headers.authorization as string) ?? ''
  const supabase = createAuthSupabase(authorization)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return jsonResponse(res, 401, { error: 'Authentication required' })

  const body = req.body as WizardQuestionsRequest
  const { description, video_transcript, photo_count, zip_code, category } = body

  if ((!description || !description.trim()) && (!video_transcript || !video_transcript.trim())) {
    return jsonResponse(res, 400, { error: 'description or video_transcript is required' })
  }

  const locationContext = zip_code ? ` The job is in zip code ${zip_code}.` : ''
  const photoContext = photo_count > 0
    ? ` The contractor has provided ${photo_count} photo(s) of the job site.`
    : ''

  const categoryConfig = category ? CATEGORY_PROMPT_MAP[category] : null
  const categoryContext = categoryConfig
    ? `\n\nContractor category: ${categoryConfig.label}. ${categoryConfig.questionsPromptContext}`
    : ''

  const transcriptContext = video_transcript?.trim()
    ? `\n\nVideo walkthrough transcript: "${video_transcript.trim()}"`
    : ''

  const jobContext = description?.trim()
    ? `\n\nJob description: "${description.trim()}"${locationContext}${photoContext}`
    : `${locationContext}${photoContext}`

  const prompt = `You are an assistant helping a contractor scope a new job. Based on the information below, generate 3 to 5 focused follow-up questions the contractor should ask their client to accurately scope the work and price it. Questions must be phrased in second person, directed at the contractor's client (e.g. "Will you be supplying the paint, or should we include materials?" not "Will I be supplying the paint?"). Keep questions short, practical, and directly relevant to the work described.${categoryContext}${transcriptContext}${jobContext}

Return ONLY a JSON array of question strings, no explanation. Example:
["Question 1?", "Question 2?", "Question 3?"]`

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const first = message.content[0]
    const text = first?.type === 'text' ? first.text.trim() : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    const questions: string[] = match ? JSON.parse(match[0]) : []

    return jsonResponse(res, 200, { questions })
  } catch (err) {
    console.error('wizard-questions error:', err)
    return jsonResponse(res, 502, { error: 'Failed to generate questions' })
  }
}
