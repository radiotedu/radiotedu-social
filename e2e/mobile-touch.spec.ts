import { expect, test, type Page } from '@playwright/test'

async function visibleFloorTarget(page: Page) {
  const viewport = page.viewportSize()!
  return page.evaluate(({ width, height }) => {
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    const targets = window.__STUDY_GAME_APP__.tapTargets()
    return targets.floor
      .filter((candidate) => candidate.screen.x > 24 && candidate.screen.x < width - 24)
      .filter((candidate) => candidate.screen.y > 90 && candidate.screen.y < height - 100)
      .filter((candidate) => document.elementFromPoint(candidate.screen.x, candidate.screen.y)?.tagName === 'CANVAS')
      .filter((candidate) => targets.blockers.every((blocker) => (
        Math.hypot(candidate.world.x - blocker.world.x, candidate.world.y - blocker.world.y) > blocker.radius + 52
      )))
      .filter((candidate) => targets.seats.every((seat) => (
        Math.hypot(candidate.world.x - seat.world.x, candidate.world.y - seat.world.y) > 100
      )))
      .map((candidate) => ({
        candidate,
        distance: Math.hypot(candidate.world.x - snapshot.position.x, candidate.world.y - snapshot.position.y),
      }))
      .filter(({ distance }) => distance > 180)
      .sort((left, right) => right.distance - left.distance)[0]?.candidate ?? null
  }, { width: viewport.width, height: viewport.height })
}

test('mobile canvas supports tap-to-move, tap-to-sit, and tap-to-stand', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch-only journey')

  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
  const viewport = page.viewportSize()!
  const dockBounds = await page.locator('[aria-label="Game actions"] button').evaluateAll((buttons) => buttons.map((button) => {
    const bounds = button.getBoundingClientRect()
    return { label: button.getAttribute('aria-label'), top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left }
  }))
  expect(dockBounds).toHaveLength(7)
  for (const [index, bounds] of dockBounds.entries()) {
    expect(bounds.left, `${bounds.label} left bound`).toBeGreaterThanOrEqual(0)
    expect(bounds.top, `${bounds.label} top bound`).toBeGreaterThanOrEqual(0)
    expect(bounds.right, `${bounds.label} right bound`).toBeLessThanOrEqual(viewport.width)
    expect(bounds.bottom, `${bounds.label} bottom bound`).toBeLessThanOrEqual(viewport.height)
    if (index > 0) expect(bounds.left, `${bounds.label} overlaps previous action`).toBeGreaterThanOrEqual(dockBounds[index - 1]!.right)
  }
  const floor = await visibleFloorTarget(page)
  if (!floor) throw new Error('Expected a visible floor target away from seats')

  await page.touchscreen.tap(floor.screen.x, floor.screen.y)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', /walking|stair/)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'ready', { timeout: 30_000 })
  await expect.poll(async () => {
    const snapshot = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
    return snapshot.lastWalkTarget !== null
      && Math.hypot(snapshot.position.x - snapshot.lastWalkTarget.x, snapshot.position.y - snapshot.lastWalkTarget.y) <= 8
  }).toBe(true)

  const seat = await page.evaluate(({ width, height }) => {
    const candidate = window.__STUDY_GAME_APP__.tapTargets().seats
      .filter((target) => target.reachable && !target.occupied)
      .map((target) => ({
        ...target,
        tap: {
          x: target.hitAreaScreen.reduce((sum, point) => sum + point.x, 0) / target.hitAreaScreen.length,
          y: target.hitAreaScreen.reduce((sum, point) => sum + point.y, 0) / target.hitAreaScreen.length,
        },
      }))
      .filter((target) => target.tap.x > 24 && target.tap.x < width - 24)
      .filter((target) => target.tap.y > 90 && target.tap.y < height - 100)
      .filter((target) => document.elementFromPoint(target.tap.x, target.tap.y)?.tagName === 'CANVAS')[0]
    return candidate ?? null
  }, { width: viewport.width, height: viewport.height })
  if (!seat) throw new Error('Expected a visible available seat')

  await page.touchscreen.tap(seat.tap.x, seat.tap.y)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'seated', { timeout: 30_000 })
  await expect.poll(async () => (await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())).seatId).toBe(seat.id)

  const standingFloor = await visibleFloorTarget(page)
  if (!standingFloor) throw new Error('Expected a visible floor target for standing')
  await page.touchscreen.tap(standingFloor.screen.x, standingFloor.screen.y)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', /standing|walking|ready/)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'ready', { timeout: 30_000 })
  await expect.poll(async () => {
    const snapshot = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
    return snapshot.seatId === null
      && snapshot.lastWalkTarget !== null
      && Math.hypot(snapshot.position.x - snapshot.lastWalkTarget.x, snapshot.position.y - snapshot.lastWalkTarget.y) <= 8
  }).toBe(true)
})

test('mobile movement controls form a square D-pad and route through the scene graph', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'touch-only controls')

  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })

  const pad = page.getByTestId('movement-dpad')
  await expect(pad).toBeVisible()
  const geometry = await pad.locator('button').evaluateAll((buttons) => Object.fromEntries(buttons.map((button) => {
    const bounds = button.getBoundingClientRect()
    return [button.getAttribute('data-move-direction'), {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    }]
  }))) as Record<string, { x: number; y: number; width: number; height: number }>

  expect(Object.keys(geometry).sort()).toEqual(['down', 'left', 'right', 'up'])
  for (const bounds of Object.values(geometry)) {
    expect(bounds.width).toBe(44)
    expect(bounds.height).toBe(44)
  }
  const up = geometry.up!
  const left = geometry.left!
  const right = geometry.right!
  const down = geometry.down!
  expect(up.y).toBeLessThan(left.y)
  expect(left.y).toBe(right.y)
  expect(down.y).toBeGreaterThan(left.y)
  expect(up.x).toBe(down.x)
  expect(left.x).toBeLessThan(up.x)
  expect(right.x).toBeGreaterThan(up.x)

  const before = await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())
  const candidates = [
    { direction: 'up', x: 0, y: -1 },
    { direction: 'left', x: -1, y: 0 },
    { direction: 'right', x: 1, y: 0 },
    { direction: 'down', x: 0, y: 1 },
  ]
  const viable = await page.evaluate((options) => {
    const start = window.__STUDY_GAME_APP__.snapshot()
    return options.find(({ x, y }) => window.__STUDY_GAME_APP__.tapTargets().nodes.some((node) => {
      if (!node.reachable || node.id === start.nodeId) return false
      const dx = node.world.x - start.position.x
      const dy = node.world.y - start.position.y
      const length = Math.hypot(dx, dy)
      return length > 0 && ((dx * x) + (dy * y)) / length > 0.18
    }))?.direction ?? null
  }, candidates)
  if (!viable) throw new Error('Expected at least one graph direction from the initial node')

  await pad.locator(`[data-move-direction="${viable}"]`).click()
  await expect(page.locator('html')).toHaveAttribute('data-game-state', /walking|stair|ready/)
  await expect.poll(async () => (await page.evaluate(() => window.__STUDY_GAME_APP__.snapshot())).nodeId).not.toBe(before.nodeId)
})
