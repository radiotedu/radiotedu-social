import { expect, test } from '@playwright/test'

const HUD_SHEETS = [
  ['#navigator-toggle', '#navigator-panel'],
  ['#chat-toggle', '#chat-panel'],
  ['#people-toggle', '#presence-panel'],
  ['#wardrobe-toggle', '#wardrobe-panel'],
  ['#shop-toggle', '#shop-panel'],
  ['#events-toggle', '#events-panel'],
  ['#account-toggle', '#account-panel'],
] as const

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
})

test('all visible controls in the seven mobile HUD sheets keep a 44px target', async ({ page }) => {
  for (const [toggleSelector, panelSelector] of HUD_SHEETS) {
    await page.locator(toggleSelector).click()
    const undersized = await page.locator(panelSelector).evaluate((panel) => {
      const selectors = 'button, a[href], input:not([type="checkbox"]):not([type="radio"]), select, summary, [role="button"]'
      return [...panel.querySelectorAll<HTMLElement>(selectors)]
        .filter((element) => {
          const style = getComputedStyle(element)
          const box = element.getBoundingClientRect()
          return !element.hasAttribute('disabled')
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && box.width > 0
            && box.height > 0
        })
        .map((element) => {
          const box = element.getBoundingClientRect()
          return { label: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName, width: box.width, height: box.height }
        })
        .filter(({ width, height }) => width < 44 || height < 44)
    })

    expect(undersized, `${panelSelector} undersized controls`).toEqual([])
    await page.keyboard.press('Escape')
  }
})

test('short landscape layout respects the safe-edge HUD offsets', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.reload()
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })

  const dock = page.locator('.action-dock')
  const dockBox = await dock.boundingBox()
  expect(dockBox).not.toBeNull()
  expect(dockBox!.x + dockBox!.width).toBeLessThanOrEqual(844 - 6)
  expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual(390 - 6)

  await page.locator('#chat-toggle').click()
  const panelBox = await page.locator('#chat-panel').boundingBox()
  expect(panelBox).not.toBeNull()
  expect(panelBox!.x).toBeGreaterThanOrEqual(6)
  expect(panelBox!.y).toBeGreaterThanOrEqual(6)
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(844 - 6)
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(390 - 6)
})
