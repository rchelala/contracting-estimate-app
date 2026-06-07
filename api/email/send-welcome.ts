import { Resend } from 'resend'

const BRAND_ORANGE = '#ea580c'

// resend is instantiated lazily inside the handler so this module can be
// imported in tests without requiring RESEND_API_KEY in the environment.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// DeviceMobile icon — Phosphor regular weight, 256-unit viewBox
const deviceMobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" style="vertical-align:middle;" aria-hidden="true"><path fill="${BRAND_ORANGE}" d="M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16Zm8,200a8,8,0,0,1-8,8H80a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96a8,8,0,0,1,8,8ZM128,188a12,12,0,1,1-12-12A12,12,0,0,1,128,188Z"/></svg>`

const steps = [
  'Tap the Share button at the bottom of Safari',
  'Scroll down and tap "Add to Home Screen"',
  'Tap "Add" in the top right corner',
]

const stepBadge = (n: number) =>
  `<span style="display:inline-block;width:20px;height:20px;background:${BRAND_ORANGE};color:white;border-radius:50%;font-size:11px;font-weight:700;text-align:center;line-height:20px;vertical-align:top;">${n}</span>`

/** Returns the full HTML string for the welcome email sent on account creation. */
export function buildWelcomeEmailHtml(): string {
  const stepsHtml = steps
    .map(
      (text, i) =>
        `<li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:${i < steps.length - 1 ? '10px' : '0'};">
        ${stepBadge(i + 1)}
        <span style="font-size:13px;color:#57534e;line-height:1.5;">${text}</span>
      </li>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f4;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND_ORANGE};border-radius:12px 12px 0 0;padding:24px 40px;">
            <span style="color:white;font-size:18px;font-weight:800;letter-spacing:-0.5px;">EstimateFlow</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:white;padding:40px 40px 32px;border-left:1px solid #e7e5e4;border-right:1px solid #e7e5e4;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1c1917;letter-spacing:-0.3px;">
              You're all set.
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#57534e;line-height:1.6;">
              Create your first estimate from the dashboard whenever you're ready.
            </p>

            <!-- iPhone tip box -->
            <div style="background:#f8f7f4;border-radius:10px;padding:20px 24px;">
              <div style="margin-bottom:10px;">
                ${deviceMobileSvg}
                <span style="margin-left:8px;font-size:14px;font-weight:700;color:#1c1917;vertical-align:middle;">Save to your home screen</span>
              </div>
              <p style="margin:0 0 14px;font-size:13px;color:#57534e;line-height:1.5;">
                On iPhone, open this app in Safari, then follow these steps:
              </p>
              <ul style="list-style:none;padding:0;margin:0;">
                ${stepsHtml}
              </ul>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f4;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
              Powered by EstimateFlow
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
