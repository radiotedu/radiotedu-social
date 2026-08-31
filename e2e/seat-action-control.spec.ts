import { expect, test } from '@playwright/test'

test('real Social scene exposes a keyboard and touch Sit / Stand flow', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })

  const action = page.locator('#seat-action')
  await expect(action).toBeVisible()
  await expect(action).toHaveAttribute('aria-keyshortcuts', 'E')
  expect(await action.evaluate((button) => button.parentElement?.classList.contains('action-dock'))).toBe(true)
  const [box, dockBox] = await Promise.all([action.boundingBox(), page.locator('.action-dock').boundingBox()])
  expect(box).not.toBeNull()
  expect(dockBox).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)
  expect(box!.x).toBeGreaterThanOrEqual(dockBox!.x)
  expect(box!.x + box!.width).toBeLessThanOrEqual(dockBox!.x + dockBox!.width)

  if (testInfo.project.name === 'mobile-chromium') await action.click()
  else await page.keyboard.press('e')

  await expect.poll(async () => page.evaluate(() => {
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    return { state: snapshot.state, seated: Boolean(snapshot.seatId) }
  }), { timeout: 30_000 }).toEqual({ state: 'seated', seated: true })
  await expect(page.locator('#study-timer')).toHaveAttribute('data-running', 'true')
  await expect(action).toContainText('Stand')

  if (testInfo.project.name === 'mobile-chromium') await action.click()
  else await page.keyboard.press('e')

  await expect.poll(async () => page.evaluate(() => {
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    return { state: snapshot.state, seatId: snapshot.seatId }
  }), { timeout: 30_000 }).toEqual({ state: 'ready', seatId: null })
  await expect(page.locator('#study-timer')).toHaveAttribute('data-running', 'false')
})

test('seat shortcut is inert while a HUD sheet is open', async ({ page }) => {
  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
  const before = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())

  await page.locator('#chat-toggle').click()
  await page.keyboard.press('e')
  await page.waitForTimeout(250)

  const after = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
  expect(after.state).toBe(before.state)
  expect(after.seatId).toBe(before.seatId)
  expect(after.position).toEqual(before.position)
})
