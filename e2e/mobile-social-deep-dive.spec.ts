import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUTPUT = path.resolve('..', 'artifacts', 'study-game', 'mobile-social-deep-dive')

test('keeps the mobile world readable and enters Deep Dive from the pool', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'This proof targets the compact touch layout.')
  test.setTimeout(90_000)
  fs.mkdirSync(OUTPUT, { recursive: true })

  await page.goto('/?room=sports-center')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })

  const mobileLayout = await page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing ${selector}`)
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height }
    }
    const overlap = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    )
    const rail = box('.world-rail')
    const brand = box('.study-brand')
    const clock = box('.study-clock')
    const radio = box('.radio-mini')
    const gold = box('.point-balance')
    const account = box('.account-chip')
    const tabs = document.querySelector<HTMLElement>('.room-tabs')!
    const tabHeights = [...tabs.querySelectorAll<HTMLElement>('button')].map((button) => button.getBoundingClientRect().height)
    return {
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
      tabsScrollable: tabs.scrollWidth > tabs.clientWidth,
      minimumTabHeight: Math.min(...tabHeights),
      overlaps: [overlap(rail, brand), overlap(rail, clock), overlap(brand, clock), overlap(radio, gold), overlap(radio, account), overlap(gold, account)],
      controlsInsideViewport: [rail, brand, clock, radio, gold, account].every((bounds) => bounds.left >= 0 && bounds.right <= innerWidth),
    }
  })
  expect(mobileLayout.documentOverflow).toBe(0)
  expect(mobileLayout.tabsScrollable).toBe(true)
  expect(mobileLayout.minimumTabHeight).toBeGreaterThanOrEqual(44)
  expect(mobileLayout.overlaps).toEqual([0, 0, 0, 0, 0, 0])
  expect(mobileLayout.controlsInsideViewport).toBe(true)

  const computerLab = page.getByRole('tab', { name: 'TEDU Computer Lab' })
  await computerLab.scrollIntoViewIfNeeded()
  await computerLab.click()
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'learning-lab')
  const pool = page.getByRole('tab', { name: 'TEDU Swimming Pool' })
  await pool.scrollIntoViewIfNeeded()
  await pool.click()
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'sports-center')

  const launcher = page.getByRole('button', { name: 'Play Deep Dive at the swimming pool' })
  await expect(launcher).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-pool-dive-station', 'ready')
  await page.screenshot({ path: path.join(OUTPUT, '01-mobile-pool-room.png') })

  const station = await page.evaluate(() => window.__STUDY_GAME_APP__.tapTargets().activities.find((activity) => activity.id === 'pool-dive'))
  if (!station) throw new Error('Pool Dive world station is missing')
  await page.touchscreen.tap(station.screen.x, station.screen.y)
  await expect.poll(() => page.evaluate(() => window.__STUDY_GAME_APP__.snapshot().nodeId), { timeout: 20_000 }).toBe('dive-queue')
  await expect(page.locator('#events-panel')).toBeVisible()
  await expect(page.getByTestId('arcade-list')).toBeVisible()
  await page.locator('[data-pool-start]').click()
  await expect(page.locator('.pool-dive-stage')).toHaveAttribute('data-pool-motion', 'ready')
  const prompt = await page.locator('.pool-dive-stage').getAttribute('data-pool-prompt')
  expect(['left', 'center', 'right']).toContain(prompt)
  await page.keyboard.press(prompt === 'left' ? 'ArrowLeft' : prompt === 'right' ? 'ArrowRight' : 'ArrowDown')
  await expect(page.locator('[data-pool-round]')).toContainText('2 / 8')
  await page.screenshot({ path: path.join(OUTPUT, '02-mobile-deep-dive.png') })

  const laneTargets = await page.locator('[data-pool-choice]').evaluateAll((buttons) => (
    buttons.map((button) => button.getBoundingClientRect().height)
  ))
  expect(Math.min(...laneTargets)).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
})
