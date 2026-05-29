/**
 * Playwright screenshot script for EstimateFlow onboarding video.
 *
 * Prerequisites:
 *   1. Run `npm run dev` (app on http://127.0.0.1:5173)
 *   2. Have a saved auth session at .auth/playwright-user.json
 *      (run `node scripts/save-playwright-session.mjs` once to create it)
 *
 * Usage:
 *   node scripts/take-screenshots.mjs
 *
 * Output: remotion/public/screenshots/*.png
 */

import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://localhost:5173'
const AUTH_STATE = path.resolve('.auth/playwright-user.json')
const OUT_DIR = path.resolve('public/screenshots')
const MOBILE = process.argv.includes('--mobile')
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 }

// Load env from .env.local if not already set
async function loadEnv() {
  try {
    const envContent = await fs.readFile('.env.local', 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local may not exist; rely on environment
  }
}

await loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env.local')
  process.exit(1)
}

await fs.mkdir(OUT_DIR, { recursive: true })

// ─── Load auth session ────────────────────────────────────────────────────────
let authState
try {
  authState = JSON.parse(await fs.readFile(AUTH_STATE, 'utf-8'))
} catch {
  console.error(`Auth session not found at ${AUTH_STATE}.`)
  console.error('Run: node scripts/save-playwright-session.mjs')
  process.exit(1)
}

// Extract tokens from storage state for Supabase session
const lsEntries = authState.origins?.flatMap((o) => o.localStorage ?? []) ?? []
const authEntry = lsEntries.find((e) => e.name?.startsWith('sb-') && e.name?.endsWith('-auth-token'))
let accessToken = null
let refreshToken = null
if (authEntry) {
  try {
    const parsed = JSON.parse(authEntry.value)
    accessToken = parsed.access_token
    refreshToken = parsed.refresh_token
  } catch {
    // ignore
  }
}

if (!accessToken || !refreshToken) {
  console.error('Could not extract tokens from auth session. Re-run save-playwright-session.mjs.')
  process.exit(1)
}

// ─── Supabase client (authenticated) ─────────────────────────────────────────
// Use setSession so auth.uid() resolves correctly in RLS policies
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const { data: { user }, error: userError } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
}).then(({ data, error }) => error ? { data: { user: null }, error } : { data: { user: data.user }, error: null })

if (userError || !user) {
  console.error('Supabase auth error:', userError?.message ?? 'no user')
  process.exit(1)
}
console.log(`Authenticated as ${user.email}`)

// ─── Find user's organization ─────────────────────────────────────────────────
const { data: membership, error: memberErr } = await supabase
  .from('organization_members')
  .select('organization_id')
  .eq('user_id', user.id)
  .limit(1)
  .single()

if (memberErr || !membership) {
  console.error('Could not find organization:', memberErr?.message)
  process.exit(1)
}
const orgId = membership.organization_id
console.log(`Using organization: ${orgId}`)

// ─── Seed fixture data ────────────────────────────────────────────────────────
const TAG = `__screenshot_fixture_${Date.now()}`

// Create client
const { data: client, error: clientErr } = await supabase
  .from('clients')
  .insert({ organization_id: orgId, name: 'Acme Corp', email: 'acme@example.com' })
  .select()
  .single()

if (clientErr) {
  console.error('Could not create fixture client:', clientErr.message)
  process.exit(1)
}
console.log(`Created fixture client: ${client.id}`)

// Get next estimate number (required NOT NULL field)
const { data: estimateNumber, error: rpcError } = await supabase.rpc('next_estimate_number', { p_org_id: orgId })
if (rpcError) {
  console.error('Could not get estimate number:', rpcError.message)
  await supabase.from('clients').delete().eq('id', client.id)
  process.exit(1)
}

// Create estimate
const { data: estimate, error: estErr } = await supabase
  .from('estimates')
  .insert({
    organization_id: orgId,
    client_id: client.id,
    estimate_number: estimateNumber,
    title: `Kitchen Remodel ${TAG}`,
    status: 'draft',
    tax_rate_pct: 8.5,
  })
  .select()
  .single()

if (estErr) {
  console.error('Could not create fixture estimate:', estErr.message)
  await supabase.from('clients').delete().eq('id', client.id)
  process.exit(1)
}
console.log(`Created fixture estimate: ${estimate.id}`)

// Create sections (organization_id required for RLS check)
const { data: section1, error: sec1Err } = await supabase
  .from('estimate_sections')
  .insert({ organization_id: orgId, estimate_id: estimate.id, name: 'Demo & Prep', position: 10 })
  .select()
  .single()

const { data: section2, error: sec2Err } = await supabase
  .from('estimate_sections')
  .insert({ organization_id: orgId, estimate_id: estimate.id, name: 'Cabinet Installation', position: 20 })
  .select()
  .single()

if (sec1Err || sec2Err) {
  console.error('Could not create sections:', sec1Err?.message ?? sec2Err?.message)
  await cleanup(estimate.id, client.id)
  process.exit(1)
}

// Create line items (organization_id required for RLS check)
const lineItems = [
  { organization_id: orgId, estimate_id: estimate.id, section_id: section1.id, description: 'Remove existing cabinets and countertops', quantity: 1, unit_price_cents: 85000, position: 10 },
  { organization_id: orgId, estimate_id: estimate.id, section_id: section1.id, description: 'Haul away debris and disposal fee', quantity: 1, unit_price_cents: 32000, position: 20 },
  { organization_id: orgId, estimate_id: estimate.id, section_id: section2.id, description: 'Upper cabinet installation (12 units)', quantity: 12, unit_price_cents: 15000, position: 10 },
  { organization_id: orgId, estimate_id: estimate.id, section_id: section2.id, description: 'Base cabinet installation (8 units)', quantity: 8, unit_price_cents: 18000, position: 20 },
]

const { error: liErr } = await supabase.from('estimate_line_items').insert(lineItems)
if (liErr) {
  console.error('Could not create line items:', liErr.message)
  await cleanup(estimate.id, client.id)
  process.exit(1)
}

// Trigger server-side total recalculation
await supabase.rpc('recalculate_estimate_totals', { p_estimate_id: estimate.id })
console.log('Fixture data seeded successfully')

// ─── Take screenshots ─────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({
  storageState: AUTH_STATE,
  viewport: VIEWPORT,
})
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') console.warn('[browser]', msg.text())
})

// Intercept the wizard-questions API so the Q&A step renders real-looking questions
// without needing vercel dev / a live Anthropic call.
await page.route('**/api/ai/wizard-questions', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      questions: [
        'Will the deck be attached to the house or freestanding?',
        'What type of material for the railing — wood, cable, or aluminum?',
        'Are permits already pulled, or do we need to include that in the estimate?',
      ],
    }),
  })
})

function mobileName(name) {
  return MOBILE ? name.replace('.png', '-mobile.png') : name
}

async function shot(name) {
  const dest = path.join(OUT_DIR, mobileName(name))
  await page.screenshot({ path: dest, fullPage: false })
  console.log(`  ✓ ${mobileName(name)}`)
}

// 1. Dashboard
console.log('\nCapturing dashboard.png...')
await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'load' })
if (page.url().includes('/onboarding')) {
  // Handle first-run onboarding if triggered
  await page.getByLabel('Company name').fill('EstimateFlow Demo')
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await page.waitForURL('**/dashboard', { timeout: 20000 })
}
await page.waitForSelector('table, [data-testid="estimate-row"], h1', { timeout: 15000 })
await page.waitForTimeout(800)
await shot('dashboard.png')

// 2. Wizard category step
console.log('Capturing wizard-category.png...')
await page.goto(`${BASE_URL}/estimates/wizard`, { waitUntil: 'load' })
await page.waitForTimeout(800)

// Step 0: select General Contracting category
const generalContractingBtn = page.getByRole('button', { name: /general contracting/i }).first()
if (await generalContractingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await generalContractingBtn.click()
  await page.waitForTimeout(500)
}
await shot('wizard-category.png')

// Continue past category step — wait for client search to confirm Step 1 rendered
await page.getByRole('button', { name: /continue/i }).click()
await page.waitForSelector('input[placeholder*="search" i], input[placeholder*="client" i]', { timeout: 8000 }).catch(() => {})
await page.waitForTimeout(400)

// Step 1: select client
const clientSearch = page.getByPlaceholder(/search|client/i).first()
if (await clientSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
  await clientSearch.fill('Acme')
  await page.waitForTimeout(600)
  const firstResult = page.getByRole('button', { name: /acme/i }).first()
  if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstResult.click()
    await page.waitForTimeout(400)
  }
}
await page.getByRole('button', { name: /continue/i }).click()
await page.waitForTimeout(600)

// Step 2: fill zip — wait for zip input to confirm Step 2 rendered
const zipInput = page.getByPlaceholder(/zip/i)
if (await zipInput.isVisible({ timeout: 5000 }).catch(() => false)) {
  await zipInput.fill('90210')
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(600)
}

// Step 3: capture — wait for Camera button to confirm we're on Step 3, then click Continue
await page.waitForSelector('button:has-text("Camera"), button:has-text("Library")', { timeout: 8000 }).catch(() => {})
await page.waitForTimeout(400)
await page.getByRole('button', { name: /continue/i }).click()
await page.waitForTimeout(600)

// Step 4: describe — wait for textarea to confirm we're on Step 4
console.log('Capturing wizard-describe.png...')
const textarea = page.locator('textarea')
await textarea.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
if (await textarea.isVisible().catch(() => false)) {
  await textarea.fill('Deck build and wood fence installation — 400 sq ft pressure-treated deck with footings, stairs, and railing, plus 120 linear feet of 6-ft cedar privacy fence.')
}
await page.waitForTimeout(600)
await shot('wizard-describe.png')

// Continue to Step 5 (Q&A)
await page.getByRole('button', { name: /continue/i }).click()

// Step 5: Q&A — wait for AI questions to load (API call may take several seconds)
console.log('Capturing wizard-qa.png (waiting for AI questions)...')
await page.waitForSelector('text="A few quick questions"', { timeout: 30000 }).catch(async () => {
  // Fallback: wait for any question text or generate button if questions failed to load
  await page.waitForSelector('button:has-text("Generate Estimate")', { timeout: 10000 }).catch(() => {})
})
await page.waitForTimeout(800)
await shot('wizard-qa.png')

// 3. Editor with line items
console.log('Capturing editor-with-items.png...')
await page.goto(`${BASE_URL}/estimates/${estimate.id}`, { waitUntil: 'load' })
await page.locator('text=Loading estimate...').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
await page.waitForTimeout(1000)
await shot('editor-with-items.png')

// 3b. Editor with non-billable item — toggle first line item to show the feature
console.log('Capturing editor-non-billable.png...')
const markInternalBtn = page.getByRole('button', { name: 'Mark as internal cost' }).first()
await markInternalBtn.waitFor({ timeout: 5000 }).catch(() => {})
if (await markInternalBtn.isVisible().catch(() => false)) {
  await markInternalBtn.click()
  await page.waitForTimeout(600)
}
await shot('editor-non-billable.png')

// Toggle back so send-modal screenshot shows clean totals
const markBillableBtn = page.getByRole('button', { name: 'Mark as billable' }).first()
if (await markBillableBtn.isVisible().catch(() => false)) {
  await markBillableBtn.click()
  await page.waitForTimeout(400)
}

// 4. Send modal (open but don't submit)
console.log('Capturing send-modal.png...')
const sendBtn = page.getByRole('button', { name: /send/i }).first()
await sendBtn.waitFor({ timeout: 10000 })
await sendBtn.click()
// Wait for modal to open
await page.waitForSelector('[role="dialog"], [data-modal], form[data-send]', { timeout: 8000 }).catch(async () => {
  // Fallback: wait for email input to appear
  await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 5000 })
})
await page.waitForTimeout(600)
await shot('send-modal.png')

// Close the modal
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// 5. Client view
console.log('Capturing client-view.png...')
const { data: freshEstimate } = await supabase
  .from('estimates')
  .select('public_token')
  .eq('id', estimate.id)
  .single()

if (freshEstimate?.public_token) {
  // Close browser context and open a fresh unauthenticated one for client view
  await context.close()
  const publicContext = await browser.newContext({ viewport: VIEWPORT })
  const publicPage = await publicContext.newPage()

  await publicPage.goto(`${BASE_URL}/e/${freshEstimate.public_token}`, { waitUntil: 'load' })
  await publicPage.waitForTimeout(800)
  await publicPage.screenshot({ path: path.join(OUT_DIR, mobileName('client-view.png')), fullPage: false })
  console.log(`  ✓ ${mobileName('client-view.png')}`)

  // 6. Set estimate to approved and screenshot
  console.log(`Capturing ${mobileName('client-approved.png')}...`)
  await supabase
    .from('estimates')
    .update({ status: 'approved', approved_by_name: 'John Smith', approved_at: new Date().toISOString() })
    .eq('id', estimate.id)

  await publicPage.reload({ waitUntil: 'load' })
  await publicPage.waitForTimeout(800)
  await publicPage.screenshot({ path: path.join(OUT_DIR, mobileName('client-approved.png')), fullPage: false })
  console.log(`  ✓ ${mobileName('client-approved.png')}`)

  await publicContext.close()
} else {
  console.warn('No public_token found — skipping client view screenshots')
}

await browser.close()
console.log('\nAll screenshots saved to', OUT_DIR)

// ─── Cleanup fixture data ─────────────────────────────────────────────────────
await cleanup(estimate.id, client.id)

async function cleanup(estimateId, clientId) {
  console.log('\nCleaning up fixture data...')
  await supabase.from('estimates').delete().eq('id', estimateId)
  await supabase.from('clients').delete().eq('id', clientId)
  console.log('Cleanup complete.')
}
