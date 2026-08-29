import { expect, test, type CDPSession } from '@playwright/test'

type TraceEvent = {
  name?: string
  cat?: string
  ph?: string
  pid?: number
  tid?: number
  ts?: number
  dur?: number
  args?: { name?: string; data?: Record<string, unknown> }
}

async function stopTrace(session: CDPSession, events: TraceEvent[]): Promise<void> {
  await new Promise<void>(async (resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP trace did not finish')), 15_000)
    session.once('Tracing.tracingComplete', () => {
      clearTimeout(timer)
      resolve()
    })
    try {
      await session.send('Tracing.end')
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
  expect(events.length).toBeGreaterThan(0)
}

test('profiles rapid pointer work on the renderer main thread', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 })
  const viewport = page.viewportSize()!
  const targets = await page.evaluate(({ width, height }) => {
    const all = window.__STUDY_GAME_APP__.tapTargets()
    return all.floor
      .filter((candidate) => candidate.screen.x > 190 && candidate.screen.x < width - 24)
      .filter((candidate) => candidate.screen.y > 90 && candidate.screen.y < height - 84)
      .filter((candidate) => document.elementFromPoint(candidate.screen.x, candidate.screen.y)?.tagName === 'CANVAS')
      .filter((candidate) => all.blockers.every((blocker) => Math.hypot(candidate.world.x - blocker.world.x, candidate.world.y - blocker.world.y) > blocker.radius + 24))
      .filter((candidate) => all.seats.every((seat) => Math.hypot(candidate.world.x - seat.world.x, candidate.world.y - seat.world.y) > 40))
      .slice(0, 18)
  }, viewport)
  expect(targets.length).toBeGreaterThanOrEqual(10)

  const session = await page.context().newCDPSession(page)
  const events: TraceEvent[] = []
  session.on('Tracing.dataCollected', ({ value }) => events.push(...value as TraceEvent[]))
  await session.send('Tracing.start', {
    categories: 'toplevel,devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack',
    options: 'record-as-much-as-possible',
    transferMode: 'ReportEvents',
  })
  await session.send('Profiler.enable')
  await session.send('Profiler.setSamplingInterval', { interval: 100 })
  await session.send('Profiler.start')
  for (const target of targets) {
    if (testInfo.project.name.startsWith('mobile')) await page.touchscreen.tap(target.screen.x, target.screen.y)
    else await page.mouse.click(target.screen.x, target.screen.y)
  }
  await page.waitForTimeout(500)
  const { profile } = await session.send('Profiler.stop')
  await session.send('Profiler.disable')
  await stopTrace(session, events)

  const nodes = new Map(profile.nodes.map((node) => [node.id, node]))
  const sampledMicros = new Map<number, number>()
  for (const [index, nodeId] of (profile.samples ?? []).entries()) {
    sampledMicros.set(nodeId, (sampledMicros.get(nodeId) ?? 0) + (profile.timeDeltas?.[index] ?? 0))
  }
  const cpu = [...sampledMicros]
    .map(([nodeId, microseconds]) => {
      const node = nodes.get(nodeId)
      return {
        functionName: node?.callFrame.functionName || '(anonymous)',
        url: node?.callFrame.url || null,
        line: node ? node.callFrame.lineNumber + 1 : null,
        selfMs: Math.round(microseconds / 100) / 10,
      }
    })
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, 24)

  const rendererThreads = new Set(events
    .filter((event) => event.name === 'thread_name' && event.args?.name === 'CrRendererMain')
    .map((event) => `${event.pid}:${event.tid}`))
  const tasks = events
    .filter((event) => event.ph === 'X' && (event.dur ?? 0) >= 40_000)
    .filter((event) => rendererThreads.size === 0 || rendererThreads.has(`${event.pid}:${event.tid}`))
    .sort((left, right) => (right.dur ?? 0) - (left.dur ?? 0))
    .slice(0, 12)
    .map((task) => {
      const start = task.ts ?? 0
      const end = start + (task.dur ?? 0)
      const children = events
        .filter((event) => event.ph === 'X' && event.pid === task.pid && event.tid === task.tid)
        .filter((event) => (event.ts ?? 0) >= start && ((event.ts ?? 0) + (event.dur ?? 0)) <= end)
        .filter((event) => event !== task)
        .sort((left, right) => (right.dur ?? 0) - (left.dur ?? 0))
        .slice(0, 10)
        .map((event) => ({
          name: event.name,
          durationMs: Math.round((event.dur ?? 0) / 100) / 10,
          functionName: event.args?.data?.functionName ?? null,
          url: event.args?.data?.url ?? null,
        }))
      return {
        name: task.name,
        category: task.cat,
        durationMs: Math.round((task.dur ?? 0) / 100) / 10,
        children,
      }
    })
  console.log(`interaction-cdp-profile ${JSON.stringify({ project: testInfo.project.name, rendererThreads: [...rendererThreads], cpu, tasks })}`)
})
