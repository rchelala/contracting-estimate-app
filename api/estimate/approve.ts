import { Resend } from 'resend'
import { getServiceSupabase } from '../lib/supabase.js'

const resend = new Resend(process.env.RESEND_API_KEY)

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')

interface RequestBody {
  token: string
  name: string
  message?: string
  action: 'approve' | 'reject'
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

  const rawBody = await getRawBody(req)
  const { token, name, message, action } = JSON.parse(rawBody) as RequestBody

  if (!token || !name || !action) {
    return json(res, 400, { error: 'token, name, and action are required' })
  }
  if (action !== 'approve' && action !== 'reject') {
    return json(res, 400, { error: 'action must be approve or reject' })
  }

  const serviceClient = getServiceSupabase()

  const { data: estimate, error: estimateError } = await serviceClient
    .from('estimates')
    .select('id, estimate_number, title, status, organization_id, organizations ( name )')
    .eq('public_token', token)
    .single()

  if (estimateError || !estimate) return json(res, 404, { error: 'Estimate not found' })

  if (estimate.status !== 'sent') {
    return json(res, 409, { error: 'already_actioned' })
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const clientIp = Array.isArray(req.headers?.['x-forwarded-for'])
    ? req.headers['x-forwarded-for'][0]
    : (req.headers?.['x-forwarded-for'] as string | undefined) ?? null
  const userAgent = (req.headers?.['user-agent'] as string | undefined) ?? null

  const { error: updateError } = await serviceClient
    .from('estimates')
    .update({
      status: newStatus,
      approved_at: new Date().toISOString(),
      approved_by_name: name,
      approved_client_ip: clientIp,
      approved_user_agent: userAgent,
    })
    .eq('id', estimate.id)

  if (updateError) return json(res, 500, { error: 'Failed to update estimate' })

  // Notify contractor — non-fatal if it fails
  try {
    const { data: memberRows } = await serviceClient
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', estimate.organization_id)
      .eq('role', 'owner')
      .limit(1)

    const ownerId = memberRows?.[0]?.user_id
    if (ownerId) {
      const { data: ownerData } = await serviceClient.auth.admin.getUserById(ownerId)
      const contractorEmail = ownerData?.user?.email
      if (contractorEmail) {
        const orgName = (estimate.organizations as unknown as { name: string } | null)?.name ?? 'Your org'
        const appUrl = (process.env.VITE_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
        const dashboardUrl = `${appUrl}/dashboard`
        const actionLabel = action === 'approve' ? 'approved' : 'rejected'
        const actionColor = action === 'approve' ? '#16a34a' : '#dc2626'
        const messageHtml = message
          ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;"><strong>Client message:</strong> ${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
          : ''

        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? 'estimates@estimateflow.work',
          to: contractorEmail,
          subject: `Estimate ${estimate.estimate_number} has been ${actionLabel}`,
          html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08);">
    <div style="background:#111827;padding:20px 28px;">
      <span style="color:white;font-size:16px;font-weight:700;">⚡ EstimateFlow</span>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Estimate response for ${orgName}</p>
      <p style="margin:0 0 20px;font-size:20px;font-weight:700;color:${actionColor};">
        Estimate ${estimate.estimate_number} has been ${actionLabel}
      </p>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Client:</strong> ${name}</p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;"><strong>Estimate:</strong> ${estimate.title ?? 'Untitled'} (${estimate.estimate_number})</p>
      ${messageHtml}
      <a href="${dashboardUrl}" style="display:block;background:#f97316;color:white;text-align:center;padding:14px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">View Dashboard →</a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Powered by EstimateFlow</p>
    </div>
  </div>
</body></html>`,
        })
      }
    }
  } catch (emailErr) {
    console.error('Approval notification email failed:', emailErr)
  }

  return json(res, 200, { ok: true, status: newStatus })
}
