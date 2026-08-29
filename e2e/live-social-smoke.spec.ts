import { expect, test } from '@playwright/test'

test('live Social bundle uses only the Ahmet Ersan Auditorium name', async ({ request }) => {
  const indexResponse = await request.get('https://radiotedu.com/social/')
  expect(indexResponse.status()).toBe(200)
  const index = await indexResponse.text()
  const gameScript = index.match(/src="([^"]*assets\/game-[^"]+\.js)"/)?.[1]
  expect(gameScript).toBeTruthy()

  const bundleResponse = await request.get(new URL(gameScript!, 'https://radiotedu.com/social/').href)
  expect(bundleResponse.status()).toBe(200)
  const bundle = await bundleResponse.text()
  expect(bundle).toContain('Ahmet Ersan Auditorium')
  expect(bundle).not.toMatch(/Fatma/i)
  expect(bundle).not.toContain('Ahmet Ersan Conference Hall')
})

test('live Social entry is healthy and an authenticated world keeps critical rooms usable', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })

  const response = await page.goto('https://radiotedu.com/social/', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', /^(?:true|locked)$/, { timeout: 45_000 })
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'library')

  if (await page.locator('html').getAttribute('data-study-ready') === 'locked') {
    const rejectAnalytics = page.getByRole('button', { name: 'Reject analytics' })
    if (await rejectAnalytics.isVisible()) await rejectAnalytics.click()
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    const gateLayout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }))
    expect(gateLayout.page).toBeLessThanOrEqual(gateLayout.viewport)
    expect(runtimeErrors.filter((message) => !/status of 401/i.test(message))).toEqual([])
    await page.screenshot({
      path: `../artifacts/study-game/live-social-${testInfo.project.name}-auth-gate.png`,
      animations: 'disabled',
      fullPage: true,
    })
    return
  }

  await expect(page.getByTestId('chat-toggle')).toBeVisible()
  await expect(page.getByTestId('wardrobe-toggle')).toBeVisible()

  await page.getByRole('tab', { name: 'TEDU Computer Lab' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'learning-lab')
  await page.evaluate(() => window.__STUDY_GAME_APP__.walkToSeat('activity-table-seat'))
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'seated', { timeout: 30_000 })

  await page.getByRole('tab', { name: 'Auditorium' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'auditorium')
  await expect(page.locator('html')).toHaveAttribute('data-auditorium-screen', 'radiotedu')

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }))
  expect(layout.page).toBeLessThanOrEqual(layout.viewport)
  expect(runtimeErrors).toEqual([])

  await page.screenshot({
    path: `../artifacts/study-game/live-social-${testInfo.project.name}.png`,
    animations: 'disabled',
    fullPage: true,
  })
})
