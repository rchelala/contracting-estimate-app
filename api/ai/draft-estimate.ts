import { getServiceSupabase, createAuthSupabase } from '../lib/supabase.js'
import { CATEGORY_PROMPT_MAP } from '../../src/constants/categoryConfig.js'
import type { CategoryId } from '../../src/constants/categoryConfig.js'

interface AIDraftRequestBody {
  estimate_id: string
  description: string
  zip_code?: string
  qa_pairs?: { question: string; answer: string | null }[]
  attachment_ids?: string[]
  category?: CategoryId
}

type AIDraftLineItem = {
  description: string
  quantity: number
  unit: string
  unit_price_low_cents: number
  unit_price_typical_cents: number
  unit_price_high_cents: number
  markup_pct: number
  taxable: boolean
}

type AIDraftSection = {
  name: string
  line_items: AIDraftLineItem[]
}

type AIProviderAttempt = {
  responseJson: unknown
  completionText: string
  inputTokens: number
  outputTokens: number
}

interface JsonResponseWriter {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body: string): void
}

interface AsyncBodyStream {
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array | string>
}

type RawRequest = { body?: unknown } & Partial<AsyncBodyStream>

function jsonResponse(res: JsonResponseWriter, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function getRawBody(req: RawRequest): Promise<string> {
  if (req.body) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  const chunks: Uint8Array[] = []
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req as AsyncBodyStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
  }

  return Buffer.concat(chunks).toString('utf8')
}

function extractJson(text: string): unknown {
  const cleaned = removeJsonFences(text).trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const jsonBlock = findJsonBlock(cleaned)
    if (jsonBlock) {
      return JSON.parse(jsonBlock)
    }

    const wrapped = wrapBareSections(cleaned)
    if (wrapped) {
      return JSON.parse(wrapped)
    }

    throw new Error('Failed to parse JSON from AI response')
  }
}

function removeJsonFences(text: string): string {
  const fenced = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1')
  return fenced.replace(/`([^`]+)`/g, '$1')
}

function findJsonBlock(text: string): string | null {
  const startIndex = text.indexOf('{')
  if (startIndex < 0) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (char === '\\') {
      escape = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return text.slice(startIndex, i + 1)
      }
    }
  }

  return null
}

function wrapBareSections(text: string): string | null {
  const trimmed = text.trim()
  if (/^("?sections"?\s*:)/i.test(trimmed)) {
    return `{${trimmed}}`
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateDraftResponse(raw: unknown): AIDraftSection[] {
  if (!isRecord(raw)) {
    throw new Error('AI response must be a JSON object with a sections array')
  }

  const sections = raw.sections
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('AI response must contain a non-empty sections array')
  }

  return sections.map((section: unknown, sectionIndex: number) => {
    if (!isRecord(section)) {
      throw new Error(`Section ${sectionIndex + 1} must be an object`)
    }
    if (typeof section.name !== 'string' || !section.name.trim()) {
      throw new Error(`Section ${sectionIndex + 1} requires a name`)
    }
    if (!Array.isArray(section.line_items) || section.line_items.length === 0) {
      throw new Error(`Section ${section.name} must contain at least one line item`)
    }

    return {
      name: section.name.trim(),
      line_items: section.line_items.map((item: unknown, itemIndex: number) => {
        if (!isRecord(item)) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} must be an object`)
        }
        if (typeof item.description !== 'string' || !item.description.trim()) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires a description`)
        }
        if (typeof item.unit !== 'string') {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires a unit string`)
        }
        const quantity = Number(item.quantity)
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires a positive quantity`)
        }
        const low = Math.round(Number(item.unit_price_low_cents))
        const typical = Math.round(Number(item.unit_price_typical_cents))
        const high = Math.round(Number(item.unit_price_high_cents))
        if (!Number.isFinite(low) || low < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires unit_price_low_cents as a non-negative number`)
        }
        if (!Number.isFinite(typical) || typical < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires unit_price_typical_cents as a non-negative number`)
        }
        if (!Number.isFinite(high) || high < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires unit_price_high_cents as a non-negative number`)
        }
        const markup = Number(item.markup_pct)
        if (!Number.isFinite(markup) || markup < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires markup_pct as a non-negative number`)
        }
        const taxable = item.taxable === true || item.taxable === 'true' || item.taxable === 1
        if (item.taxable !== false && item.taxable !== 'false' && item.taxable !== 0 && !taxable) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires taxable true or false`)
        }

        return {
          description: item.description.trim(),
          quantity,
          unit: item.unit.trim(),
          unit_price_low_cents: low,
          unit_price_typical_cents: typical,
          unit_price_high_cents: high,
          markup_pct: markup,
          taxable,
        }
      }),
    }
  })
}

function buildEnrichedContext(
  description: string,
  zipCode?: string,
  qaPairs?: { question: string; answer: string | null }[]
): string {
  let context = description || '(No description provided)'

  if (zipCode) {
    context += `\n\nJob location ZIP code: ${zipCode} — use regional labor and material pricing for this area.`
  }

  if (qaPairs && qaPairs.length > 0) {
    const answered = qaPairs.filter((p) => p.answer)
    if (answered.length > 0) {
      context += '\n\nContractor Q&A:\n'
      answered.forEach((p) => {
        context += `Q: ${p.question}\nA: ${p.answer}\n`
      })
    }
  }

  return context
}

async function buildImageBlocks(
  attachmentIds: string[],
  serviceSupabase: ReturnType<typeof getServiceSupabase>
): Promise<Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>> {
  if (!attachmentIds.length) return []

  const { data: attachments } = await serviceSupabase
    .from('estimate_attachments')
    .select('storage_path, content_type')
    .in('id', attachmentIds)

  if (!attachments?.length) return []

  const blocks: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = []

  for (const att of attachments) {
    if (!att.content_type.startsWith('image/')) continue

    const { data: signedData } = await serviceSupabase.storage
      .from('estimate-attachments')
      .createSignedUrl(att.storage_path, 60)

    if (!signedData?.signedUrl) continue

    try {
      const imgResponse = await fetch(signedData.signedUrl)
      const buffer = await imgResponse.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: att.content_type, data: base64 },
      })
    } catch {
      // Skip unloadable images
    }
  }

  return blocks
}

function buildPrompt(description: string, categoryContext?: string): string {
  const categorySection = categoryContext
    ? `\nContractor category guidance:\n${categoryContext}\n`
    : ''
  return `Generate a contractor estimate draft for the job description below.
${categorySection}
Requirements:
- Use the create_estimate_draft tool.
- The tool input must include a non-empty sections array.
- Each section must include at least one line item.
- Use integer cents for all unit prices.
- Each line item must include description, quantity, unit, unit_price_low_cents, unit_price_typical_cents, unit_price_high_cents, markup_pct, and taxable.
- If the job description is brief, make reasonable contractor-style assumptions and still create a draft.

Job description:
${description}
`}

function calculateCostCents(inputTokens: number, outputTokens: number): number {
  const inputPricePerThousand = Number(process.env.ANTHROPIC_INPUT_PRICE_PER_1K_TOKENS_CENTS ?? 0)
  const outputPricePerThousand = Number(process.env.ANTHROPIC_OUTPUT_PRICE_PER_1K_TOKENS_CENTS ?? 0)
  return Math.round((inputTokens * inputPricePerThousand + outputTokens * outputPricePerThousand) / 1000)
}

function getTokens(responseJson: unknown) {
  if (!isRecord(responseJson)) {
    return { inputTokens: 0, outputTokens: 0 }
  }

  const usage = isRecord(responseJson.usage) ? responseJson.usage : undefined
  const inputTokens = Number(usage?.input_tokens ?? responseJson.input_tokens ?? 0)
  const outputTokens = Number(usage?.output_tokens ?? 0)

  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  }
}

export function collectTextContent(value: unknown): string[] {
  if (!isRecord(value)) {
    return []
  }

  const directText = typeof value.text === 'string' ? [value.text] : []
  const completion = typeof value.completion === 'string' ? [value.completion] : []
  const output = typeof value.output === 'string' ? [value.output] : []

  const nestedText = ['content', 'output']
    .flatMap((key) => {
      const nested = value[key]
      if (!Array.isArray(nested)) {
        return []
      }

      return nested.flatMap((item) => collectTextContent(item))
    })

  return [...completion, ...output, ...directText, ...nestedText].filter((text) => text.trim().length > 0)
}

export function findToolInput(value: unknown): unknown | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.type === 'tool_use' && isRecord(value.input)) {
    return value.input
  }

  for (const key of ['content', 'output']) {
    const nested = value[key]
    if (!Array.isArray(nested)) {
      continue
    }

    for (const item of nested) {
      const input = findToolInput(item)
      if (input) {
        return input
      }
    }
  }

  return null
}

export function getCompletionText(responseJson: unknown, rawResponseText: string): string {
  if (isRecord(responseJson)) {
    const textParts = collectTextContent(responseJson)
    if (textParts.length > 0) {
      return textParts.join('\n')
    }
  }

  return rawResponseText
}

function getDraftPayload(responseJson: unknown, rawResponseText: string): unknown {
  const toolInput = findToolInput(responseJson)
  if (toolInput) {
    return toolInput
  }

  return extractJson(getCompletionText(responseJson, rawResponseText))
}

function buildDraftTool() {
  return {
    name: 'create_estimate_draft',
    description:
      'Create a structured contractor estimate draft. The input must contain sections, and every section must contain line_items.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['sections'],
      properties: {
        sections: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'line_items'],
            properties: {
              name: { type: 'string', minLength: 1 },
              line_items: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'description',
                    'quantity',
                    'unit',
                    'unit_price_low_cents',
                    'unit_price_typical_cents',
                    'unit_price_high_cents',
                    'markup_pct',
                    'taxable',
                  ],
                  properties: {
                    description: { type: 'string', minLength: 1 },
                    quantity: { type: 'number', exclusiveMinimum: 0 },
                    unit: { type: 'string' },
                    unit_price_low_cents: { type: 'integer', minimum: 0 },
                    unit_price_typical_cents: { type: 'integer', minimum: 0 },
                    unit_price_high_cents: { type: 'integer', minimum: 0 },
                    markup_pct: { type: 'number', minimum: 0 },
                    taxable: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
}

async function requestAIDraft(
  anthropicKey: string,
  anthropicModel: string,
  prompt: string,
  retryReason?: string,
  imageBlocks?: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>,
): Promise<AIProviderAttempt> {
  const textContent = retryReason
    ? `${prompt}

Previous tool input was invalid: ${retryReason}

Call create_estimate_draft again. The tool input must include at least one section, and every section must include at least one line item. Never return an empty sections array.`
    : prompt

  const userContentBlocks = [
    ...(imageBlocks ?? []),
    { type: 'text', text: textContent },
  ]

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 4000,
      temperature: 0.0,
      system:
        'You are an expert contractor estimate assistant. You must call create_estimate_draft with useful, non-empty estimate sections and line items.',
      tools: [buildDraftTool()],
      tool_choice: { type: 'tool', name: 'create_estimate_draft' },
      messages: [
        {
          role: 'user',
          content: userContentBlocks,
        },
      ],
    }),
  })

  const rawResponseText = await aiResponse.text()
  if (!aiResponse.ok) {
    throw new Error(`AI provider error: ${rawResponseText}`)
  }

  let responseJson: unknown
  try {
    responseJson = JSON.parse(rawResponseText)
  } catch {
    responseJson = { content: [{ text: rawResponseText }] }
  }

  const { inputTokens, outputTokens } = getTokens(responseJson)
  return {
    responseJson,
    completionText: getCompletionText(responseJson, rawResponseText),
    inputTokens,
    outputTokens,
  }
}

function startOfCurrentMonth(): string {
  const now = new Date()
  return new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString()
}

export default async function handler(
  req: RawRequest & { headers?: Record<string, string | undefined>; method?: string },
  res: JsonResponseWriter,
) {
  try {
    if (req.method !== 'POST') {
      return jsonResponse(res, 405, { error: 'Method not allowed' })
    }

    const authorization = req.headers?.authorization
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse(res, 401, { error: 'Authentication required' })
    }

    const bodyText = await getRawBody(req)
    let body: AIDraftRequestBody
    try {
      body = JSON.parse(bodyText) as AIDraftRequestBody
    } catch {
      return jsonResponse(res, 400, { error: 'Invalid JSON body' })
    }

  const { estimate_id: estimateId, description, zip_code, qa_pairs, attachment_ids, category } = body
  if (!estimateId || typeof estimateId !== 'string') {
    return jsonResponse(res, 400, { error: 'estimate_id is required' })
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return jsonResponse(res, 400, { error: 'description is required' })
  }

  const authClient = createAuthSupabase(authorization)
  const { data: userData, error: userError } = await authClient.auth.getUser()
  if (userError || !userData?.user) {
    return jsonResponse(res, 401, { error: 'Invalid authentication token' })
  }

  const serviceSupabase = getServiceSupabase()
  const estimateResult = await serviceSupabase
    .from('estimates')
    .select('id,organization_id,status')
    .eq('id', estimateId)
    .single()
  if (estimateResult.error || !estimateResult.data) {
    return jsonResponse(res, 404, { error: 'Estimate not found' })
  }

  const estimate = estimateResult.data
  if (estimate.status !== 'draft') {
    return jsonResponse(res, 400, { error: 'AI drafting is only allowed for draft estimates' })
  }

  const membershipResult = await serviceSupabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', estimate.organization_id)
    .eq('user_id', userData.user.id)
    .single()
  if (membershipResult.error || !membershipResult.data) {
    return jsonResponse(res, 403, { error: 'User is not a member of estimate organization' })
  }

  const orgResult = await serviceSupabase
    .from('organizations')
    .select('plan,plan_period_start')
    .eq('id', estimate.organization_id)
    .single()
  if (orgResult.error || !orgResult.data) {
    return jsonResponse(res, 500, { error: 'Failed to load organization data' })
  }

  const organization = orgResult.data
  if (organization.plan === 'free') {
    const cutoff = organization.plan_period_start ?? startOfCurrentMonth()
    const countResult = await serviceSupabase
      .from('estimates')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', estimate.organization_id)
      .gte('created_at', cutoff)
    if (countResult.error) {
      return jsonResponse(res, 500, { error: 'Failed to calculate plan usage' })
    }
    const estimateCount = countResult.count ?? 0
    if (estimateCount >= 1000) {
      return jsonResponse(res, 403, {
        error: 'Free tier limit reached. Upgrade to Pro for unlimited AI drafts and estimates.',
      })
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const anthropicModel = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
  if (!anthropicKey) {
    return jsonResponse(res, 500, { error: 'AI backend is not configured' })
  }

  const enrichedContext = buildEnrichedContext(description.trim(), zip_code, qa_pairs)
  const categoryConfig = category ? CATEGORY_PROMPT_MAP[category] : null
  const prompt = buildPrompt(enrichedContext, categoryConfig?.draftPromptContext)
  const imageBlocks = await buildImageBlocks(attachment_ids ?? [], serviceSupabase)
  const promptStart = Date.now()
  let inputTokens = 0
  let outputTokens = 0
  const providerAttempts: AIProviderAttempt[] = []

  try {
    providerAttempts.push(await requestAIDraft(anthropicKey, anthropicModel, prompt, undefined, imageBlocks))
  } catch (error) {
    return jsonResponse(res, 502, { error: 'AI request failed', details: error instanceof Error ? error.message : String(error) })
  }

  let aiSections: AIDraftSection[] | null = null
  let parseError = 'Invalid AI payload. The AI output may have been truncated or did not return valid JSON.'
  try {
    for (let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1) {
      const attempt = providerAttempts[attemptIndex]
      if (!attempt) {
        throw new Error(parseError)
      }

      try {
        const parsed = getDraftPayload(attempt.responseJson, attempt.completionText)
        aiSections = validateDraftResponse(parsed)
        break
      } catch (error) {
        parseError = error instanceof Error ? error.message : parseError
        if (attemptIndex === 0) {
          providerAttempts.push(await requestAIDraft(anthropicKey, anthropicModel, prompt, parseError, imageBlocks))
        }
      }
    }
  } catch (error) {
    return jsonResponse(res, 502, {
      error: 'Failed to parse AI response',
      details: error instanceof Error ? error.message : parseError,
    })
  }

  if (!aiSections) {
    return jsonResponse(res, 502, { error: 'Failed to parse AI response', details: parseError })
  }

  const maxSectionPositionResult = await serviceSupabase
    .from('estimate_sections')
    .select('position')
    .eq('estimate_id', estimateId)
    .order('position', { ascending: false })
    .limit(1)
  if (maxSectionPositionResult.error) {
    return jsonResponse(res, 500, { error: 'Failed to load section positions' })
  }

  const maxSectionPosition = maxSectionPositionResult.data?.[0]?.position ?? 0
  const insertedSections: Array<{ id: string; name: string }> = []
  const insertedLineItems: Array<{ id: string; section_id: string }> = []

  for (const [sectionIndex, section] of aiSections.entries()) {
    const sectionPosition = maxSectionPosition + (sectionIndex + 1) * 10
    const { data: createdSection, error: sectionError } = await serviceSupabase
      .from('estimate_sections')
      .insert({
        organization_id: estimate.organization_id,
        estimate_id: estimateId,
        name: section.name,
        position: sectionPosition,
      })
      .select('id,name')
      .single()
    if (sectionError || !createdSection) {
      return jsonResponse(res, 500, { error: 'Failed to insert AI section' })
    }
    insertedSections.push(createdSection)

    for (const [lineIndex, lineItem] of section.line_items.entries()) {
      const { data: createdLineItem, error: lineError } = await serviceSupabase
        .from('estimate_line_items')
        .insert({
          organization_id: estimate.organization_id,
          estimate_id: estimateId,
          section_id: createdSection.id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          unit_price_cents: lineItem.unit_price_typical_cents,
          markup_pct: lineItem.markup_pct,
          optional: false,
          taxable: lineItem.taxable,
          source: 'ai',
          ai_price_low_cents: lineItem.unit_price_low_cents,
          ai_price_typical_cents: lineItem.unit_price_typical_cents,
          ai_price_high_cents: lineItem.unit_price_high_cents,
          position: (lineIndex + 1) * 10,
        })
        .select('id,section_id')
        .single()
      if (lineError || !createdLineItem) {
        return jsonResponse(res, 500, { error: 'Failed to insert AI line item' })
      }
      insertedLineItems.push(createdLineItem)
    }
  }

  const recalc = await serviceSupabase.rpc('recalculate_estimate_totals', { p_estimate_id: estimateId })
  if (recalc.error) {
    return jsonResponse(res, 500, { error: 'Failed to recalculate estimate totals' })
  }

  for (const attempt of providerAttempts) {
    inputTokens += attempt.inputTokens
    outputTokens += attempt.outputTokens
  }
  const latencyMs = Date.now() - promptStart
  const costCents = calculateCostCents(inputTokens, outputTokens)
  await serviceSupabase.from('ai_usage_events').insert({
    estimate_id: estimateId,
    organization_id: estimate.organization_id,
    user_id: userData.user.id,
    model: anthropicModel,
    call_type: 'draft_estimate',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_cents: costCents,
    latency_ms: latencyMs,
  })

  return jsonResponse(res, 200, {
    estimate_id: estimateId,
    sections: insertedSections.map((section) => ({
      id: section.id,
      name: section.name,
      line_item_ids: insertedLineItems.filter((item) => item.section_id === section.id).map((item) => item.id),
    })),
  })
  } catch (error) {
    return jsonResponse(res, 500, {
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
