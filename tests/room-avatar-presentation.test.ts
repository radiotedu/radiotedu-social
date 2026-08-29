import { describe, expect, it } from 'vitest'

import { roomAvatarScale } from '../src/rooms/RoomAvatarPresentation'

describe('room avatar presentation scale', () => {
  it('applies restrained depth perspective across the Çim Alan courtyard', () => {
    const rear = roomAvatarScale('chim-alan', 30, false)
    const front = roomAvatarScale('chim-alan', 85, false)
    expect(rear).toBeLessThan(0.76)
    expect(front).toBeGreaterThan(0.95)
    expect(front).toBeLessThan(1)
    expect(front - rear).toBeGreaterThan(0.2)
  })

  it('matches Computer Lab avatars to the desk scale with depth perspective', () => {
    const rear = roomAvatarScale('learning-lab', 40, false)
    const front = roomAvatarScale('learning-lab', 80, false)
    const seated = roomAvatarScale('learning-lab', 64, true)
    const frontComputer = roomAvatarScale('learning-lab', 88, true, 'activity-table-seat')

    expect(rear).toBeGreaterThan(0.84)
    expect(rear).toBeLessThan(0.9)
    expect(front).toBeGreaterThan(rear)
    expect(front - rear).toBeGreaterThan(0.2)
    expect(seated).toBeGreaterThan(0.9)
    expect(seated).toBeLessThan(roomAvatarScale('learning-lab', 64, false))
    expect(frontComputer).toBeGreaterThan(1.05)
    expect(frontComputer).toBeLessThan(roomAvatarScale('learning-lab', 88, false))
  })

  it('keeps Swimming Pool avatars in scale from the rear deck to the foreground', () => {
    const rear = roomAvatarScale('sports-center', 28, false)
    const front = roomAvatarScale('sports-center', 88, false)
    expect(rear).toBeLessThan(0.8)
    expect(front).toBeGreaterThan(1.02)
    expect(front - rear).toBeGreaterThan(0.25)
  })

  it('applies depth perspective in the Auditorium', () => {
    const rear = roomAvatarScale('auditorium', 34, false)
    const front = roomAvatarScale('auditorium', 88, false)
    expect(rear).toBeLessThan(front)
    expect(front - rear).toBeGreaterThan(0.2)
  })

  it('preserves the calibrated Library scale', () => {
    expect(roomAvatarScale('library', 50, false)).toBe(1.08)
    expect(roomAvatarScale('library', 50, true)).toBe(1)
  })
})
