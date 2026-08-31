import { describe, expect, it } from 'vitest'

import { resolveNearestAvailableSeat } from '../src/game/NearestSeatResolver'

describe('resolveNearestAvailableSeat', () => {
  it('selects the nearest reachable available seat deterministically', () => {
    expect(resolveNearestAvailableSeat({ x: 0, y: 0 }, [
      { seatId: 'far', x: 12, y: 0, available: true, reachable: true },
      { seatId: 'near', x: 3, y: 4, available: true, reachable: true },
    ])?.seatId).toBe('near')
    expect(resolveNearestAvailableSeat({ x: 0, y: 0 }, [
      { seatId: 'b', x: 2, y: 0, available: true, reachable: true },
      { seatId: 'a', x: -2, y: 0, available: true, reachable: true },
    ])?.seatId).toBe('a')
  })

  it('skips occupied and unreachable seats and returns null when none remain', () => {
    expect(resolveNearestAvailableSeat({ x: 0, y: 0 }, [
      { seatId: 'occupied', x: 1, y: 0, available: false, reachable: true },
      { seatId: 'blocked', x: 2, y: 0, available: true, reachable: false },
      { seatId: 'open', x: 8, y: 0, available: true, reachable: true },
    ])?.seatId).toBe('open')
    expect(resolveNearestAvailableSeat({ x: 0, y: 0 }, [
      { seatId: 'occupied', x: 1, y: 0, available: false, reachable: true },
      { seatId: 'blocked', x: 2, y: 0, available: true, reachable: false },
    ])).toBeNull()
  })
})
