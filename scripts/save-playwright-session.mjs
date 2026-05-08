import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173'
const authDir = path.resolve('.auth')
const statePath = path.join(authDir, 'playwright-user.json')

await fs.mkdir(authDir, { recursive: true })

const browser = await chromium.launch({ headless: false })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()

console.log(`Opening ${baseUrl}/auth`)
console.log('Sign in using the browser window. This script will save the session once Supabase stores auth state.')

await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle' })

await page.waitForFunction(() => {
  return Object.keys(window.localStorage).some((key) => {
    return key.startsWith('sb-') && key.endsWith('-auth-token')
  })
}, null, { timeout: 10 * 60 * 1000 })

await page.waitForTimeout(1000)
await context.storageState({ path: statePath })
console.log(`Saved session to ${statePath}`)

await browser.close()
