import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/rtai-showcase'

test('RTAI is a complete responsive technical showcase', async ({ page, request }, testInfo) => {
  fs.mkdirSync(OUTPUT, { recursive: true })
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto('/rtai/', { waitUntil: 'networkidle' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.getByText('Why Local Models?', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A visible production chain.' })).toBeVisible()

  const rawResponse = await request.get('/rtai/')
  expect(rawResponse.status()).toBe(200)
  const rawHtml = await rawResponse.text()
  expect(rawHtml).toContain('AI that understands')
  expect(rawHtml).toContain('Why Local Models?')
  expect(rawHtml).toContain('application/ld+json')

  const documentState = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelectorAll('h1').length,
    externalImages: [...document.images].filter((image) => /^https?:/i.test(image.getAttribute('src') ?? '')).length,
  }))
  expect(documentState).toEqual({
    title: 'RTAI — RadioTEDU Artificial Intelligence',
    canonical: 'https://radiotedu.com/rtai/',
    overflow: expect.any(Number),
    h1: 1,
    externalImages: 0,
  })
  expect(documentState.overflow).toBeLessThanOrEqual(1)

  for (const section of await page.locator('main > section').all()) {
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(50)
  }
  for (const reveal of await page.locator('[data-reveal]').all()) {
    await reveal.scrollIntoViewIfNeeded()
    await page.waitForTimeout(25)
  }
  await page.waitForLoadState('networkidle')
  const brokenImages = await page.evaluate(() => [...document.images]
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.getAttribute('src')))
  expect(brokenImages).toEqual([])

  for (const id of ['jingle-title', 'local-title']) {
    const section = page.locator(`#${id}`).locator('xpath=ancestor::section[1]')
    await section.scrollIntoViewIfNeeded()
    await page.waitForTimeout(180)
    await section.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-${id}.png`) })
  }
  await page.locator('.hero').scrollIntoViewIfNeeded()
  await page.waitForTimeout(250)
  await page.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-hero.png`) })
  expect(pageErrors).toEqual([])
})

test('RTAI reduced-motion mode keeps all content visible', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/rtai/', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-reveal]').first()).toBeVisible()
  expect(await page.locator('#signal-field').evaluate((canvas) => getComputedStyle(canvas).display)).toBe('none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await context.close()
})

test('RTAI remains readable without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...testInfo.project.use, javaScriptEnabled: false })
  const page = await context.newPage()
  const response = await page.goto('/rtai/')
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.getByText('Why Local Models?', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
  await context.close()
})
