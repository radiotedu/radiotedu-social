import { readFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { NavigationGraph } from '../src/pathfinding/NavigationGraph'
import { RoomNavigationField, pointInPolygon } from '../src/pathfinding/RoomNavigationField'
import { IMAGE_ROOMS, roomPointToPixel } from '../src/rooms/ImageRoomDefinition'
import { roomInteractionObstacles, roomNavigationGeometry } from '../src/rooms/RoomNavigationProfiles'
import { resolveSeatGeometry } from '../src/rooms/RoomSeatGeometry'
import layout from '../src/rooms/data/chim-alan-courtyard-layout.json'

const room = IMAGE_ROOMS['chim-alan']
const field = new RoomNavigationField({
  width: room.image.width,
  height: room.image.height,
  geometry: roomNavigationGeometry(room),
  clearance: 18,
})

// The filename remains stable for existing QA runners; the active scene is now
// calibrated to the official TEDU Orta Bahçe and Chillin Cafe references.
describe('Çim Alan official courtyard calibration', () => {
  it('binds the calibration to the current TEDU-grounded source artwork', () => {
    expect(layout.image).toEqual({
      width: room.image.width,
      height: room.image.height,
      sha256: room.image.sha256,
    })
  })

  it('binds the three real courtyard benches to stable actor anchors', () => {
    expect(room.seats.map((seat) => seat.id)).toEqual([
      'courtyard-bench-west',
      'courtyard-bench-cafe',
      'courtyard-bench-rear',
    ])
    for (const seat of room.seats) {
      const geometry = resolveSeatGeometry(room, seat)
      expect(geometry.actorAnchor.z, seat.id).toBe(1)
      expect(geometry.hitArea, seat.id).toHaveLength(4)
    }
  })

  it('uses the real broad and side steps to reach the upper courtyard', () => {
    const graph = new NavigationGraph(room.nodes, room.edges)
    const cafe = graph.findPath(room.spawnNodeId, 'cafe-approach')
    const stage = graph.findPath(room.spawnNodeId, 'stage-east')
    expect(cafe.some((id) => id === 'central-steps-upper' || id === 'left-steps-upper')).toBe(true)
    expect(stage).toContain('central-steps-upper')
    expect(room.edges.filter((edge) => edge.kind === 'stair')).toHaveLength(2)
  })

  it('keeps every bench approach reachable while bench fronts reject floor walking', () => {
    const interactionObstacles = roomInteractionObstacles(room)
    for (const seat of room.seats) {
      const geometry = resolveSeatGeometry(room, seat)
      const approach = roomPointToPixel(room, geometry.approach)
      expect(field.isWalkable(approach, geometry.approach.z), `${seat.id} approach`).toBe(true)
      expect(interactionObstacles.some((polygon) => (
        geometry.hitArea.some((point) => pointInPolygon(roomPointToPixel(room, point), polygon))
      )), `${seat.id} front`).toBe(true)
    }
  })

  it('keeps real plazas and lawn walkable without exposing invented roads or solid structures', () => {
    expect(field.isWalkable({ x: 820, y: 850 }, 0), 'lower plaza').toBe(true)
    expect(field.isWalkable({ x: 820, y: 470 }, 1), 'central lawn').toBe(true)
    expect(field.layerAt({ x: 1_200, y: 540 }), 'round stage').toBeNull()
    expect(field.layerAt({ x: 350, y: 360 }), 'Chillin Cafe kiosk').toBeNull()
    expect(field.layerAt({ x: 1_200, y: 150 }), 'campus building').toBeNull()
    expect(field.layerAt({ x: 1_600, y: 120 }), 'invented upper road').toBeNull()
  })

  it('ships transparent source-pixel foreground assets for every calibrated seat', async () => {
    for (const seat of room.seats) {
      const asset = seat.foregroundAsset!
      const file = path.join(process.cwd(), 'public', asset.url)
      const metadata = await sharp(await readFile(file)).metadata()
      expect(metadata.channels, seat.id).toBe(4)
      expect(metadata.hasAlpha, seat.id).toBe(true)
      expect(asset.width, seat.id).toBeGreaterThan(60)
      expect(asset.height, seat.id).toBeGreaterThan(10)
    }
  })

  it('keeps both roadside radio actors reachable on real courtyard paths', () => {
    const graph = new NavigationGraph(room.nodes, room.edges)
    expect(graph.findPath(room.spawnNodeId, room.actors.spark!.nodeId).at(-1)).toBe('spark')
    expect(graph.findPath(room.spawnNodeId, room.actors.rock!.nodeId).at(-1)).toBe('rock')
  })
})
