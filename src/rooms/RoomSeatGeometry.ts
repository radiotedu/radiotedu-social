import type { ImageRoomDefinition, ImageRoomSeat } from './ImageRoomDefinition'
import { calibratedLibrarySeat } from './LibrarySeatCalibration'

export type SeatPoint = Readonly<{ x: number; y: number; z: number }>

export type ResolvedSeatGeometry = Readonly<{
  hitArea: readonly Readonly<{ x: number; y: number }>[]
  approach: SeatPoint
  actorAnchor: SeatPoint
}>

type SeatOverride = Readonly<{
  approach?: SeatPoint
  actorAnchor?: SeatPoint
  hitArea?: readonly Readonly<{ x: number; y: number }>[]
}>

const CURATED_OVERRIDES: Readonly<Record<string, SeatOverride>> = Object.freeze({
  'library:lamp-desk': { approach: { x: 30.86, y: 43.78, z: 0 }, actorAnchor: { x: 33.5, y: 40.49, z: 0 } },
  'library:upper-back-left': { approach: { x: 50, y: 28.48, z: 0 }, actorAnchor: { x: 47.8, y: 29.65, z: 0 } },
  'library:upper-back-mid': { approach: { x: 54.31, y: 36.13, z: 0 } },
  'library:upper-back-right': { approach: { x: 62.92, y: 36.98, z: 0 } },
  'library:middle-back-mid-right': { approach: { x: 44.74, y: 46.33, z: 0 } },
  'library:middle-back-right': { approach: { x: 49.04, y: 47.18, z: 0 } },
  'library:middle-front-left-edge': { approach: { x: 20.33, y: 47.18, z: 0 } },
  'library:middle-front-right': { approach: { x: 41.39, y: 55.69, z: 0 } },
  'library:left-lower-back-left': { approach: { x: 9.81, y: 44.63, z: 0 } },
  'library:left-edge-back': { approach: { x: 9.33, y: 46.33, z: 0 } },
  'library:right-mid-front-left': { approach: { x: 59.57, y: 68.44, z: 0 } },
  // The visual seat anchors are inside the centre seating block. Approach from
  // the collision-safe right aisle, then use the short seated alignment tween.
  'auditorium:auditorium-lower': {
    approach: { x: 59, y: 70.5, z: 0 }, actorAnchor: { x: 61.5, y: 67, z: 0 },
    hitArea: rectangle({ x: 61.5, y: 64.5 }, 6.2, 6.4),
  },
  'auditorium:auditorium-middle': {
    approach: { x: 71, y: 58, z: 0 }, actorAnchor: { x: 74, y: 55, z: 0 },
    hitArea: rectangle({ x: 74, y: 52.5 }, 6, 6),
  },
  'auditorium:auditorium-upper': {
    approach: { x: 77, y: 42, z: 0 }, actorAnchor: { x: 80, y: 40, z: 0 },
    hitArea: rectangle({ x: 80, y: 37.7 }, 6, 5.6),
  },
  'learning-lab:window-chair': {
    approach: { x: 25.282296650717704, y: 72.37619553666313, z: 0 }, actorAnchor: { x: 26, y: 66, z: 0 },
    hitArea: rectangle({ x: 26, y: 66 }, 4.2, 5.4),
  },
  'learning-lab:blue-floor-cushion': {
    approach: { x: 34.880382775119614, y: 82.8134962805526, z: 0 }, actorAnchor: { x: 35, y: 77.5, z: 0 },
    hitArea: rectangle({ x: 35, y: 77.5 }, 4.2, 5.4),
  },
  'learning-lab:gray-floor-cushion': {
    approach: { x: 58.55502392344497, y: 69.1009564293305, z: 0 }, actorAnchor: { x: 57, y: 64, z: 0 },
    hitArea: rectangle({ x: 57, y: 64 }, 4.2, 5.4),
  },
  'learning-lab:right-floor-cushion': {
    approach: { x: 76.19617224880383, y: 73.25079702444208, z: 0 }, actorAnchor: { x: 75, y: 69, z: 0 },
    hitArea: rectangle({ x: 75, y: 69 }, 4.2, 5.4),
  },
  'learning-lab:activity-table-seat': {
    approach: { x: 47.23923444976076, y: 91.82571732199789, z: 0 }, actorAnchor: { x: 47, y: 88, z: 0 },
    hitArea: rectangle({ x: 47, y: 88 }, 4.2, 5.4),
  },
})

function rectangle(center: Readonly<{ x: number; y: number }>, halfWidth: number, halfHeight: number) {
  return [
    { x: center.x - halfWidth, y: center.y - halfHeight },
    { x: center.x + halfWidth, y: center.y - halfHeight },
    { x: center.x + halfWidth, y: center.y + halfHeight },
    { x: center.x - halfWidth, y: center.y + halfHeight },
  ] as const
}

export function resolveSeatGeometry(room: ImageRoomDefinition, seat: ImageRoomSeat): ResolvedSeatGeometry {
  const calibrated = room.id === 'library' ? calibratedLibrarySeat(seat.id) : null
  if (calibrated) return calibrated
  const override = CURATED_OVERRIDES[`${room.id}:${seat.id}`]
  const approachNode = room.nodes.find((node) => node.id === seat.approachNodeId)
  const approach = seat.approach ?? override?.approach ?? approachNode ?? seat.sit
  const assetBottom = seat.foregroundAsset
    ? ((seat.foregroundAsset.y + seat.foregroundAsset.height - 2) / room.image.height) * 100
    : seat.sit.y + (seat.facing === 'n' || seat.facing === 's' ? 2.2 : 1.4)
  const actorAnchor = seat.actorAnchor ?? override?.actorAnchor ?? {
    x: seat.sit.x,
    y: Math.max(seat.sit.y, assetBottom),
    z: seat.sit.z,
  }
  const hitArea = override?.hitArea?.length
    ? override.hitArea
    : seat.hitArea?.length
    ? seat.hitArea
    : seat.foregroundMask?.length
    ? seat.foregroundMask
    : seat.foregroundAsset
      ? [
          { x: (seat.foregroundAsset.x / room.image.width) * 100, y: (seat.foregroundAsset.y / room.image.height) * 100 },
          { x: ((seat.foregroundAsset.x + seat.foregroundAsset.width) / room.image.width) * 100, y: (seat.foregroundAsset.y / room.image.height) * 100 },
          { x: ((seat.foregroundAsset.x + seat.foregroundAsset.width) / room.image.width) * 100, y: ((seat.foregroundAsset.y + seat.foregroundAsset.height) / room.image.height) * 100 },
          { x: (seat.foregroundAsset.x / room.image.width) * 100, y: ((seat.foregroundAsset.y + seat.foregroundAsset.height) / room.image.height) * 100 },
        ]
      : rectangle(actorAnchor, 3.8, 4.2)
  return Object.freeze({ approach: { ...approach }, actorAnchor: { ...actorAnchor }, hitArea })
}
