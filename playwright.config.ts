import { defineConfig } from '@playwright/test'

// Tests must run against a server that serves both the frontend AND the /api/* serverless
// functions. Use `NODE_OPTIONS=--use-system-ca vercel dev --listen 5173` locally, or set
// PLAYWRIGHT_BASE_URL to a Vercel preview/production URL.
const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  retries: 1, // AI responses are occasionally malformed — one retry handles transient parse failures
  use: {
    baseURL: BASE_URL,
    headless: true,
  },
})
