import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const LIVE_URL = process.env.SOCIAL_LIVE_URL
const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/social-20260827-live-r17'

test('public Social entry and current room assets remain available', async ({ page, request }) => {
  test.skip(!LIVE_URL, 'requires explicit production URL')
  fs.mkdirSync(OUTPUT, { recursive: true })

  const response = await page.goto(LIVE_URL!, { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Meet. Focus. Play. Stay on campus.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()

  const assetUrl = new URL('assets/rooms/tedu-ahmet-ersan-auditorium-diagonal-r2.png', LIVE_URL!).href
  const asset = await request.get(assetUrl)
  expect(asset.status()).toBe(200)
  expect(asset.headers()['content-type']).toContain('image/png')
  expect(Number(asset.headers()['content-length'] ?? 0)).toBeGreaterThan(2_000_000)

  const brandScreenUrl = new URL('assets/rooms/auditorium-radiotedu-screen-r1.png', LIVE_URL!).href
  const brandScreen = await request.get(brandScreenUrl)
  expect(brandScreen.status()).toBe(200)
  expect(brandScreen.headers()['content-type']).toContain('image/png')
  expect(Number(brandScreen.headers()['content-length'] ?? 0)).toBeGreaterThan(20_000)

  const libraryUrl = new URL('assets/rooms/tedu-a-blok-library-wide-r2.png', LIVE_URL!).href
  const library = await request.get(libraryUrl)
  expect(library.status()).toBe(200)
  expect(library.headers()['content-type']).toContain('image/png')
  expect(Number(library.headers()['content-length'] ?? 0)).toBeGreaterThan(1_000_000)

  await page.screenshot({ path: path.join(OUTPUT, 'public-social-entry.png') })
})
