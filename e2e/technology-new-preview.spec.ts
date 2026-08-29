import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/technology-new'

test('technology preview preserves real content and remains responsive', async ({ page }, testInfo) => {
  fs.mkdirSync(OUTPUT, { recursive: true })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto('/technology-new/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('.preview-badge')).toContainText('Technology preview')
  await expect(page.locator('.product-story')).toHaveCount(14)

  const documentState = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h2: document.querySelectorAll('h2').length,
    hiddenStories: [...document.querySelectorAll<HTMLElement>('.product-story')]
      .filter((story) => getComputedStyle(story).visibility === 'hidden' || Number(getComputedStyle(story).opacity) < .1).length,
  }))
  expect(documentState.title).toBe('RadioTEDU — Technology Preview')
  expect(documentState.canonical).toBe('https://radiotedu.com/technology-new/')
  expect(documentState.overflow).toBeLessThanOrEqual(1)
  expect(documentState.h2).toBeGreaterThanOrEqual(18)
  expect(documentState.hiddenStories).toBe(0)

  for (const section of await page.locator('main > section').all()) {
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(40)
  }
  await page.waitForLoadState('networkidle')
  const brokenImages = await page.evaluate(() => [...document.images]
    .filter((image) => image.hasAttribute('src') && (!image.complete || image.naturalWidth === 0))
    .map((image) => image.currentSrc || image.getAttribute('src')))
  expect(brokenImages).toEqual([])
  await page.locator('.hero').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-hero.png`) })
  for (const id of ['study', 'mobile']) {
    const section = page.locator(`#${id}`)
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(180)
    await section.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-${id}.png`) })
  }
  await page.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-full.png`), fullPage: true })
  expect(pageErrors).toEqual([])
})

test('technology preview honors reduced motion without hiding content', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    ...testInfo.project.use,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto('/technology-new/', { waitUntil: 'networkidle' })
  await expect(page.locator('.product-story').first()).toBeVisible()
  const state = await page.evaluate(() => ({
    canvas: Boolean(document.querySelector('.tech-canvas')),
    railDisplay: getComputedStyle(document.querySelector('.tech-rail')!).display,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  expect(state.canvas).toBe(false)
  expect(state.railDisplay).toBe('none')
  expect(state.overflow).toBeLessThanOrEqual(1)
  await context.close()
})
