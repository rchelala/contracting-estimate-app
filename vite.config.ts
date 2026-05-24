import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function injectSWAssets(): Plugin {
  return {
    name: 'inject-sw-assets',
    apply: 'build',
    closeBundle() {
      const manifestPath = path.resolve('dist/.vite/manifest.json')
      const swPath = path.resolve('dist/sw.js')
      if (!fs.existsSync(manifestPath) || !fs.existsSync(swPath)) return

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<
        string,
        { file: string; css?: string[] }
      >
      const assets: string[] = []
      for (const entry of Object.values(manifest)) {
        if (entry.file.endsWith('.js') || entry.file.endsWith('.css')) {
          assets.push(`/${entry.file}`)
        }
        // Vite nests CSS imports in the js entry's css array
        for (const cssFile of entry.css ?? []) {
          assets.push(`/${cssFile}`)
        }
      }

      let sw = fs.readFileSync(swPath, 'utf-8')
      sw = sw.replace('self.__SW_ASSET_MANIFEST__', JSON.stringify(assets))
      fs.writeFileSync(swPath, sw)
      console.log('[inject-sw-assets] Injected', assets.length, 'assets into sw.js')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectSWAssets()],
  envPrefix: ['NEXT_PUBLIC_', 'VITE_'],
  build: { manifest: true },
  server: { port: 5173 },
  test: { environment: 'jsdom', globals: true, setupFiles: ['src/test/setup.ts'], exclude: ['tests/**', 'node_modules/**'] },
})
