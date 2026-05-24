/**
 * Generates PWA icons from favicon.svg using Playwright's headless Chromium.
 * Run once: npm run icons
 * Output: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SVG_PATH = path.join(ROOT, 'public', 'favicon.svg')
const OUT_DIR = path.join(ROOT, 'public', 'icons')

const svgContent = await fs.readFile(SVG_PATH, 'utf-8')
await fs.mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch()

async function renderIcon(size, isMaskable = false) {
  const page = await browser.newPage()
  await page.setViewportSize({ width: size, height: size })

  // Maskable icons need 10% padding on each side (W3C safe zone)
  const paddingPct = isMaskable ? 0.1 : 0
  const innerSize = Math.round(size * (1 - paddingPct * 2))
  const offset = Math.round(size * paddingPct)

  const scaledSvg = svgContent
    .replace('width="32"', `width="${innerSize}"`)
    .replace('height="32"', `height="${innerSize}"`)

  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${size}px; height: ${size}px; background: #EA580C; overflow: hidden; }
  .icon { position: absolute; top: ${offset}px; left: ${offset}px; }
</style>
</head>
<body>
<div class="icon">${scaledSvg}</div>
</body>
</html>`

  await page.setContent(html, { waitUntil: 'load' })
  const filename = isMaskable ? `icon-maskable-${size}.png` : `icon-${size}.png`
  const outPath = path.join(OUT_DIR, filename)
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  console.log(`  ✓ ${filename}`)
}

console.log('Generating PWA icons...')
await renderIcon(192)
await renderIcon(512)
await renderIcon(512, true)
await browser.close()
console.log('Done. Icons written to public/icons/')
