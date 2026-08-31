import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const LIVE_URL = 'https://radiotedu.com/social/?room=library&library-r26-audit=1'
const OUTPUT = 'C:/RadioTEDU/artifacts/social-former-library-r24/live'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let nonce = 1
    let session = 1
    const response = (data: unknown) => Promise.resolve(new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    window.RadioTEDUStudyBridge = {
      apiBase: '/jukebox/api/v1/study',
      account: { id: 'library-r24-audit', displayName: 'Library Audit', authenticated: true },
      globalPoints: 240,
      request: async (input, init = {}) => {
        const rawUrl = input instanceof Request ? input.url : input.toString()
        const url = new URL(rawUrl, window.location.origin)
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : {}
        if (url.pathname.endsWith('/avatar/me')) return response({
          ownedItemIds: ['default-hair', 'default-top', 'default-bottom', 'default-shoes', 'bucket-hat'],
          equipped: { hair: 'default-hair', top: 'default-top', bottom: 'default-bottom', shoes: 'default-shoes', hat: 'bucket-hat' },
          points: { spendable_points: 240 },
        })
        if (url.pathname.endsWith('/summary')) return response({ todaySeconds: 0, monthSeconds: 0, totalSeconds: 0 })
        if (url.pathname.endsWith('/instances/join')) {
          const roomId = body.roomId ?? 'library'
          return response({ instance: { id: `${roomId}-1`, roomId, number: 1, occupancy: 1, capacity: 60 } })
        }
        if (url.pathname.endsWith('/presence')) return response({ presence: [] })
        if (url.pathname.endsWith('/presence/heartbeat')) return response({})
        if (url.pathname.endsWith('/chat')) return response({ messages: [] })
        if (url.pathname.endsWith('/events')) return response({ events: [] })
        if (url.pathname.endsWith('/sessions/start')) {
          return response({ session: { id: `library-r24-${session++}` }, nonce: `nonce-${nonce++}` })
        }
        if (/\/sessions\/[^/]+\/heartbeat$/.test(url.pathname)) return response({ nonce: `nonce-${nonce++}`, accepted_seconds: 1 })
        if (/\/sessions\/[^/]+\/finish$/.test(url.pathname)) return response({ points: { spendable_points: 240 } })
        return response({})
      },
    }
  })
})

test('live release serves the former Library and seats from a real canvas click', async ({ page }, testInfo) => {
  fs.mkdirSync(OUTPUT, { recursive: true })
  const mobile = testInfo.project.use.hasTouch === true

  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('crash', () => pageErrors.push('page crashed'))

  const response = await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'library')

  const rejectAnalytics = page.getByRole('button', { name: /Reject analytics/i })
  if (await rejectAnalytics.isVisible()) await rejectAnalytics.click()

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }))
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth + 1)

  const roomResources = await page.evaluate(() => performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => url.includes('/assets/rooms/')))
  expect(roomResources.some((url) => url.endsWith('/assets/rooms/library-wide.png'))).toBe(true)
  expect(roomResources.some((url) => url.includes('tedu-a-blok-library-wide-r2.png'))).toBe(false)

  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(mobile ? 380 : 1_300)

  const calibratedSeatPoint = mobile
    ? { x: 204.93, y: 314.08 }
    : { x: 854.6, y: 323.15 }
  await page.mouse.click(calibratedSeatPoint.x, calibratedSeatPoint.y)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'seated', { timeout: 30_000 })
  await expect(page.locator('#study-timer')).toHaveAttribute('data-running', 'true')
  await page.waitForTimeout(1_150)
  await expect(page.locator('#study-timer')).not.toHaveText('00:00:00')
  expect(pageErrors).toEqual([])

  fs.writeFileSync(
    path.join(OUTPUT, `live-${mobile ? 'mobile' : 'desktop'}-layout.json`),
    JSON.stringify(layout, null, 2),
  )
  await page.screenshot({ path: path.join(OUTPUT, `live-${mobile ? 'mobile' : 'desktop'}-front-desk-seated.png`) })
})
