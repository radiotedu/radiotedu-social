import { expect, test, type Browser, type BrowserContext, type Route } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

type TestAccount = Readonly<{
  id: string
  displayName: string
  equipped: Readonly<Record<string, string>>
}>
type SharedPresence = Readonly<{
  userId: string
  displayName: string
  roomId: string
  instanceId: string
  nodeId: string
  seatId: string | null
  position: Readonly<{ x: number; y: number }>
  equipped: Readonly<Record<string, string>>
  lastSeen: number
}>
type SharedMessage = Readonly<{
  id: string
  userId: string
  displayName: string
  text: string
  roomId: string
  instanceId: string
  createdAt: number
}>

const OUTPUT = path.resolve('..', 'artifacts', 'study-game', 'shared-multiplayer')
const AD_OUTPUT = path.resolve('..', 'artifacts', 'study-game', 'social-ad-recording')
const MOTION_OUTPUT = path.resolve('..', 'artifacts', 'study-game', 'social-motion-recording')
const AD_DESKTOP = 'C:/Users/tuna.ozsari/Desktop/RadioTEDU-Social-Advertisement-1x1-20260828-r29.webm'
const INSTANCE_ID = 'library-1'

class SharedStudyServer {
  readonly presence = new Map<string, SharedPresence>()
  readonly messages: SharedMessage[] = []
  readonly joinCalls = new Map<string, number>()
  readonly failedHeartbeats = new Set<string>()
  readonly failNextHeartbeat = new Set<string>()
  #messageSequence = 0

  async handle(route: Route, account: TestAccount): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const endpoint = url.pathname.replace(/^\/__shared-study__/, '')
    const method = request.method()
    const body = this.#jsonBody(request.postData())

    if (endpoint === '/study/avatar/me') {
      return this.#success(route, {
        ownedItemIds: [...new Set(Object.values(account.equipped))],
        equipped: account.equipped,
        points: { spendable_points: 120 },
      })
    }
    if (endpoint === '/study/summary') {
      return this.#success(route, { todaySeconds: 0, monthSeconds: 0, totalSeconds: 0 })
    }
    if (endpoint === '/study/sessions/start' && method === 'POST') {
      return this.#success(route, {
        session: { id: `shared-study-${account.id}` },
        nonce: `shared-nonce-${account.id}-1`,
      })
    }
    if (/^\/study\/sessions\/[^/]+\/heartbeat$/.test(endpoint) && method === 'POST') {
      return this.#success(route, {
        session: { id: `shared-study-${account.id}` },
        nonce: `shared-nonce-${account.id}-2`,
        accepted_seconds: 10,
      })
    }
    if (/^\/study\/sessions\/[^/]+\/finish$/.test(endpoint) && method === 'POST') {
      return this.#success(route, {
        session: { id: `shared-study-${account.id}` },
        awarded_points: 0,
        spendable_points: 120,
      })
    }
    if (endpoint === '/gamification/events') return this.#success(route, { events: [] })
    if (endpoint === '/economy/study/shop') return this.#success(route, { items: [], gold_balance: 120 })

    if (endpoint === '/study/instances/join' && method === 'POST') {
      this.joinCalls.set(account.id, (this.joinCalls.get(account.id) ?? 0) + 1)
      return this.#success(route, {
        instance: {
          id: INSTANCE_ID,
          roomId: 'library',
          number: 1,
          occupancy: Math.min(60, this.presence.size + 1),
          capacity: 60,
          preferredInstanceFull: false,
        },
      })
    }

    if (endpoint === '/study/presence/heartbeat' && method === 'POST') {
      if (this.failNextHeartbeat.delete(account.id)) {
        this.failedHeartbeats.add(account.id)
        return this.#failure(route, 'TRANSIENT_ROOM_SYNC_FAILURE', 503)
      }
      this.presence.set(account.id, {
        userId: account.id,
        displayName: account.displayName,
        roomId: String(body.roomId ?? 'library'),
        instanceId: String(body.instanceId ?? INSTANCE_ID),
        nodeId: String(body.nodeId ?? 'spawn'),
        seatId: typeof body.seatId === 'string' ? body.seatId : null,
        position: this.#position(body.position),
        equipped: account.equipped,
        lastSeen: Date.now(),
      })
      return this.#success(route, {})
    }

    if (endpoint === '/study/presence' && method === 'GET') {
      const roomId = url.searchParams.get('roomId') ?? 'library'
      const instanceId = url.searchParams.get('instanceId') ?? INSTANCE_ID
      const active = [...this.presence.values()].filter((entry) => (
        entry.roomId === roomId && entry.instanceId === instanceId && Date.now() - entry.lastSeen < 30_000
      ))
      return this.#success(route, { presence: active })
    }

    if (endpoint === '/study/chat' && method === 'POST') {
      const message: SharedMessage = Object.freeze({
        id: `shared-message-${++this.#messageSequence}`,
        userId: account.id,
        displayName: account.displayName,
        text: String(body.text ?? ''),
        roomId: String(body.roomId ?? 'library'),
        instanceId: String(body.instanceId ?? INSTANCE_ID),
        createdAt: Date.now(),
      })
      this.messages.push(message)
      return this.#success(route, { message })
    }

    if (endpoint === '/study/chat' && method === 'GET') {
      const roomId = url.searchParams.get('roomId') ?? 'library'
      const instanceId = url.searchParams.get('instanceId') ?? INSTANCE_ID
      return this.#success(route, {
        messages: this.messages.filter((message) => message.roomId === roomId && message.instanceId === instanceId),
      })
    }

    return this.#failure(route, `UNHANDLED_${method}_${endpoint}`, 404)
  }

  #jsonBody(raw: string | null): Record<string, unknown> {
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw) as unknown
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }

  #position(value: unknown): Readonly<{ x: number; y: number }> {
    const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    return {
      x: typeof candidate.x === 'number' && Number.isFinite(candidate.x) ? candidate.x : 0,
      y: typeof candidate.y === 'number' && Number.isFinite(candidate.y) ? candidate.y : 0,
    }
  }

  async #success(route: Route, data: unknown): Promise<void> {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    })
  }

  async #failure(route: Route, error: string, status: number): Promise<void> {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error }),
    })
  }
}

async function createPlayer(
  browser: Browser,
  baseURL: string,
  server: SharedStudyServer,
  account: TestAccount,
  compact: boolean,
  recordAdvertisement = false,
  recordMotion = false,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL,
    viewport: recordAdvertisement ? { width: 1080, height: 1080 } : compact ? { width: 412, height: 839 } : { width: 1280, height: 820 },
    isMobile: compact,
    hasTouch: compact,
    recordVideo: recordAdvertisement
      ? { dir: AD_OUTPUT, size: { width: 1080, height: 1080 } }
      : recordMotion
        ? { dir: MOTION_OUTPUT, size: { width: 1280, height: 820 } }
        : undefined,
  })
  await context.addInitScript(({ account: player }) => {
    HTMLMediaElement.prototype.play = async function playForSharedWorldTest() { return undefined }
    window.RadioTEDUStudyBridge = {
      apiBase: '/__shared-study__/study',
      account: { ...player, authenticated: true },
      globalPoints: 120,
      request: (input, init) => window.fetch(input, init),
    }
  }, { account })
  await context.route('**/__shared-study__/**', (route) => server.handle(route, account))
  return context
}

async function farthestReachableNode(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    const candidate = window.__STUDY_GAME_APP__.tapTargets().nodes
      .filter((node) => node.reachable && node.id !== snapshot.nodeId)
      .map((node) => ({ node, distance: Math.hypot(node.world.x - snapshot.position.x, node.world.y - snapshot.position.y) }))
      .sort((left, right) => right.distance - left.distance)[0]
    if (!candidate) throw new Error('No alternate reachable node found')
    return candidate.node.id
  })
}

async function remoteActorWorldPosition(page: import('@playwright/test').Page, userId: string) {
  return page.evaluate((remoteUserId) => (
    window.__STUDY_GAME_APP__.snapshot().remotePlayers
      .find((player) => player.userId === remoteUserId)?.position ?? null
  ), userId)
}

async function remoteActorProfile(page: import('@playwright/test').Page, userId: string) {
  return page.evaluate((remoteUserId) => (
    window.__STUDY_GAME_APP__.snapshot().remotePlayers.find((player) => player.userId === remoteUserId) ?? null
  ), userId)
}

async function showAdvertisementCut(
  page: import('@playwright/test').Page,
  eyebrow: string,
  title: string,
  copy: string,
  duration = 1_800,
  keep = false,
) {
  await page.evaluate(({ eyebrow: label, title: heading, copy: body }) => {
    document.querySelector('#social-ad-cut')?.remove()
    const cut = document.createElement('section')
    cut.id = 'social-ad-cut'
    cut.setAttribute('aria-label', heading)
    Object.assign(cut.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', alignContent: 'center',
      justifyItems: 'start', padding: '96px', color: '#f4fff9', background: '#071315',
      fontFamily: 'Arial, Helvetica, sans-serif', boxSizing: 'border-box', overflow: 'hidden',
    })
    const accent = document.createElement('span')
    Object.assign(accent.style, { width: '112px', height: '8px', marginBottom: '34px', background: '#7ce0b8' })
    const brand = document.createElement('strong')
    brand.textContent = 'RADIOTEDU  SOCIAL'
    Object.assign(brand.style, { color: '#7ce0b8', fontSize: '22px', letterSpacing: '6px', fontWeight: '900' })
    const kicker = document.createElement('small')
    kicker.textContent = label
    Object.assign(kicker.style, { marginTop: '54px', color: '#ffcf4a', fontSize: '22px', letterSpacing: '5px', fontWeight: '900' })
    const headline = document.createElement('h1')
    headline.textContent = heading
    Object.assign(headline.style, { maxWidth: '850px', margin: '24px 0 22px', fontSize: '84px', lineHeight: '.96', letterSpacing: '-4px' })
    const paragraph = document.createElement('p')
    paragraph.textContent = body
    Object.assign(paragraph.style, { maxWidth: '760px', margin: '0', color: '#b9cbc5', fontSize: '30px', lineHeight: '1.35' })
    cut.append(accent, brand, kicker, headline, paragraph)
    document.body.append(cut)
  }, { eyebrow, title, copy })
  await page.waitForTimeout(duration)
  if (!keep) {
    await page.evaluate(() => document.querySelector('#social-ad-cut')?.remove())
    await page.waitForTimeout(250)
  }
}

async function sitAtAvailableSeat(page: import('@playwright/test').Page, excludedSeatId = ''): Promise<string> {
  const target = await page.evaluate((excluded) => {
    const snapshot = window.__STUDY_GAME_APP__.snapshot()
    const candidates = window.__STUDY_GAME_APP__.tapTargets().seats
      .filter((seat) => seat.reachable && !seat.occupied && seat.id !== excluded)
      .map((seat) => ({
        seat,
        distance: Math.hypot(seat.world.x - snapshot.position.x, seat.world.y - snapshot.position.y),
      }))
      .sort((left, right) => left.distance - right.distance)
    const seat = candidates[0]?.seat
    if (!seat) return null
    return {
      id: seat.id,
      x: seat.hitAreaScreen.reduce((sum, point) => sum + point.x, 0) / seat.hitAreaScreen.length,
      y: seat.hitAreaScreen.reduce((sum, point) => sum + point.y, 0) / seat.hitAreaScreen.length,
    }
  }, excludedSeatId)
  if (!target) throw new Error('No available advertisement seat was found')
  await page.evaluate((seatId) => window.__STUDY_GAME_APP__.walkToSeat(seatId), target.id)
  await expect(page.locator('html')).toHaveAttribute('data-game-state', 'seated', { timeout: 30_000 })
  return target.id
}

test('keeps two independent students in one live room with movement, chat, and reconnect', async ({ browser, baseURL }, testInfo) => {
  const advertisementRequested = process.env.SOCIAL_AD_RECORD === '1'
  const motionRequested = process.env.SOCIAL_MOTION_RECORD === '1'
  const motionFramesRequested = process.env.SOCIAL_MOTION_FRAMES === '1'
  test.setTimeout(advertisementRequested ? 360_000 : 180_000)
  if (!baseURL) throw new Error('Playwright base URL is unavailable')
  fs.mkdirSync(OUTPUT, { recursive: true })

  const server = new SharedStudyServer()
  const compact = testInfo.project.name === 'mobile-chromium'
  const recordAdvertisement = advertisementRequested && !compact
  const arda = {
    id: recordAdvertisement ? 'ad-jacob' : 'shared-arda', displayName: recordAdvertisement ? 'Jacob' : 'Arda',
    equipped: { hair: 'short-hair', top: 'varsity-jacket', bottom: 'black-cargos', shoes: 'boots', hat: 'beanie' },
  } as const
  const deniz = {
    id: recordAdvertisement ? 'ad-denis' : 'shared-deniz', displayName: recordAdvertisement ? 'Denis' : 'Deniz',
    equipped: { hair: 'short-hair', top: 'radiotedu-tee', bottom: 'jeans', shoes: 'sneakers', hat: 'bucket-hat' },
  } as const
  if (recordAdvertisement) fs.mkdirSync(AD_OUTPUT, { recursive: true })
  if (motionRequested && !compact) fs.mkdirSync(MOTION_OUTPUT, { recursive: true })
  const motionFramesDir = motionFramesRequested && !compact
    ? path.join(MOTION_OUTPUT, `after-frames-${new Date().toISOString().replace(/[:.]/g, '-')}`)
    : null
  if (motionFramesDir) fs.mkdirSync(motionFramesDir, { recursive: true })
  const ardaContext = await createPlayer(browser, baseURL, server, arda, compact, recordAdvertisement)
  const denizContext = await createPlayer(browser, baseURL, server, deniz, compact, false, motionRequested && !compact)
  const ardaPage = await ardaContext.newPage()
  const denizPage = await denizContext.newPage()
  const advertisementVideo = recordAdvertisement ? ardaPage.video() : null
  const motionVideo = motionRequested && !compact ? denizPage.video() : null
  let advertisementComplete = false
  const runtimeErrors: string[] = []
  for (const page of [ardaPage, denizPage]) {
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('crash', () => runtimeErrors.push('page crashed'))
  }

  try {
    await Promise.all([
      ardaPage.goto('/?room=library'),
      denizPage.goto('/?room=library'),
    ])
    await Promise.all([
      ardaPage.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 }),
      denizPage.locator('html[data-study-ready="true"]').waitFor({ timeout: 30_000 }),
    ])
    if (recordAdvertisement) {
      await showAdvertisementCut(ardaPage, 'TEDU CAMPUS · ONLINE', 'A desk is better together.', 'Meet your friends, choose your look and focus in the same live campus.', 2_200)
    }

    await expect.poll(() => server.presence.size, { timeout: 15_000 }).toBe(2)
    await expect.poll(() => ardaPage.locator('#people-count').textContent(), { timeout: 25_000 }).toBe('1')
    await expect.poll(() => denizPage.locator('#people-count').textContent(), { timeout: 25_000 }).toBe('1')
    if (recordAdvertisement) await ardaPage.waitForTimeout(1_800)
    await ardaPage.getByRole('button', { name: 'People' }).click()
    await denizPage.getByRole('button', { name: 'People' }).click()
    await expect(ardaPage.getByTestId(`presence-${deniz.id}`)).toContainText(deniz.displayName)
    await expect(denizPage.getByTestId(`presence-${arda.id}`)).toContainText(arda.displayName)
    await expect.poll(() => remoteActorProfile(denizPage, arda.id), { timeout: 25_000 }).toMatchObject({
      userId: arda.id,
      displayName: arda.displayName,
      appearance: { topId: 'varsity-jacket', bottomId: 'black-cargos', shoesId: 'boots', hatId: 'beanie' },
    })
    await expect.poll(async () => (await remoteActorProfile(denizPage, arda.id))?.layerTextures ?? [], { timeout: 25_000 }).toEqual(expect.arrayContaining([
      'avatar:top-varsity-jacket-idle',
      'avatar:bottom-black-cargos-idle',
      'avatar:shoes-boots-idle',
      'avatar:hat-beanie-idle',
    ]))
    await expect.poll(() => remoteActorProfile(ardaPage, deniz.id), { timeout: 25_000 }).toMatchObject({
      userId: deniz.id,
      displayName: deniz.displayName,
      appearance: { topId: 'radiotedu-tee', bottomId: 'jeans', shoesId: 'sneakers', hatId: 'bucket-hat' },
    })
    await ardaPage.getByRole('button', { name: 'Close people' }).click()
    await denizPage.getByRole('button', { name: 'Close people' }).click()
    await Promise.all([
      ardaPage.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-00-arda-sees-deniz-outfit.png`) }),
      denizPage.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-00-deniz-sees-arda-outfit.png`) }),
    ])
    if (recordAdvertisement) {
      await ardaPage.waitForTimeout(1_500)
      await showAdvertisementCut(ardaPage, 'YOUR NAME · YOUR LOOK', 'Recognise your people.', 'Every student arrives with a server-synced username and an outfit that stays visible while walking, chatting and studying.')
    }

    const firstRemotePosition = await remoteActorWorldPosition(denizPage, arda.id)
    expect(firstRemotePosition).not.toBeNull()
    const firstTarget = await farthestReachableNode(ardaPage)
    await ardaPage.evaluate((nodeId) => window.__STUDY_GAME_APP__.walkToNode(nodeId), firstTarget)
    await expect.poll(() => server.presence.get(arda.id)?.nodeId, { timeout: 15_000 }).toBe(firstTarget)
    const motionSamples: Array<{ frame: number; elapsedMs: number; x: number; y: number }> = []
    const sampleStartedAt = Date.now()
    for (let frame = 0; frame < 90; frame += 1) {
      const position = await remoteActorWorldPosition(denizPage, arda.id)
      if (position) motionSamples.push({ frame, elapsedMs: Date.now() - sampleStartedAt, ...position })
      if (motionFramesDir && frame % 5 === 0) {
        await denizPage.screenshot({ path: path.join(motionFramesDir, `frame-${String(frame).padStart(3, '0')}.png`) })
      }
      await denizPage.waitForTimeout(100)
    }
    const frameDeltas = motionSamples.slice(1).map((sample, index) => {
      const previous = motionSamples[index]!
      return Math.hypot(sample.x - previous.x, sample.y - previous.y)
    })
    const movingFrames = frameDeltas.filter((delta) => delta > 0.5)
    const measuredDistance = frameDeltas.reduce((total, delta) => total + delta, 0)
    const maxFrameDelta = Math.max(0, ...frameDeltas)
    const directDisplacement = firstRemotePosition && motionSamples.length
      ? Math.hypot(
          motionSamples.at(-1)!.x - firstRemotePosition.x,
          motionSamples.at(-1)!.y - firstRemotePosition.y,
        )
      : 0
    if (motionRequested && !compact) {
      fs.writeFileSync(path.join(MOTION_OUTPUT, 'remote-avatar-frame-analysis.json'), JSON.stringify({
        capturedAt: new Date().toISOString(),
        sampleIntervalMs: 100,
        samples: motionSamples,
        movingFrames: movingFrames.length,
        measuredDistance,
        directDisplacement,
        maxFrameDelta,
        visualFramesDirectory: motionFramesDir,
      }, null, 2))
    }
    expect(directDisplacement).toBeGreaterThan(20)
    expect(movingFrames.length).toBeGreaterThan(3)
    expect(maxFrameDelta).toBeLessThan(Math.max(30, measuredDistance * 0.45))

    if (recordAdvertisement) {
      const denizStart = await remoteActorWorldPosition(ardaPage, deniz.id)
      const denizTarget = await farthestReachableNode(denizPage)
      await denizPage.evaluate((nodeId) => window.__STUDY_GAME_APP__.walkToNode(nodeId), denizTarget)
      await expect.poll(() => server.presence.get(deniz.id)?.nodeId, { timeout: 15_000 }).toBe(denizTarget)
      await expect.poll(async () => {
        const next = await remoteActorWorldPosition(ardaPage, deniz.id)
        if (!next || !denizStart) return 0
        return Math.hypot(next.x - denizStart.x, next.y - denizStart.y)
      }, { timeout: 25_000 }).toBeGreaterThan(20)
      await ardaPage.waitForTimeout(1_500)
    }

    await ardaPage.getByRole('button', { name: 'Chat' }).click()
    await ardaPage.getByLabel('Chat message').fill('Library study starts now')
    await ardaPage.getByRole('button', { name: 'Send message' }).click()
    await expect(ardaPage.getByTestId('chat-log')).toContainText('Library study starts now')
    await expect(denizPage.locator('html')).toHaveAttribute('data-chat-bubble', 'Library study starts now', { timeout: 8_000 })
    await expect(denizPage.locator('html')).toHaveAttribute('data-chat-speaker', arda.displayName)
    await denizPage.getByRole('button', { name: 'Chat' }).click()
    await expect(denizPage.getByTestId('chat-log')).toContainText('Library study starts now')
    await expect(denizPage.getByTestId('chat-log')).toContainText(arda.displayName)
    if (recordAdvertisement) {
      await denizPage.getByLabel('Chat message').fill('I saved you a desk.')
      await denizPage.getByRole('button', { name: 'Send message' }).click()
      await expect(ardaPage.getByTestId('chat-log')).toContainText('I saved you a desk.')
      await expect(ardaPage.getByTestId('chat-log')).toContainText(deniz.displayName)
      await ardaPage.waitForTimeout(2_200)
    }
    if (recordAdvertisement) {
      expect(server.messages).toHaveLength(2)
      await showAdvertisementCut(ardaPage, 'ONE ROOM · TWO CONNECTIONS', 'Focus from anywhere.', 'Walk to a real desk, sit naturally and keep the same shared room open with your friends.')
      await Promise.all([ardaPage, denizPage].map((page) => page.evaluate(() => {
        document.querySelector<HTMLButtonElement>('#chat-close')?.click()
      })))
      await expect(ardaPage.getByTestId('chat-log')).toBeHidden()
      await expect(denizPage.getByTestId('chat-log')).toBeHidden()
      const denizSeat = await sitAtAvailableSeat(denizPage)
      await expect.poll(() => server.presence.get(deniz.id)?.seatId, { timeout: 20_000 }).toBe(denizSeat)
      await sitAtAvailableSeat(ardaPage, denizSeat)
      await expect.poll(() => server.presence.get(arda.id)?.seatId, { timeout: 20_000 }).not.toBeNull()
      await ardaPage.waitForTimeout(3_000)
      expect(runtimeErrors).toEqual([])
      await showAdvertisementCut(ardaPage, 'RADIOTEDU SOCIAL', 'Meet. Focus. Play.', 'Join the live TEDU campus at radiotedu.com/social', 2_800, true)
      advertisementComplete = true
      return
    }

    expect(server.messages).toHaveLength(1)

    await Promise.all([
      ardaPage.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-01-arda-shared-room.png`) }),
      denizPage.screenshot({ path: path.join(OUTPUT, `${testInfo.project.name}-02-deniz-remote-chat.png`) }),
    ])

    server.failNextHeartbeat.add(arda.id)
    const joinsBeforeRecovery = server.joinCalls.get(arda.id) ?? 0
    await expect.poll(() => server.failedHeartbeats.has(arda.id), { timeout: 20_000 }).toBe(true)
    await expect.poll(() => server.joinCalls.get(arda.id) ?? 0, { timeout: 20_000 }).toBe(joinsBeforeRecovery + 1)
    await expect.poll(() => Date.now() - (server.presence.get(arda.id)?.lastSeen ?? 0), { timeout: 20_000 }).toBeLessThan(5_000)
    await expect(denizPage.locator('html')).toHaveAttribute('data-study-ready', 'true')
    expect(runtimeErrors).toEqual([])
  } finally {
    await Promise.all([ardaContext.close(), denizContext.close()])
    if (recordAdvertisement && advertisementComplete && advertisementVideo) {
      const videoPath = await advertisementVideo.path()
      fs.copyFileSync(videoPath, AD_DESKTOP)
    }
    if (motionVideo) {
      const videoPath = await motionVideo.path()
      fs.copyFileSync(videoPath, path.join(MOTION_OUTPUT, 'remote-avatar-after.webm'))
    }
  }
})
