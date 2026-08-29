import { describe, expect, it } from 'vitest'

import { RoomNavigationField } from '../src/pathfinding/RoomNavigationField'
import { IMAGE_ROOMS, roomPointToPixel } from '../src/rooms/ImageRoomDefinition'
import { roomNavigationGeometry } from '../src/rooms/RoomNavigationProfiles'

describe('room seat approach calibration', () => {
  it('finds a collision-safe nearby floor point for every Computer Lab chair', () => {
    const room = IMAGE_ROOMS['learning-lab']
    const field = new RoomNavigationField({
      width: room.image.width,
      height: room.image.height,
      geometry: roomNavigationGeometry(room),
      clearance: 18,
    })
    const origins = room.nodes
      .map((node) => field.nearestWalkable(roomPointToPixel(room, node), node.z, 140))
      .filter((point): point is { x: number; y: number } => Boolean(point))

    for (const seat of room.seats) {
      const sit = roomPointToPixel(room, seat.sit)
      const candidates: Array<{ x: number; y: number; distance: number }> = []
      for (let y = Math.max(0, sit.y - 64); y <= Math.min(room.image.height, sit.y + 64); y += 2) {
        for (let x = Math.max(0, sit.x - 64); x <= Math.min(room.image.width, sit.x + 64); x += 2) {
          const distance = Math.hypot(x - sit.x, y - sit.y)
          if (distance > 64 || !field.isWalkable({ x, y }, seat.sit.z)) continue
          candidates.push({ x, y, distance })
        }
      }
      candidates.sort((left, right) => left.distance - right.distance || right.y - left.y)
      const selected = candidates.slice(0, 160).find((candidate) => {
        const resolved = field.nearestWalkable(candidate, seat.sit.z, 220)
        return Boolean(resolved && origins.some((origin) => field.findPath(origin, resolved, seat.sit.z).length >= 2))
      })
      expect(selected, seat.id).toBeDefined()
      expect(selected!.distance, seat.id).toBeLessThanOrEqual(64)
    }
  })
})
