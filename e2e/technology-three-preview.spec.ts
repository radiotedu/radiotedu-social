import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/technology-new'

test('Three.js signal chain renders without breaking the preview', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  fs.mkdirSync(OUTPUT, { recursive: true })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto('/technology-new/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('html')).toHaveClass(/tech-three-ready/)
  await expect(page.locator('.hero-three-canvas')).toHaveCount(1)
  await expect(page.locator('.signal-story-canvas')).toHaveCount(1)

  const state = await page.evaluate(() => ({
    threeVersion: document.documentElement.dataset.threeVersion,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    webgl: Boolean(document.querySelector<HTMLCanvasElement>('.hero-three-canvas')?.getContext('webgl2')),
    h1: document.querySelectorAll('h1').length,
  }))
  expect(state).toEqual({ threeVersion: '0.180.0', overflow: expect.any(Number), webgl: true, h1: 1 })
  expect(state.overflow).toBeLessThanOrEqual(1)

  const step = page.locator('[data-signal-step="1"]')
  await step.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await expect(page.locator('[data-signal-readout]')).toContainText(/Encode|Serve/)
  await expect(step.locator('.signal-step-card')).toBeInViewport({ ratio: .9 })
  const mobileSafeGeometry = await page.evaluate(() => ({
    headerBottom: document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0,
    eyebrowTop: document.querySelector('.signal-story-heading .eyebrow')?.getBoundingClientRect().top ?? 0,
  }))
  expect(mobileSafeGeometry.eyebrowTop).toBeGreaterThanOrEqual(mobileSafeGeometry.headerBottom)
  await page.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-three-signal.png`) })
  expect(pageErrors).toEqual([])
})
