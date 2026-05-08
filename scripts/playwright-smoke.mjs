import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173'
const outDir = path.resolve('tmp-playwright-screenshots')

await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const contexts = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
]

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

for (const config of contexts) {
  const context = await browser.newContext({ viewport: config.viewport })
  const page = await context.newPage()
  const consoleIssues = []
  const pageErrors = []

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleIssues.push(`${msg.type()}: ${msg.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    pageErrors.push(error.stack || error.message)
  })

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outDir, `${config.name}-root.png`), fullPage: true })

  assert(page.url().startsWith(`${baseUrl}/auth`), `${config.name}: root did not redirect to /auth; got ${page.url()}`)
  assert(await page.locator('text=EstimateFlow').first().isVisible(), `${config.name}: auth brand heading was not visible`)
  assert(await page.locator('input[type="email"]').first().isVisible(), `${config.name}: email field was not visible`)
  assert(await page.locator('input[type="password"]').first().isVisible(), `${config.name}: password field was not visible`)

  const overlayCount = await page.locator('.vite-error-overlay, #webpack-dev-server-client-overlay').count()
  assert(overlayCount === 0, `${config.name}: framework error overlay is visible`)

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outDir, `${config.name}-dashboard-redirect.png`), fullPage: true })
  assert(page.url().startsWith(`${baseUrl}/auth`), `${config.name}: /dashboard did not redirect unauthenticated users to /auth; got ${page.url()}`)

  await page.goto(`${baseUrl}/estimates/new`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outDir, `${config.name}-new-estimate-redirect.png`), fullPage: true })
  assert(page.url().startsWith(`${baseUrl}/auth`), `${config.name}: /estimates/new did not redirect unauthenticated users to /auth; got ${page.url()}`)

  const bodyText = (await page.locator('body').innerText()).trim()
  assert(bodyText.length > 0, `${config.name}: page body was blank`)
  assert(pageErrors.length === 0, `${config.name}: page errors:\n${pageErrors.join('\n')}`)

  const actionableConsoleIssues = consoleIssues.filter((issue) => {
    return !issue.includes('Download the React DevTools')
  })
  assert(
    actionableConsoleIssues.length === 0,
    `${config.name}: console issues:\n${actionableConsoleIssues.join('\n')}`
  )

  await context.close()
}

await browser.close()

if (failures.length > 0) {
  console.error(`Smoke test failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Smoke test passed. Screenshots written to ${outDir}`)
