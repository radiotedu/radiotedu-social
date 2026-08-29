import { describe, expect, it } from 'vitest'

import {
  buildRoomInstanceChoices,
  shouldOfferRoomInstanceSelection,
  STUDY_ROOM_PLAYER_LIMIT,
} from '../src/ui/RoomInstanceSelector'

describe('Social room selection', () => {
  it('keeps one shared room until the 60-player limit creates a second instance', () => {
    expect(STUDY_ROOM_PLAYER_LIMIT).toBe(60)
    expect(shouldOfferRoomInstanceSelection({ roomId: 'library', occupancy: 60, capacity: 60, instanceCount: 1 })).toBe(false)
    expect(shouldOfferRoomInstanceSelection({ roomId: 'library', occupancy: 61, capacity: 60, instanceCount: 2 })).toBe(true)
  })

  it('builds predictable server-backed room IDs and identifies the current room', () => {
    const choices = buildRoomInstanceChoices(
      { roomId: 'library', occupancy: 74, capacity: 60, instanceCount: 2 },
      { id: 'library-2', roomId: 'library', number: 2, occupancy: 14, capacity: 60, preferredInstanceFull: false },
    )

    expect(choices.map((choice) => choice.id)).toEqual([null, 'library-1', 'library-2'])
    expect(choices.find((choice) => choice.id === 'library-2')?.current).toBe(true)
  })
})
