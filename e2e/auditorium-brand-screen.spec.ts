import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/social-20260828-auditorium-brand-r1'

test('RadioTEDU Auditorium screen stays aligned at desktop and mobile sizes', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  fs.mkdirSync(OUTPUT, { recursive: true })

  await page.goto('./')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole('tab', { name: 'Auditorium' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'auditorium')
  await expect(page.locator('html')).toHaveAttribute('data-auditorium-screen', 'radiotedu')
  await expect(page.locator('.room-title')).toContainText('Ahmet Ersan')
  await page.waitForTimeout(600)
  await page.screenshot({
    path: path.join(OUTPUT, `${testInfo.project.name}-auditorium-radiotedu-screen.png`),
    fullPage: true,
  })
})
