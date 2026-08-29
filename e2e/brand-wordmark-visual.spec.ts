import { expect, test } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const artifactDir = path.resolve(process.cwd(), '..', 'artifacts', 'study-game', 'brand-wordmark')

test('official RadioTEDU wordmark stays visible and non-overlapping on home and in-world HUD', async ({ page }, testInfo) => {
  await fs.mkdir(artifactDir, { recursive: true })
  await page.goto('/?view=home')
  await expect(page.getByTestId('study-home')).toBeVisible()

  const homeLogo = page.locator('.home-brand-wordmark')
  const account = page.locator('.home-account-summary')
  await expect(homeLogo).toBeVisible()
  await expect(homeLogo).toHaveJSProperty('complete', true)
  const [homeLogoBox, accountBox] = await Promise.all([homeLogo.boundingBox(), account.boundingBox()])
  expect(homeLogoBox).not.toBeNull()
  expect(accountBox).not.toBeNull()
  expect(homeLogoBox!.x + homeLogoBox!.width).toBeLessThanOrEqual(accountBox!.x)
  await page.screenshot({ path: path.join(artifactDir, `${testInfo.project.name}-home.png`) })

  await page.locator('#home-enter-primary').click()
  await expect(page.locator('html')).toHaveAttribute('data-study-ready', 'true')
  const hudLogo = page.locator('.study-brand-wordmark')
  const roomContext = page.locator('.room-context')
  await expect(hudLogo).toBeVisible()
  const hudLogoBox = await hudLogo.boundingBox()
  expect(hudLogoBox).not.toBeNull()
  if (testInfo.project.use.hasTouch) {
    const statusBox = await page.locator('.game-status').boundingBox()
    expect(statusBox).not.toBeNull()
    expect(hudLogoBox!.y + hudLogoBox!.height).toBeLessThanOrEqual(statusBox!.y)
  } else {
    const roomContextBox = await roomContext.boundingBox()
    expect(roomContextBox).not.toBeNull()
    expect(hudLogoBox!.x + hudLogoBox!.width).toBeLessThanOrEqual(roomContextBox!.x)
  }
  await page.screenshot({ path: path.join(artifactDir, `${testInfo.project.name}-world.png`) })
})
