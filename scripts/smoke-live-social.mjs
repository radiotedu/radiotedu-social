import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, devices } from '@playwright/test'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const artifactDir = path.resolve(scriptDir, '../../artifacts/study-game/live-r13')
await mkdir(artifactDir, { recursive: true })

const browser = await chromium.launch()
const results = []
try {
  for (const profile of [
    { name: 'desktop', options: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', options: { ...devices['Pixel 7'] } },
  ]) {
    const context = await browser.newContext(profile.options)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('crash', () => errors.push('page crashed'))
    const response = await page.goto('https://radiotedu.com/social/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForFunction(() => Boolean(document.documentElement.dataset.studyReady), null, { timeout: 30_000 })
    await page.locator('img[src*="radiotedu-logo-white.png"]').first().waitFor({ state: 'visible', timeout: 15_000 })
    const state = await page.evaluate(() => {
      const logo = document.querySelector('img[src*="radiotedu-logo-white.png"]')
      const rect = logo?.getBoundingClientRect()
      return {
        ready: document.documentElement.dataset.studyReady ?? null,
        title: document.title,
        logoLoaded: logo instanceof HTMLImageElement && logo.complete && logo.naturalWidth > 0,
        logoVisible: Boolean(rect && rect.width > 0 && rect.height > 0),
        canvasCount: document.querySelectorAll('canvas').length,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      }
    })
    await page.screenshot({ path: path.join(artifactDir, `${profile.name}.png`), fullPage: true })
    results.push({ profile: profile.name, status: response?.status() ?? null, errors, ...state })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify(results))
if (results.some((result) => (
  result.status !== 200
  || result.errors.length > 0
  || !result.logoLoaded
  || !result.logoVisible
  || result.overflowPx > 1
  || !['locked', 'home', 'true'].includes(result.ready)
))) process.exitCode = 1
