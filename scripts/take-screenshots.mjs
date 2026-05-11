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

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173'
const AUTH_STATE = path.resolve('.auth/playwright-user.json')
// Save to the main app's public dir — Remotion is configured to read from there too
const OUT_DIR = path.resolve('public/screenshots')

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
const browser = await chromium.launch()
const context = await browser.newContext({
  storageState: AUTH_STATE,
  viewport: { width: 1440, height: 900 },
})
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') console.warn('[browser]', msg.text())
})

async function shot(name) {
  const dest = path.join(OUT_DIR, name)
  await page.screenshot({ path: dest, fullPage: false })
  console.log(`  ✓ ${name}`)
}

// 1. Dashboard
console.log('\nCapturing dashboard.png...')
await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' })
if (page.url().includes('/onboarding')) {
  // Handle first-run onboarding if triggered
  await page.getByLabel('Company name').fill('EstimateFlow Demo')
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await page.waitForURL('**/dashboard', { timeout: 20000 })
}
await page.waitForSelector('table, [data-testid="estimate-row"], h1', { timeout: 15000 })
await page.waitForTimeout(800)
await shot('dashboard.png')

// 2. Wizard describe step
console.log('Capturing wizard-describe.png...')
await page.goto(`${BASE_URL}/estimates/wizard`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// Step 1: select client — search for the fixture client so Continue becomes enabled
const clientSearch = page.getByPlaceholder(/search|client/i).first()
if (await clientSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
  await clientSearch.fill('Acme')
  await page.waitForTimeout(600)
  // Click the first result
  const firstResult = page.getByRole('button', { name: /acme/i }).first()
  if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstResult.click()
    await page.waitForTimeout(400)
  }
}
// Now Continue should be enabled
await page.getByRole('button', { name: /continue/i }).click()
await page.waitForTimeout(600)

// Step 2: fill zip and continue
const zipInput = page.getByPlaceholder(/zip/i)
if (await zipInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  await zipInput.fill('90210')
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForTimeout(500)
}
// Step 3: skip capture
const skipBtn = page.getByRole('button', { name: /skip/i })
if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await skipBtn.click()
  await page.waitForTimeout(500)
}
// Now on step 4 (describe) — fill description then screenshot
const textarea = page.locator('textarea')
if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
  await textarea.fill('Full kitchen remodel including demo, cabinet installation, countertop replacement, and plumbing rough-in for island sink.')
}
await page.waitForTimeout(600)
await shot('wizard-describe.png')

// 3. Editor with line items
console.log('Capturing editor-with-items.png...')
await page.goto(`${BASE_URL}/estimates/${estimate.id}`, { waitUntil: 'networkidle' })
await page.locator('text=Loading estimate...').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {})
await page.waitForTimeout(1000)
await shot('editor-with-items.png')

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
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const publicPage = await publicContext.newPage()

  await publicPage.goto(`${BASE_URL}/e/${freshEstimate.public_token}`, { waitUntil: 'networkidle' })
  await publicPage.waitForTimeout(800)
  await publicPage.screenshot({ path: path.join(OUT_DIR, 'client-view.png'), fullPage: false })
  console.log('  ✓ client-view.png')

  // 6. Set estimate to approved and screenshot
  console.log('Capturing client-approved.png...')
  await supabase
    .from('estimates')
    .update({ status: 'approved', approved_by_name: 'John Smith', approved_at: new Date().toISOString() })
    .eq('id', estimate.id)

  await publicPage.reload({ waitUntil: 'networkidle' })
  await publicPage.waitForTimeout(800)
  await publicPage.screenshot({ path: path.join(OUT_DIR, 'client-approved.png'), fullPage: false })
  console.log('  ✓ client-approved.png')

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
