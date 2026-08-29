import { describe, expect, it } from 'vitest'

import { imageRoomActorDepth } from '../src/game/ImageRoomDepth'
import { IMAGE_ROOMS } from '../src/rooms/ImageRoomDefinition'

describe('imageRoomActorDepth', () => {
  it('preserves the established flat-room y sorting', () => {
    expect(imageRoomActorDepth({ y: 52, z: 0 })).toBe(5_210)
    expect(imageRoomActorDepth({ y: 53, z: 0 })).toBeGreaterThan(imageRoomActorDepth({ y: 52, z: 0 }))
  })

  it('keeps every Çim Alan bench transition within one furniture depth band', () => {
    const room = IMAGE_ROOMS['chim-alan']

    for (const seat of room.seats) {
      const approach = room.nodes.find((candidate) => candidate.id === seat.approachNodeId)!
      expect(Math.abs(imageRoomActorDepth(approach) - imageRoomActorDepth(seat.sit)), seat.id).toBeLessThan(6_500)
    }
  })

  it('uses projected feet Y without applying the navigation height twice', () => {
    expect(imageRoomActorDepth({ y: 42, z: 0 })).toBe(imageRoomActorDepth({ y: 42, z: 3 }))

    const before = imageRoomActorDepth({ y: 48, z: 1 })
    const middle = imageRoomActorDepth({ y: 44.5, z: 1.5 })
    const after = imageRoomActorDepth({ y: 41, z: 2 })

    expect(middle).toBeCloseTo((before + after) / 2)
  })
})
