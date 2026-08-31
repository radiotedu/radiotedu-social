import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const output = process.env.RADIOTEDU_ECOSYSTEM_AUDIT_OUTPUT
  ?? 'C:/RadioTEDU/backups/20260830T011502-social-live-deep-dive/live-ecosystem-audit'
const allPages = [
  ['home', 'https://radiotedu.com/'],
  ['ai', 'https://radiotedu.com/ai/'],
  ['focus', 'https://radiotedu.com/focus/'],
  ['social', 'https://radiotedu.com/social/'],
  ['voting', 'https://radiotedu.com/vote/?embed=1'],
  ['juke', 'https://radiotedu.com/juke-local/controller/'],
]
const requestedPage = process.env.RADIOTEDU_ECOSYSTEM_AUDIT_PAGE?.trim()
const pages = requestedPage ? allPages.filter(([name]) => name === requestedPage) : allPages
const profiles = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 412, height: 915 }],
]

fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const report = []
try {
  for (const [profile, viewport] of profiles) {
    const context = await browser.newContext({ viewport, locale: 'en-GB' })
    for (const [name, url] of pages) {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message.slice(0, 180)))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text().slice(0, 180))
      })
      let status = 0
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        status = response?.status() ?? 0
        await page.waitForTimeout(4_000)
        const state = await page.evaluate(() => {
          const visible = (element) => {
            const style = getComputedStyle(element)
            const rect = element.getBoundingClientRect()
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
          }
          const candidates = [...document.querySelectorAll('button, a, [role="button"], [data-gold], [class*="account" i], [id*="account" i]')]
            .filter(visible)
            .map((element) => (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((text) => /(log in|sign in|giriş|account|hesap|gold)/i.test(text))
            .filter((text, index, all) => text && all.indexOf(text) === index)
            .slice(0, 16)
          return {
            title: document.title,
            language: document.documentElement.lang,
            ready: document.documentElement.dataset.studyReady ?? null,
            locked: document.documentElement.dataset.studyEntryState ?? null,
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            accountControls: candidates,
            consentControls: [...document.querySelectorAll('button')]
              .filter(visible)
              .filter((element) => /(accept|reject|preferences|kabul|reddet|tercih)/i.test(element.textContent || ''))
              .map((element) => {
                const rect = element.getBoundingClientRect()
                const style = getComputedStyle(element)
                return {
                  text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
                  ariaLabel: element.getAttribute('aria-label'),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  fontSize: style.fontSize,
                  overflow: style.overflow,
                  whiteSpace: style.whiteSpace,
                }
              }),
          }
        })
        await page.screenshot({ path: path.join(output, `${profile}-${name}.png`), fullPage: false })
        report.push({ profile, name, url, status, errors: [...new Set(errors)], ...state })
      } catch (error) {
        report.push({ profile, name, url, status, errors: [...new Set([...errors, error.message])] })
      } finally {
        await page.close()
      }
    }
    await context.close()
  }
} finally {
  await browser.close()
}
fs.writeFileSync(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report))
