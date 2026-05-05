import { getServiceSupabase, createAuthSupabase } from '../lib/supabase.js'

interface AIDraftRequestBody {
  estimate_id: string
  description: string
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

function jsonResponse(res: any, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function getRawBody(req: any): Promise<string> {
  if (req.body) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1))
    }
    throw new Error('Failed to parse JSON from AI response')
  }
}

function validateDraftResponse(raw: unknown): AIDraftSection[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AI response must be a JSON object with a sections array')
  }

  const sections = (raw as any).sections
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('AI response must contain a non-empty sections array')
  }

  return sections.map((section: any, sectionIndex: number) => {
    if (!section || typeof section !== 'object') {
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
      line_items: section.line_items.map((item: any, itemIndex: number) => {
        if (!item || typeof item !== 'object') {
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
        const low = Number(item.unit_price_low_cents)
        const typical = Number(item.unit_price_typical_cents)
        const high = Number(item.unit_price_high_cents)
        if (!Number.isInteger(low) || low < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires unit_price_low_cents as a non-negative integer`)
        }
        if (!Number.isInteger(typical) || typical < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires unit_price_typical_cents as a non-negative integer`)
        }
        if (!Number.isInteger(high) || high < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires unit_price_high_cents as a non-negative integer`)
        }
        const markup = Number(item.markup_pct)
        if (!Number.isFinite(markup) || markup < 0) {
          throw new Error(`Line item ${itemIndex + 1} in section ${section.name} requires markup_pct as a non-negative number`)
        }
        if (typeof item.taxable !== 'boolean') {
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
          taxable: item.taxable,
        }
      }),
    }
  })
}

function buildPrompt(description: string): string {
  return `You are an expert contractor estimate assistant. Generate a structured estimate draft with sections and line items based on the job description below.

Requirements:
- Return ONLY valid JSON.
- Use integer cents for all unit prices.
- Each line item must include description, quantity, unit, unit_price_low_cents, unit_price_typical_cents, unit_price_high_cents, markup_pct, and taxable.
- Avoid any text outside the JSON object.

Job description:
${description}

Output format:
{
  "sections": [
    {
      "name": "string",
      "line_items": [
        {
          "description": "string",
          "quantity": number,
          "unit": "string",
          "unit_price_low_cents": integer,
          "unit_price_typical_cents": integer,
          "unit_price_high_cents": integer,
          "markup_pct": number,
          "taxable": boolean
        }
      ]
    }
  ]
}
`}

function calculateCostCents(inputTokens: number, outputTokens: number): number {
  const inputPricePerThousand = Number(process.env.ANTHROPIC_INPUT_PRICE_PER_1K_TOKENS_CENTS ?? 0)
  const outputPricePerThousand = Number(process.env.ANTHROPIC_OUTPUT_PRICE_PER_1K_TOKENS_CENTS ?? 0)
  return Math.round((inputTokens * inputPricePerThousand + outputTokens * outputPricePerThousand) / 1000)
}

function getTokens(responseJson: any) {
  const inputTokens = Number(responseJson?.usage?.prompt_tokens ?? responseJson?.input_tokens ?? 0)
  const outputTokens = Number(responseJson?.usage?.completion_tokens ?? responseJson?.output_tokens ?? 0)
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  }
}

function startOfCurrentMonth(): string {
  const now = new Date()
  return new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString()
}

export default async function handler(req: any, res: any) {
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
    } catch (error) {
      return jsonResponse(res, 400, { error: 'Invalid JSON body' })
    }

  const { estimate_id: estimateId, description } = body
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
  const anthropicModel = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4.6'
  if (!anthropicKey) {
    return jsonResponse(res, 500, { error: 'AI backend is not configured' })
  }

  const prompt = buildPrompt(description.trim())
  const promptStart = Date.now()
  let completionText: string
  let responseJson: any

  try {
    const aiResponse = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': anthropicKey,
      },
      body: JSON.stringify({
        model: anthropicModel,
        prompt,
        max_tokens_to_sample: 1200,
        temperature: 0.2,
        stop_sequences: ['\n\nHuman:'],
      }),
    })

    const rawResponseText = await aiResponse.text()
    if (!aiResponse.ok) {
      return jsonResponse(res, 502, { error: 'AI provider error', details: rawResponseText })
    }

    try {
      responseJson = JSON.parse(rawResponseText)
    } catch {
      responseJson = { completion: rawResponseText }
    }

    completionText = typeof responseJson.completion === 'string'
      ? responseJson.completion
      : typeof responseJson?.completion?.[0]?.text === 'string'
      ? responseJson.completion[0].text
      : rawResponseText
  } catch (error) {
    return jsonResponse(res, 502, { error: 'AI request failed', details: error instanceof Error ? error.message : String(error) })
  }

  let aiSections: AIDraftSection[]
  try {
    const parsed = extractJson(completionText)
    aiSections = validateDraftResponse(parsed)
  } catch (error) {
    return jsonResponse(res, 502, {
      error: 'Failed to parse AI response',
      details: error instanceof Error ? error.message : 'Invalid AI payload',
    })
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

  const { inputTokens, outputTokens } = getTokens(responseJson)
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
