import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium } from '@playwright/test'

const liveUrl = process.env.STUDY_LIVE_URL ?? 'https://radiotedu.com/social/'
const output = process.env.STUDY_LIVE_GRASS_OUTPUT
  ?? 'C:/Users/tuna.ozsari/Desktop/artifacts/social-20260828-grass-qa/live'

await fs.mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    const response = (data, status = 200) => Promise.resolve(new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }))
    window.RadioTEDUStudyBridge = {
      apiBase: '/jukebox/api/v1/study',
      account: { id: 'live-grass-qa', displayName: 'Live QA', authenticated: true },
      globalPoints: 240,
      request: async (input, init = {}) => {
        const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin)
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : {}
        if (url.pathname.endsWith('/avatar/me')) return response({
          ownedItemIds: ['default-hair', 'default-top', 'default-bottom', 'default-shoes'],
          equipped: { hair: 'default-hair', top: 'default-top', bottom: 'default-bottom', shoes: 'default-shoes' },
          points: { spendable_points: 240 },
        })
        if (url.pathname.endsWith('/summary')) return response({ todaySeconds: 0, monthSeconds: 0, totalSeconds: 0 })
        if (url.pathname.endsWith('/instances/join')) {
          const roomId = body.roomId ?? 'grass-amphitheatre'
          return response({ instance: { id: `${roomId}-1`, roomId, number: 1, occupancy: 1, capacity: 60 } })
        }
        if (url.pathname.endsWith('/presence')) return response({ presence: [] })
        if (url.pathname.endsWith('/presence/heartbeat')) return response({})
        if (url.pathname.endsWith('/chat')) return response({ messages: [] })
        if (url.pathname.endsWith('/events')) return response({ events: [] })
        if (url.pathname.endsWith('/sessions/start')) return response({ session: { id: 'live-grass-session' }, nonce: 'live-grass-nonce-1' }, 201)
        if (/\/sessions\/[^/]+\/heartbeat$/.test(url.pathname)) return response({ nonce: 'live-grass-nonce-2', accepted_seconds: 1 })
        if (/\/sessions\/[^/]+\/finish$/.test(url.pathname)) return response({ points: { spendable_points: 240 } })
        return response({})
      },
    }
  })

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('crash', () => errors.push('page crashed'))
  const response = await page.goto(`${liveUrl}?room=grass-amphitheatre&live-grass-audit=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 45_000 })
  await page.locator('[data-rtac-reject]:visible').last().click({ timeout: 3_000 }).catch(() => undefined)
  await page.locator('html[data-room-id="grass-amphitheatre"]').waitFor({ timeout: 15_000 })
  await page.screenshot({ path: path.join(output, '01-live-grass-ready.png') })

  const click = await page.locator('#game-canvas canvas').evaluate((canvas) => {
    const source = { width: 1672, height: 941 }
    const target = { x: 870, y: 454 }
    const bounds = canvas.getBoundingClientRect()
    const zoom = Math.max(canvas.width / source.width, canvas.height / source.height)
    const canvasPoint = {
      x: ((target.x - source.width / 2) * zoom) + canvas.width / 2,
      y: ((target.y - source.height / 2) * zoom) + canvas.height / 2,
    }
    return {
      x: bounds.left + (canvasPoint.x / canvas.width) * bounds.width,
      y: bounds.top + (canvasPoint.y / canvas.height) * bounds.height,
    }
  })
  await page.mouse.click(click.x, click.y)
  await page.locator('html[data-game-state="seated"][data-seated-seat-id="amfi-b2"]').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(output, '02-live-grass-seated-amfi-b2.png') })

  const result = await page.evaluate(() => ({
    roomId: document.documentElement.dataset.roomId,
    roomTitle: document.querySelector('#room-title')?.textContent?.trim() ?? null,
    roomTabs: [...document.querySelectorAll('.room-tabs button')].map((button) => button.textContent?.trim()),
    state: document.documentElement.dataset.gameState ?? null,
    seatId: document.documentElement.dataset.seatedSeatId ?? null,
    canvas: Boolean(document.querySelector('#game-canvas canvas')),
  }))
  const report = {
    status: response?.status() ?? null,
    ...result,
    errors,
  }
  await fs.writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (report.status !== 200 || report.roomTitle !== 'Çim Alan' || report.state !== 'seated'
    || report.seatId !== 'amfi-b2' || !report.canvas || report.roomTabs.length !== 6 || errors.length > 0) {
    throw new Error(`Live grass QA failed: ${JSON.stringify(report)}`)
  }
  process.stdout.write(`${JSON.stringify(report)}\n`)
} finally {
  await browser.close()
}
