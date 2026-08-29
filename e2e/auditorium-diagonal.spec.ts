import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const OUTPUT = 'C:/Users/tuna.ozsari/Desktop/artifacts/social-20260827-auditorium-diagonal-r2'

test('Auditorium keeps its diagonal room perspective during real mouse movement', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop perspective evidence')
  test.setTimeout(90_000)
  fs.mkdirSync(OUTPUT, { recursive: true })

  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole('tab', { name: 'Auditorium' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-room-id', 'auditorium')

  const floor = await page.evaluate(() => window.__STUDY_GAME_APP__.tapTargets().floor
    .filter((candidate) => document.elementFromPoint(candidate.screen.x, candidate.screen.y)?.tagName === 'CANVAS')
    .sort((left, right) => (
      Math.hypot(left.world.x - 520, left.world.y - 760)
      - Math.hypot(right.world.x - 520, right.world.y - 760)
    ))[0] ?? null)

  expect(floor, 'Auditorium needs a visible collision-safe foreground floor point').not.toBeNull()
  await page.mouse.click(floor!.screen.x, floor!.screen.y)
  await expect.poll(
    () => page.evaluate(() => window.__STUDY_GAME_APP__.snapshot().state),
    { timeout: 30_000 },
  ).toBe('ready')

  await expect(page.locator('.room-title')).toContainText('Ahmet Ersan')
  await page.screenshot({ path: path.join(OUTPUT, 'auditorium-diagonal-after-mouse-walk.png') })

  for (const seatId of ['auditorium-lower', 'auditorium-middle', 'auditorium-upper']) {
    const seat = await page.evaluate((id) => {
      const candidate = window.__STUDY_GAME_APP__.tapTargets().seats.find((item) => item.id === id)
      if (!candidate) return null
      return {
        reachable: candidate.reachable,
        x: candidate.hitAreaScreen.reduce((sum, point) => sum + point.x, 0) / candidate.hitAreaScreen.length,
        y: candidate.hitAreaScreen.reduce((sum, point) => sum + point.y, 0) / candidate.hitAreaScreen.length,
      }
    }, seatId)
    expect(seat, `${seatId} needs a pointer target`).not.toBeNull()
    expect(seat!.reachable, `${seatId} needs a connected aisle approach`).toBe(true)
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, seat!)).toBe('CANVAS')
    await page.mouse.click(seat!.x, seat!.y)
    await expect(page.locator('html')).toHaveAttribute('data-seated-seat-id', seatId, { timeout: 30_000 })
    await page.screenshot({ path: path.join(OUTPUT, `${seatId}-seated.png`) })

    const exitFloor = await page.evaluate(() => window.__STUDY_GAME_APP__.tapTargets().floor
      .filter((candidate) => document.elementFromPoint(candidate.screen.x, candidate.screen.y)?.tagName === 'CANVAS')
      .sort((left, right) => (
        Math.hypot(left.world.x - 520, left.world.y - 720)
        - Math.hypot(right.world.x - 520, right.world.y - 720)
      ))[0] ?? null)
    expect(exitFloor).not.toBeNull()
    await page.mouse.click(exitFloor!.screen.x, exitFloor!.screen.y)
    await expect.poll(
      () => page.evaluate(() => window.__STUDY_GAME_APP__.snapshot().state),
      { timeout: 30_000 },
    ).toBe('ready')
    await expect(page.locator('html')).not.toHaveAttribute('data-seated-seat-id', seatId)
  }

  await page.evaluate(() => {
    const navigation = window.__STUDY_GAME_APP__.navigation()
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    const canvas = document.querySelector('canvas')!.getBoundingClientRect()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(window.innerWidth))
    svg.setAttribute('height', String(window.innerHeight))
    svg.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none'
    const points = (polygon: readonly { x: number; y: number }[]) => polygon.map((point) => (
      `${canvas.left + ((point.x - snapshot.camera.worldViewX) * snapshot.camera.zoom)},${canvas.top + ((point.y - snapshot.camera.worldViewY) * snapshot.camera.zoom)}`
    )).join(' ')
    for (const layer of navigation.layers) {
      for (const polygon of layer.walkable) {
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
        shape.setAttribute('points', points(polygon))
        shape.setAttribute('fill', 'rgba(72, 255, 165, .14)')
        shape.setAttribute('stroke', '#48ffa5')
        shape.setAttribute('stroke-width', '2')
        svg.append(shape)
      }
    }
    for (const polygon of navigation.obstacles) {
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      shape.setAttribute('points', points(polygon))
      shape.setAttribute('fill', 'rgba(255, 68, 88, .18)')
      shape.setAttribute('stroke', '#ff4458')
      shape.setAttribute('stroke-width', '2')
      svg.append(shape)
    }
    const line = (x1: number, y1: number, x2: number, y2: number, label: string) => {
      const from = {
        x: canvas.left + ((x1 - snapshot.camera.worldViewX) * snapshot.camera.zoom),
        y: canvas.top + ((y1 - snapshot.camera.worldViewY) * snapshot.camera.zoom),
      }
      const to = {
        x: canvas.left + ((x2 - snapshot.camera.worldViewX) * snapshot.camera.zoom),
        y: canvas.top + ((y2 - snapshot.camera.worldViewY) * snapshot.camera.zoom),
      }
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      shape.setAttribute('x1', String(from.x))
      shape.setAttribute('y1', String(from.y))
      shape.setAttribute('x2', String(to.x))
      shape.setAttribute('y2', String(to.y))
      shape.setAttribute('stroke', 'rgba(255,255,255,.32)')
      shape.setAttribute('stroke-width', '1')
      svg.append(shape)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', String(from.x + 3))
      text.setAttribute('y', String(from.y + 12))
      text.setAttribute('fill', '#ffffff')
      text.setAttribute('font-size', '10')
      text.textContent = label
      svg.append(text)
    }
    for (let amount = 0; amount <= 100; amount += 10) {
      line((amount / 100) * 1672, 0, (amount / 100) * 1672, 941, `${amount}% x`)
      line(0, (amount / 100) * 941, 1672, (amount / 100) * 941, `${amount}% y`)
    }
    document.body.append(svg)
  })
  await page.screenshot({ path: path.join(OUTPUT, 'auditorium-navigation-overlay.png') })
})
