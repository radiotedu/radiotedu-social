import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

const outputDirectory = process.argv[2]
  ?? 'C:/Users/tuna.ozsari/Desktop/artifacts/social-campus-reference'
const startUrl = 'https://www.tedu.edu.tr/360-derece-sanal-tur'

fs.mkdirSync(outputDirectory, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

async function clickWithMouse(locator) {
  await locator.first().waitFor({ state: 'attached', timeout: 15_000 })
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index)
    if (!await candidate.isVisible()) continue
    const box = await candidate.boundingBox()
    if (!box) continue
    await page.mouse.click(box.x + (box.width / 2), box.y + (box.height / 2))
    return
  }
  throw new Error('Reference control has no visible clickable bounds')
}

async function hoverWithMouse(locator) {
  await locator.first().waitFor({ state: 'attached', timeout: 15_000 })
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index)
    if (!await candidate.isVisible()) continue
    const box = await candidate.boundingBox()
    if (!box) continue
    await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2), { steps: 8 })
    return
  }
  throw new Error('Reference control has no visible hover bounds')
}

async function openSubmenuWithMouse(locator) {
  await locator.first().waitFor({ state: 'attached', timeout: 15_000 })
  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index)
    if (!await candidate.isVisible()) continue
    const row = candidate.locator('xpath=..')
    const box = await row.boundingBox()
    if (!box) continue
    await page.mouse.click(box.x + box.width - 12, box.y + (Math.min(box.height, 28) / 2))
    return
  }
  throw new Error('Reference submenu has no visible clickable bounds')
}

try {
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(5_000)
  await page.screenshot({
    path: path.join(outputDirectory, 'campus-reference-entry.png'),
    fullPage: true,
  })

  const interactives = await page.locator('a, button, [role="button"], iframe').evaluateAll((elements) => (
    elements.slice(0, 40).map((element) => ({
      tag: element.tagName.toLowerCase(),
      text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 100),
      label: element.getAttribute('aria-label') ?? '',
      title: element.getAttribute('title') ?? '',
      href: element instanceof HTMLAnchorElement ? element.href : '',
      src: element instanceof HTMLIFrameElement ? element.src : '',
    })).filter((item) => item.text || item.label || item.title || item.href || item.src)
  ))
  const tourFrame = page.frames().find((frame) => frame.url().includes('tourmake.net/'))
  let conferenceLabels = []
  if (tourFrame) {
    await openSubmenuWithMouse(tourFrame.getByText('KONFERANS SALONLARI', { exact: true }))
    await page.waitForTimeout(1_500)
    conferenceLabels = [...new Set((await tourFrame.locator('body').innerText()).split(/\r?\n/)
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter((value) => value && value.length <= 100))].slice(0, 160)
    await page.locator('iframe[src*="tourmake.net"]').screenshot({
      path: path.join(outputDirectory, 'conference-menu.png'),
    })
    const auditoriumControl = tourFrame.getByText('AHMET ERSAN KONFERANS SALONU', { exact: true }).first()
    await auditoriumControl.locator('xpath=../..').evaluate((submenu) => {
      submenu.style.display = 'block'
    })
    await clickWithMouse(tourFrame.getByText('AHMET ERSAN KONFERANS SALONU', { exact: true }))
    await page.waitForTimeout(5_000)
    const tourViewport = page.locator('iframe[src*="tourmake.net"]')
    await tourViewport.screenshot({ path: path.join(outputDirectory, 'auditorium-reference-angle-0.png') })
    const viewportBox = await tourViewport.boundingBox()
    if (viewportBox) {
      const centerY = viewportBox.y + (viewportBox.height * 0.52)
      await page.mouse.move(viewportBox.x + (viewportBox.width * 0.66), centerY)
      await page.mouse.down()
      await page.mouse.move(viewportBox.x + (viewportBox.width * 0.34), centerY, { steps: 24 })
      await page.mouse.up()
      await page.waitForTimeout(2_000)
      await tourViewport.screenshot({ path: path.join(outputDirectory, 'auditorium-reference-angle-1.png') })
      await page.mouse.move(viewportBox.x + (viewportBox.width * 0.32), centerY)
      await page.mouse.down()
      await page.mouse.move(viewportBox.x + (viewportBox.width * 0.78), centerY, { steps: 28 })
      await page.mouse.up()
      await page.waitForTimeout(2_000)
      await tourViewport.screenshot({ path: path.join(outputDirectory, 'auditorium-reference-angle-2.png') })
    }
  }
  const tourLabels = tourFrame
    ? [...new Set((await tourFrame.locator('body').innerText()).split(/\r?\n/)
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter((value) => value && value.length <= 100))].slice(0, 120)
    : []

  console.log(JSON.stringify({
    title: await page.title(),
    finalUrl: page.url(),
    frames: page.frames().map((frame) => ({ name: frame.name(), url: frame.url() })),
    tourLabels,
    conferenceLabels,
  }, null, 2))
} finally {
  await browser.close()
}
