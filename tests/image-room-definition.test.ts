import { describe, expect, it } from 'vitest'

import { campusCatVariantsForRoom, roomTextureAssets } from '../src/game/RoomAssetPlan'
import { NavigationGraph } from '../src/pathfinding/NavigationGraph'
import { IMAGE_ROOMS, roomPointToPixel, type ImageRoomId } from '../src/rooms/ImageRoomDefinition'

describe('IMAGE_ROOMS', () => {
  it('preserves stable room IDs while exposing campus-grounded rooms', () => {
    expect(Object.keys(IMAGE_ROOMS)).toEqual(['library', 'chim-alan', 'grass-amphitheatre', 'sports-center', 'auditorium', 'learning-lab'])
    expect(IMAGE_ROOMS.library.title).toBe('Library')
    expect(IMAGE_ROOMS['chim-alan'].title).toBe('Giriş')
    expect(IMAGE_ROOMS['chim-alan'].image).toEqual(expect.objectContaining({
      url: 'assets/rooms/tedu-orta-bahce-chillin-cafe-wide-r4.png',
      sha256: 'ac46adbe1dd91f26b82fb402abcc86580ce9dd61c0785403578e410410ac8e0c',
    }))
    expect(IMAGE_ROOMS['grass-amphitheatre']).toEqual(expect.objectContaining({
      title: 'Çim Alan',
      image: expect.objectContaining({
        url: 'assets/rooms/chim-alan-wide.png',
        sha256: '84afe78fbf7fb502bea4646d402b638f4ade4e29969ed41fc6a103c2c5018ebf',
      }),
    }))
    expect(IMAGE_ROOMS['sports-center'].image.sha256).toBe('de48f7ffef84dbd487cd4e2ac0596c10d6c5e31846baf2408a4a51ea82439660')
    expect(IMAGE_ROOMS.auditorium.image.sha256).toBe('7783287e9b07ab72fd5500aa028436f1b5c7b6e6c5ef98888fa40e7938b7ce72')
    expect(IMAGE_ROOMS['sports-center'].image.width / IMAGE_ROOMS['sports-center'].image.height).toBeCloseTo(16 / 9, 2)
    expect(IMAGE_ROOMS.auditorium.image.width / IMAGE_ROOMS.auditorium.image.height).toBeCloseTo(16 / 9, 2)
    expect(IMAGE_ROOMS['learning-lab'].image.sha256).toBe('2b6c33d42727b9ae580d35bbf38595c7e4af72c783cb360e4a71f0c2342abbff')
    expect(IMAGE_ROOMS['learning-lab'].image.width / IMAGE_ROOMS['learning-lab'].image.height).toBeCloseTo(16 / 9, 2)
  })

  it('budgets startup textures for only the active room while preserving exact asset URLs', () => {
    const roomIds = Object.keys(IMAGE_ROOMS) as ImageRoomId[]
    const libraryAssets = roomTextureAssets('library', null, '/')
    const libraryKeys = new Set(libraryAssets.map((asset) => asset.key))
    const allRoomKeys = new Set(roomIds.flatMap((roomId) => (
      roomTextureAssets(roomId, null, '/').map((asset) => asset.key)
    )))

    expect(libraryAssets.find((asset) => asset.key === 'room:library')?.url).toBe('/assets/rooms/library-wide.png')
    expect(libraryAssets.find((asset) => asset.key === 'campus-cat:0')?.url).toBe('/assets/npcs/campus-cat-tarcin-walk.png')
    expect(libraryKeys.size).toBe(60)
    expect(libraryKeys.size).toBeLessThan(allRoomKeys.size)
    for (const roomId of roomIds.filter((candidate) => candidate !== 'library')) {
      expect(libraryKeys.has(`room:${roomId}`), roomId).toBe(false)
    }
    expect(roomTextureAssets('auditorium', null, '/')).toContainEqual(expect.objectContaining({
      key: 'auditorium:radiotedu-screen',
      url: '/assets/rooms/auditorium-radiotedu-screen-r1.png',
    }))
  })

  it('loads only the active cat roster and follows the equipped Library pet', () => {
    expect(campusCatVariantsForRoom('sports-center', null)).toEqual([1])
    expect(campusCatVariantsForRoom('grass-amphitheatre', null)).toEqual([0, 2])
    expect(campusCatVariantsForRoom('library', 'pet-komur')).toEqual([2])
  })

  it('routes from each exact room spawn to every configured seat', () => {
    for (const room of Object.values(IMAGE_ROOMS)) {
      const graph = new NavigationGraph(room.nodes, room.edges)
      for (const seat of room.seats) {
        const path = graph.findPath(room.spawnNodeId, seat.approachNodeId)
        expect(path, `${room.id}:${seat.id}`).not.toEqual([])
        expect(path.at(-1)).toBe(seat.approachNodeId)
      }
    }
  })

  it('keeps every seat transition adjacent instead of sliding across furniture', () => {
    for (const room of Object.values(IMAGE_ROOMS)) {
      const graph = new NavigationGraph(room.nodes, room.edges)
      for (const seat of room.seats) {
        const approach = graph.node(seat.approachNodeId)!
        const approachPixel = roomPointToPixel(room, approach)
        const sitPixel = roomPointToPixel(room, seat.sit)
        expect(
          Math.hypot(approachPixel.x - sitPixel.x, approachPixel.y - sitPixel.y),
          `${room.id}:${seat.id}`,
        ).toBeLessThanOrEqual(64)
      }
    }
  })

  it('keeps the real Orta Bahçe stair transition elevated and exposes Spark plus Rock', () => {
    const room = IMAGE_ROOMS['chim-alan']
    const graph = new NavigationGraph(room.nodes, room.edges)
    const path = graph.findPath(room.spawnNodeId, 'cafe-approach')
    const levels = new Set(path.map((id) => graph.node(id)?.z))

    expect(levels).toEqual(new Set([0, 1]))
    expect(room.actors.spark).toEqual(expect.objectContaining({ name: 'Spark', label: 'Spark Radio' }))
    expect(room.actors.rock).toEqual(expect.objectContaining({ name: 'Rock' }))
  })

  it('keeps the Library front-left route on the visible center and left aisles', () => {
    const room = IMAGE_ROOMS.library
    const graph = new NavigationGraph(room.nodes, room.edges)
    const path = graph.findPath(room.spawnNodeId, 'approach:front-left')

    expect(path).toEqual([
      'bottom-center-aisle',
      'lower-center-aisle',
      'lower-left-aisle',
      'middle-left-aisle',
      'upper-left-aisle',
      'seat-front-left-stand',
      'approach:front-left',
    ])
    expect(path).not.toContain('entrance')
    expect(path.some((id) => id.startsWith('right-spine-'))).toBe(false)
  })

  it('keeps Library center and right-side routes out of the entrance detour', () => {
    const room = IMAGE_ROOMS.library
    const graph = new NavigationGraph(room.nodes, room.edges)
    const middleCenter = graph.findPath(room.spawnNodeId, 'middle-center-aisle')
    const middleRight = graph.findPath(room.spawnNodeId, 'middle-right-aisle')

    expect(middleCenter).toContain('upper-center-aisle')
    expect(middleCenter).not.toContain('middle-right-aisle')
    expect(middleRight).toContain('lower-right-aisle')
    expect(middleRight).not.toContain('entrance')

    for (const seat of room.seats) {
      const path = graph.findPath(room.spawnNodeId, seat.approachNodeId)
      expect(path, seat.id).not.toContain('entrance')
    }
  })

  it('maps percentage navigation coordinates to exact source-image pixels', () => {
    const room = IMAGE_ROOMS.library
    expect(roomPointToPixel(room, { x: 50, y: 25 })).toEqual({ x: 836, y: 235.25 })
  })
})
