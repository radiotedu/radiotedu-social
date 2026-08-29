import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const artifactDir = path.join(process.env.USERPROFILE ?? process.cwd(), 'Desktop', 'artifacts', 'social-20260827-room-selector')

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as Window & { __ROOM_SELECTION_REQUESTS__?: unknown[] }
    testWindow.__ROOM_SELECTION_REQUESTS__ = []
    const response = (data: unknown) => Promise.resolve(new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    const rooms = [
      { roomId: 'library', occupancy: 74, capacity: 60, instanceCount: 2 },
      { roomId: 'chim-alan', occupancy: 3, capacity: 60, instanceCount: 1 },
      { roomId: 'grass-amphitheatre', occupancy: 0, capacity: 60, instanceCount: 1 },
      { roomId: 'sports-center', occupancy: 4, capacity: 60, instanceCount: 1 },
      { roomId: 'auditorium', occupancy: 2, capacity: 60, instanceCount: 1 },
      { roomId: 'learning-lab', occupancy: 8, capacity: 60, instanceCount: 1 },
    ]

    window.RadioTEDUStudyBridge = {
      apiBase: '/jukebox/api/v1/study',
      account: { id: 'room-selector-user', displayName: 'Room Selector', authenticated: true },
      globalPoints: 120,
      request: async (input, init = {}) => {
        const rawUrl = input instanceof Request ? input.url : input.toString()
        const url = new URL(rawUrl, window.location.origin)
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : {}
        if (url.pathname.endsWith('/avatar/me')) return response({
          ownedItemIds: ['default-hair', 'default-top', 'default-bottom', 'default-shoes'],
          equipped: { hair: 'default-hair', top: 'default-top', bottom: 'default-bottom', shoes: 'default-shoes' },
          points: { spendable_points: 120 },
        })
        if (url.pathname.endsWith('/summary')) return response({ todaySeconds: 0, monthSeconds: 0, totalSeconds: 0 })
        if (url.pathname.endsWith('/home')) return response({
          activePlayers: 91,
          summary: { todaySeconds: 0, monthSeconds: 0, totalSeconds: 0 },
          rooms,
          leaderboard: { week: [], month: [], all: [] },
          generatedAt: '2026-08-27T20:00:00.000Z',
        })
        if (url.pathname.endsWith('/instances/join')) {
          testWindow.__ROOM_SELECTION_REQUESTS__!.push(body)
          const roomId = body.roomId ?? 'library'
          const id = body.preferredInstanceId ?? `${roomId}-1`
          const number = Number(String(id).split('-').at(-1)) || 1
          return response({ instance: { id, roomId, number, occupancy: number === 2 ? 15 : 60, capacity: 60, preferredInstanceFull: false } })
        }
        if (url.pathname.endsWith('/events')) return response({ events: [] })
        if (url.pathname.endsWith('/presence')) return response({ presence: [] })
        if (url.pathname.endsWith('/presence/heartbeat')) return response({})
        if (url.pathname.endsWith('/chat')) return response({ messages: [] })
        return response({})
      },
    }
  })
  await fs.mkdir(artifactDir, { recursive: true })
})

test('a crowded campus room offers a real instance choice and joins the selected room', async ({ page }, testInfo) => {
  await page.goto('/?view=home')
  const library = page.locator('.home-room-card[data-room-id="library"]')
  await library.scrollIntoViewIfNeeded()
  const libraryBox = await library.boundingBox()
  expect(libraryBox).not.toBeNull()
  await page.mouse.click(libraryBox!.x + libraryBox!.width / 2, libraryBox!.y + libraryBox!.height / 2)

  const selector = page.locator('.room-instance-selector')
  await expect(selector).toBeVisible()
  await expect(selector).toContainText('74 students are active across 2 rooms')
  await expect(selector.locator('.room-instance-choice')).toHaveCount(3)
  await page.screenshot({ path: path.join(artifactDir, `${testInfo.project.name}-room-selection.png`) })

  const roomTwo = selector.locator('[data-instance-id="library-2"]')
  const roomTwoBox = await roomTwo.boundingBox()
  expect(roomTwoBox).not.toBeNull()
  await page.mouse.click(roomTwoBox!.x + roomTwoBox!.width / 2, roomTwoBox!.y + roomTwoBox!.height / 2)

  await expect(page.locator('html')).toHaveAttribute('data-room-instance-id', 'library-2')
  await expect(page.locator('#game-canvas canvas')).toBeVisible()
  const requests = await page.evaluate(() => (window as Window & { __ROOM_SELECTION_REQUESTS__?: unknown[] }).__ROOM_SELECTION_REQUESTS__)
  expect(requests).toEqual([expect.objectContaining({ roomId: 'library', preferredInstanceId: 'library-2' })])
})

test('the room selector fits a small phone viewport without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?view=home')
  await page.locator('.home-room-card[data-room-id="library"]').click()
  const selector = page.locator('.room-instance-selector')
  await expect(selector).toBeVisible()
  const overflow = await selector.evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: path.join(artifactDir, `${testInfo.project.name}-compact-room-selection.png`) })
})
