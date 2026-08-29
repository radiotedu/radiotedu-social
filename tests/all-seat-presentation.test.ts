import { describe, expect, it } from 'vitest'

import { LocalStudyAdapter } from '../src/adapters/LocalStudyAdapter'
import { AUDITORIUM_RADIOTEDU_SCREEN } from '../src/rooms/AuditoriumPresentation'
import { IMAGE_ROOMS, roomPointToPixel } from '../src/rooms/ImageRoomDefinition'
import { resolveSeatGeometry } from '../src/rooms/RoomSeatGeometry'

describe('all-room seat presentation', () => {
  it('projects the RadioTEDU Auditorium screen at exact room-raster scale', () => {
    expect(AUDITORIUM_RADIOTEDU_SCREEN).toEqual({
      url: 'assets/rooms/auditorium-radiotedu-screen-r1.png',
      width: IMAGE_ROOMS.auditorium.image.width,
      height: IMAGE_ROOMS.auditorium.image.height,
    })
  })

  it('anchors every Auditorium seat inside a diagonal seating row and faces the stage', () => {
    const room = IMAGE_ROOMS.auditorium
    for (const seat of room.seats) {
      const geometry = resolveSeatGeometry(room, seat)
      expect(seat.facing, seat.id).toBe('nw')
      expect(geometry.actorAnchor.x, seat.id).toBeGreaterThanOrEqual(60)
      expect(geometry.actorAnchor.x, seat.id).toBeLessThanOrEqual(82)
      expect(geometry.approach.x, seat.id).toBeGreaterThanOrEqual(58)
      expect(geometry.approach.x, seat.id).toBeLessThan(geometry.actorAnchor.x)
      const hitXs = geometry.hitArea.map((point) => point.x)
      expect(Math.min(...hitXs), seat.id).toBeLessThanOrEqual(geometry.actorAnchor.x)
      expect(Math.max(...hitXs), seat.id).toBeGreaterThanOrEqual(geometry.actorAnchor.x)
      expect(Math.max(...hitXs) - Math.min(...hitXs), seat.id).toBeGreaterThanOrEqual(12)
    }
  })

  it('keeps Spark clear of every Giriş occupant', () => {
    const room = IMAGE_ROOMS['chim-alan']
    const spark = room.nodes.find((node) => node.id === 'spark')!
    const sparkPixel = roomPointToPixel(room, spark)
    for (const seat of room.seats) {
      const anchor = roomPointToPixel(room, resolveSeatGeometry(room, seat).actorAnchor)
      expect(Math.hypot(anchor.x - sparkPixel.x, anchor.y - sparkPixel.y), seat.id).toBeGreaterThan(150)
    }
  })

  it('declares 71 in-bounds seats across the five seat-bearing rooms', () => {
    const seats = Object.values(IMAGE_ROOMS).flatMap((room) => room.seats.map((seat) => ({ room, seat })))
    expect(seats).toHaveLength(71)
    for (const { room, seat } of seats) {
      const geometry = resolveSeatGeometry(room, seat)
      expect(geometry.actorAnchor.x, `${room.id}:${seat.id}`).toBeGreaterThanOrEqual(0)
      expect(geometry.actorAnchor.x, `${room.id}:${seat.id}`).toBeLessThanOrEqual(100)
      expect(geometry.actorAnchor.y, `${room.id}:${seat.id}`).toBeGreaterThanOrEqual(0)
      expect(geometry.actorAnchor.y, `${room.id}:${seat.id}`).toBeLessThanOrEqual(100)
    }
  })

  it('uses current room seat and approach IDs for every local social occupant', () => {
    const adapter = new LocalStudyAdapter()
    for (const room of Object.values(IMAGE_ROOMS)) {
      for (const person of adapter.presence(room.id)) {
        expect(room.seats.some((seat) => seat.id === person.seatId), person.displayName).toBe(true)
        expect(room.nodes.some((node) => node.id === person.nodeId), person.displayName).toBe(true)
      }
    }
  })
})
