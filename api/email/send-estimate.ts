import { Resend } from 'resend'
import { getServiceSupabase, createAuthSupabase } from '../lib/supabase.js'

const resend = new Resend(process.env.RESEND_API_KEY)

interface RequestBody {
  estimate_id: string
  to: string
  subject: string
  message: string
}

interface JsonResponseWriter {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body: string): void
}

type AsyncBodyStream = {
  body?: unknown
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}

function json(res: JsonResponseWriter, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function getRawBody(req: AsyncBodyStream): Promise<string> {
  if (req.body) {
    return typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }
  const chunks: Uint8Array[] = []
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req as AsyncIterable<Uint8Array | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
  }
  return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(
  req: AsyncBodyStream & { method?: string; headers?: Record<string, string | string[] | undefined> },
  res: JsonResponseWriter
) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method Not Allowed' })

  const authorization = (req.headers?.authorization ?? '') as string
  if (!authorization) return json(res, 401, { error: 'Unauthorized' })

  const authClient = createAuthSupabase(authorization)
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) return json(res, 401, { error: 'Unauthorized' })

  const rawBody = await getRawBody(req)
  const { estimate_id, to, subject, message } = JSON.parse(rawBody) as RequestBody

  if (!estimate_id || !to || !subject) {
    return json(res, 400, { error: 'estimate_id, to, and subject are required' })
  }

  const serviceClient = getServiceSupabase()
  const { data: estimate, error: estimateError } = await serviceClient
    .from('estimates')
    .select(`
      id, estimate_number, title, total_cents, subtotal_cents, tax_cents,
      public_token, first_sent_at,
      organizations ( name ),
      estimate_sections (
        id, name, position,
        estimate_line_items ( id, description, quantity, unit_price_cents, markup_pct, position )
      )
    `)
    .eq('id', estimate_id)
    .single()

  if (estimateError || !estimate) return json(res, 404, { error: 'Estimate not found' })

  const appUrl = (process.env.VITE_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  const estimateUrl = `${appUrl}/e/${estimate.public_token}`

  const orgName = (estimate.organizations as { name: string } | null)?.name ?? 'Your contractor'

  const sections = (estimate.estimate_sections as Array<{
    id: string; name: string; position: number
    estimate_line_items: Array<{ id: string; description: string; quantity: number; unit_price_cents: number; markup_pct: number; position: number }>
  }>).sort((a, b) => a.position - b.position)

  const formatDollars = (cents: number | null) =>
    cents == null ? '$0.00' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const sectionsHtml = sections.map((section) => {
    const items = [...section.estimate_line_items].sort((a, b) => a.position - b.position)
    const rows = items.map((item) => {
      const lineTotal = Math.round(item.unit_price_cents * item.quantity * (1 + item.markup_pct / 100))
      return `<tr>
        <td style="padding:6px 0;color:#374151;font-size:14px;">${item.description}</td>
        <td style="padding:6px 0;color:#374151;font-size:14px;text-align:right;">${formatDollars(lineTotal)}</td>
      </tr>`
    }).join('')
    return `
      <tr><td colspan="2" style="padding:12px 0 4px;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:.06em;text-transform:uppercase;">${section.name}</td></tr>
      ${rows}
    `
  }).join('')

  const personalMessage = message
    ? `<p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>`
    : ''

  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08);">
    <div style="background:#111827;padding:20px 28px;">
      <span style="color:white;font-size:16px;font-weight:700;">⚡ EstimateFlow</span>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Estimate from</p>
      <p style="margin:0 0 20px;color:#111827;font-size:18px;font-weight:700;">${orgName}</p>
      ${personalMessage}
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;color:#111827;font-size:16px;font-weight:700;">${estimate.title ?? 'Estimate'}</p>
        <p style="margin:0 0 14px;color:#6b7280;font-size:13px;">Estimate #${estimate.estimate_number}</p>
        <table style="width:100%;border-collapse:collapse;">${sectionsHtml}</table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#6b7280;font-size:14px;">Total</span>
          <span style="color:#111827;font-size:20px;font-weight:800;">${formatDollars(estimate.total_cents)}</span>
        </div>
      </div>
      <a href="${estimateUrl}" style="display:block;background:#f97316;color:white;text-align:center;padding:14px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">View Full Estimate →</a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Powered by EstimateFlow</p>
    </div>
  </div>
</body></html>`

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'estimates@estimateflow.app',
    to,
    subject,
    html: emailHtml,
  })

  const now = new Date().toISOString()
  await serviceClient
    .from('estimates')
    .update({
      status: 'sent',
      sent_at: now,
      first_sent_at: estimate.first_sent_at ?? now,
    })
    .eq('id', estimate_id)

  return json(res, 200, { ok: true })
}
