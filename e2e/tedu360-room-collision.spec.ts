import fs from 'node:fs'
import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/social-20260827-campus-collision-r2'

async function switchRoom(page: Page, accessibleName: string, roomId: string) {
  await page.getByRole('tab', { name: accessibleName }).click()
  await expect(page.locator('html')).toHaveAttribute('data-room-id', roomId)
}

async function rejectObstacleClick(page: Page, world: Readonly<{ x: number; y: number }>) {
  const before = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
  const screen = await page.evaluate((point) => {
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    const canvas = document.querySelector('canvas')!.getBoundingClientRect()
    return {
      x: canvas.left + ((point.x - snapshot.camera.worldViewX) * snapshot.camera.zoom),
      y: canvas.top + ((point.y - snapshot.camera.worldViewY) * snapshot.camera.zoom),
    }
  }, world)
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, screen)).toBe('CANVAS')
  await page.mouse.click(screen.x, screen.y)
  await page.waitForTimeout(220)
  const after = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
  expect(after.state, JSON.stringify(world)).not.toBe('walking')
  expect(after.lastWalkTarget, JSON.stringify(world)).toEqual(before.lastWalkTarget)
  expect(Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y), JSON.stringify(world)).toBeLessThan(1)
}

test('real mouse clicks cannot walk through pool walls, lab walls, desks, cafe, or stage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop mouse collision evidence')
  test.setTimeout(90_000)
  fs.mkdirSync(OUTPUT, { recursive: true })
  await page.goto(process.env.SOCIAL_LIVE_URL ?? '/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })

  await switchRoom(page, 'Giriş', 'chim-alan')
  for (const point of [{ x: 350, y: 350 }, { x: 1_150, y: 520 }]) await rejectObstacleClick(page, point)
  await page.screenshot({ path: path.join(OUTPUT, 'desktop-chromium-chim-collision.png') })

  await switchRoom(page, 'TEDU Swimming Pool', 'sports-center')
  for (const point of [
    { x: 500, y: 520 },
    { x: 850, y: 500 },
    { x: 1_100, y: 500 },
    { x: 635, y: 94 },
    { x: 450, y: 330 },
    { x: 1_170, y: 207 },
  ]) await rejectObstacleClick(page, point)
  await page.screenshot({ path: path.join(OUTPUT, 'desktop-chromium-pool-water-collision.png') })

  await switchRoom(page, 'TEDU Computer Lab', 'learning-lab')
  for (const point of [
    { x: 700, y: 400 },
    { x: 900, y: 500 },
    { x: 500, y: 520 },
    { x: 1_200, y: 550 },
    { x: 800, y: 730 },
    { x: 500, y: 130 },
    { x: 450, y: 300 },
    { x: 1_400, y: 300 },
  ]) await rejectObstacleClick(page, point)
  await page.screenshot({ path: path.join(OUTPUT, 'desktop-chromium-computer-desk-collision.png') })

  await switchRoom(page, 'Auditorium', 'auditorium')
  for (const point of [
    { x: 900, y: 150 },
    { x: 400, y: 250 },
    { x: 1_000, y: 520 },
    { x: 836, y: 885 },
  ]) await rejectObstacleClick(page, point)
  await page.screenshot({ path: path.join(OUTPUT, 'desktop-chromium-auditorium-wall-seat-collision.png') })
})
