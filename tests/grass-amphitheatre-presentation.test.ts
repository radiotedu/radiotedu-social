import { readFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { NavigationGraph } from '../src/pathfinding/NavigationGraph'
import { RoomNavigationField, pointInPolygon } from '../src/pathfinding/RoomNavigationField'
import { IMAGE_ROOMS, roomPointToPixel } from '../src/rooms/ImageRoomDefinition'
import { roomInteractionObstacles, roomNavigationGeometry } from '../src/rooms/RoomNavigationProfiles'
import { resolveSeatGeometry } from '../src/rooms/RoomSeatGeometry'
import layout from '../src/rooms/data/chim-alan-amphitheatre-layout.json'

const room = IMAGE_ROOMS['grass-amphitheatre']
const field = new RoomNavigationField({
  width: room.image.width,
  height: room.image.height,
  geometry: roomNavigationGeometry(room),
  clearance: 18,
})

describe('Çim Alan grass amphitheatre', () => {
  it('keeps Giriş and Çim Alan as separate campus rooms', () => {
    expect(IMAGE_ROOMS['chim-alan'].title).toBe('Giriş')
    expect(room.title).toBe('Çim Alan')
    expect(room.id).toBe('grass-amphitheatre')
    expect(layout.image).toEqual({
      width: room.image.width,
      height: room.image.height,
      sha256: room.image.sha256,
    })
  })

  it('preserves all nine amphitheatre seats across three reachable levels', () => {
    const graph = new NavigationGraph(room.nodes, room.edges)
    expect(room.seats).toHaveLength(9)
    expect(new Set(room.seats.map((seat) => seat.sit.z))).toEqual(new Set([1, 2, 3]))
    for (const seat of room.seats) {
      const pathToSeat = graph.findPath(room.spawnNodeId, seat.approachNodeId)
      expect(pathToSeat.at(-1), seat.id).toBe(seat.approachNodeId)
      expect(pathToSeat.length, seat.id).toBeGreaterThan(1)
    }
  })

  it('keeps seat approaches walkable while amphitheatre fronts block floor clicks', () => {
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

  it('ships transparent foreground cutouts for every amphitheatre seat', async () => {
    for (const seat of room.seats) {
      const asset = seat.foregroundAsset!
      const metadata = await sharp(await readFile(path.join(process.cwd(), 'public', asset.url))).metadata()
      expect(metadata.hasAlpha, seat.id).toBe(true)
      expect(asset.width, seat.id).toBeGreaterThan(80)
      expect(asset.height, seat.id).toBeGreaterThan(20)
    }
  })

  it('keeps both roadside radio hosts reachable', () => {
    const graph = new NavigationGraph(room.nodes, room.edges)
    expect(graph.findPath(room.spawnNodeId, room.actors.spark!.nodeId).at(-1)).toBe('spark')
    expect(graph.findPath(room.spawnNodeId, room.actors.rock!.nodeId).at(-1)).toBe('rock')
  })
})
