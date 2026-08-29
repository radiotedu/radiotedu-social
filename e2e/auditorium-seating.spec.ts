import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

const artifactDir = 'C:/RadioTEDU/artifacts/social-exclusive-store-auditorium-r28/after'
const seatIds = ['auditorium-lower', 'auditorium-middle', 'auditorium-upper'] as const

test.beforeAll(() => fs.mkdirSync(artifactDir, { recursive: true }))

test('Auditorium seats preserve the real outfit, stage facing, anchor, and four-frame sit animation', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/?room=auditorium')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })

  await page.evaluate(async () => {
    await window.__STUDY_GAME_APP__.equip('top', 'varsity-jacket')
    await window.__STUDY_GAME_APP__.equip('bottom', 'black-cargos')
    await window.__STUDY_GAME_APP__.equip('shoes', 'boots')
    await window.__STUDY_GAME_APP__.equip('hat', 'beanie')
  })

  for (const seatId of seatIds) {
    const target = await page.evaluate((id) => {
      const seat = window.__STUDY_GAME_APP__.tapTargets().seats.find((candidate) => candidate.id === id)
      if (!seat) throw new Error(`Missing seat ${id}`)
      const minX = Math.min(...seat.hitAreaScreen.map((point) => point.x))
      const maxX = Math.max(...seat.hitAreaScreen.map((point) => point.x))
      const minY = Math.min(...seat.hitAreaScreen.map((point) => point.y))
      const maxY = Math.max(...seat.hitAreaScreen.map((point) => point.y))
      const visibleLeft = Math.max(minX + 2, 8)
      const visibleRight = Math.min(maxX - 2, window.innerWidth - 8)
      const visibleTop = Math.max(minY + 2, 8)
      const visibleBottom = Math.min(maxY - 2, window.innerHeight - 8)
      return {
        ...seat,
        screen: {
          x: visibleLeft <= visibleRight ? (visibleLeft + visibleRight) / 2 : seat.screen.x,
          y: visibleTop <= visibleBottom ? (visibleTop + visibleBottom) / 2 : seat.screen.y,
        },
      }
    }, seatId)
    expect(target.reachable).toBe(true)
    expect(target.occupied).toBe(false)
    if (testInfo.project.name === 'mobile-chromium') await page.touchscreen.tap(target.screen.x, target.screen.y)
    else await page.mouse.click(target.screen.x, target.screen.y)
    await page.waitForTimeout(4_000)
    const inputResult = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
    if (inputResult.state !== 'seated') {
      throw new Error(`Auditorium seat input missed: ${JSON.stringify({
        seatId,
        screen: target.screen,
        world: target.world,
        hitArea: target.hitArea,
        lastWalkTarget: inputResult.lastWalkTarget,
        position: inputResult.position,
        camera: inputResult.camera,
      })}`)
    }
    await expect(page.locator('html')).toHaveAttribute('data-game-state', 'seated', { timeout: 30_000 })
    await expect(page.locator('html')).toHaveAttribute('data-seated-seat-id', seatId)

    const samples = []
    const capturedFrames = new Set<number>()
    for (let attempt = 0; attempt < 24 && capturedFrames.size < 4; attempt += 1) {
      const snapshot = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
      if (!capturedFrames.has(snapshot.animationFrame)) {
        capturedFrames.add(snapshot.animationFrame)
        samples.push(snapshot)
        await page.screenshot({
          path: path.join(artifactDir, `${testInfo.project.name}-${seatId}-frame-${snapshot.animationFrame}.png`),
        })
      }
      await page.waitForTimeout(80)
    }

    const firstSample = samples[0]
    expect(firstSample).toBeDefined()
    if (!firstSample) throw new Error(`No seated animation sample was captured for ${seatId}`)
    for (const snapshot of samples) {
      expect(snapshot).toMatchObject({
        roomId: 'auditorium',
        state: 'seated',
        seatId,
        action: 'sit',
        direction: 'nw',
        topId: 'varsity-jacket',
        bottomId: 'black-cargos',
        shoesId: 'boots',
        hatId: 'beanie',
      })
      expect(snapshot.layerTextures.body).toContain('body-sit')
      expect(snapshot.layerTextures.skin).toContain('skin-sit')
      expect(snapshot.layerTextures.hair).toContain('hair-sit')
      expect(snapshot.layerTextures.top).toContain('top-varsity-jacket-sit')
      expect(snapshot.layerTextures.bottom).toContain('bottom-black-cargos-sit')
      expect(snapshot.layerTextures.shoes).toContain('shoes-boots-sit')
      expect(snapshot.layerTextures.hat).toContain('hat-beanie-sit')
      expect(snapshot.position.x).toBeCloseTo(firstSample.position.x, 4)
      expect(snapshot.position.y).toBeCloseTo(firstSample.position.y, 4)
    }
    expect(capturedFrames.size).toBe(4)

    await page.evaluate(() => window.__STUDY_GAME_APP__.stand())
    await expect(page.locator('html')).toHaveAttribute('data-game-state', 'ready', { timeout: 10_000 })
  }
})
