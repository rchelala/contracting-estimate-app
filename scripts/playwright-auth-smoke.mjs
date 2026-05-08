import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173'
const authStatePath = path.resolve('.auth/playwright-user.json')
const outDir = path.resolve('tmp-playwright-screenshots/authenticated')

await fs.access(authStatePath)
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  storageState: authStatePath,
  viewport: { width: 1440, height: 1000 },
})
const page = await context.newPage()
const failures = []
const consoleIssues = []
const pageErrors = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true })
}

page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) {
    consoleIssues.push(`${msg.type()}: ${msg.text()}`)
  }
})
page.on('pageerror', (error) => {
  pageErrors.push(error.stack || error.message)
})

await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })

if (page.url().startsWith(`${baseUrl}/onboarding`)) {
  await page.getByLabel('Company name').fill(`Playwright Test Co ${Date.now()}`)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await page.waitForURL('**/dashboard', { timeout: 20000 })
}

await screenshot('dashboard')
assert(page.url().startsWith(`${baseUrl}/dashboard`), `expected dashboard, got ${page.url()}`)
assert(await page.getByRole('heading', { name: 'Estimates' }).isVisible(), 'dashboard heading was not visible')

await page.getByRole('button', { name: 'New Estimate' }).first().click()
await page.waitForURL('**/estimates/**', { timeout: 30000 })
await page.waitForLoadState('networkidle')
await page.locator('text=Loading estimate...').waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})
await screenshot('new-estimate')

const title = `Playwright smoke estimate ${Date.now()}`
await page.getByPlaceholder('Untitled estimate').fill(title)
await page.getByPlaceholder('Untitled estimate').blur()

await page.getByRole('button', { name: '+ Add section' }).first().click()
await page.locator('main input[type="text"]').first().fill('Labor')
await page.locator('main input[type="text"]').first().blur()

await page.getByRole('button', { name: '+ Add line item' }).first().click()
await page.getByLabel('Line item description').first().fill('Site prep and framing')
await page.getByLabel('Line item description').first().blur()
await page.locator('main input[type="number"]').nth(0).fill('2')
await page.locator('main input[type="number"]').nth(0).blur()
await page.locator('main input[type="number"]').nth(1).fill('125')
await page.locator('main input[type="number"]').nth(1).blur()
await page.locator('main input[type="number"]').nth(2).fill('10')
await page.locator('main input[type="number"]').nth(2).blur()
await page.getByText('Saved').waitFor({ timeout: 30000 })
await screenshot('edited-estimate')

assert(await page.getByPlaceholder('Untitled estimate').inputValue() === title, 'estimate title did not update')
assert(await page.locator('main input[type="text"]').first().inputValue() === 'Labor', 'section name did not update')
assert(
  await page.getByLabel('Line item description').first().inputValue() === 'Site prep and framing',
  'line item description did not update'
)
assert(await page.getByRole('main').getByText('$275.00').isVisible(), 'line item total did not update to $275.00')
assert(
  await page.locator('div.fixed').getByText('$275.00').last().isVisible(),
  'sticky total did not update to $275.00'
)

await page.getByTestId('send-button').click()
await screenshot('send-modal')
assert(await page.getByRole('button', { name: 'Mark as Sent' }).isVisible(), 'send confirmation modal did not open')
await page.getByRole('button', { name: 'Cancel' }).click()
await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })
await page.waitForURL('**/dashboard', { timeout: 20000 })
await page.waitForLoadState('networkidle')
await screenshot('dashboard-after-edit')

const latestRow = page.locator('tbody tr').first()
assert(await latestRow.getByText(title).isVisible(), 'dashboard did not show the edited estimate title in the latest row')
assert(await latestRow.getByText('$275.00').isVisible(), 'dashboard did not show the edited estimate total')

const overlayCount = await page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay').count()
assert(overlayCount === 0, 'framework error overlay is visible')
assert(pageErrors.length === 0, `page errors:\n${pageErrors.join('\n')}`)

const actionableConsoleIssues = consoleIssues.filter((issue) => {
  return !issue.includes('Download the React DevTools')
})
assert(
  actionableConsoleIssues.length === 0,
  `console issues:\n${actionableConsoleIssues.join('\n')}`
)

await browser.close()

if (failures.length > 0) {
  console.error(`Authenticated smoke test failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Authenticated smoke test passed. Screenshots written to ${outDir}`)
