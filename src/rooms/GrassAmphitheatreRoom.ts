import type { NavigationEdge, NavigationNode } from '../pathfinding/NavigationGraph'
import type { ImageRoomDefinition, ImageRoomOccluder, ImageRoomSeat } from './ImageRoomDefinition'

const nodes: readonly NavigationNode[] = Object.freeze(([
  ['entrance', 50, 95, 0], ['lower-path', 50, 85, 0], ['middle-path', 50, 71, 0],
  ['rock', 30, 67, 0], ['upper-path', 50, 58, 0], ['stair-0', 35, 54, 0],
  ['stair-1', 35, 48, 1], ['stair-2', 35, 41, 2], ['stair-3', 35, 34, 3],
  ['stair-4', 35, 27, 3], ['courtyard', 47, 23, 3], ['spark', 57, 20, 3],
  ['row-1-left', 48, 48, 1], ['row-1-mid', 63, 47, 1], ['row-1-right', 77, 46, 1],
  ['row-2-left', 48, 41, 2], ['row-2-mid', 63, 40, 2], ['row-2-right', 77, 39, 2],
  ['row-3-left', 49, 34, 3], ['row-3-mid', 64, 33, 3], ['row-3-right', 78, 32, 3],
] as const).map(([id, x, y, z]) => Object.freeze({ id, x, y, z })))

const edges: readonly NavigationEdge[] = Object.freeze(([
  ['entrance', 'lower-path', 'walk'], ['lower-path', 'middle-path', 'walk'],
  ['middle-path', 'upper-path', 'walk'], ['middle-path', 'rock', 'walk'],
  ['upper-path', 'stair-0', 'walk'], ['stair-0', 'stair-1', 'stair'],
  ['stair-1', 'stair-2', 'stair'], ['stair-2', 'stair-3', 'stair'],
  ['stair-3', 'stair-4', 'walk'], ['stair-4', 'courtyard', 'walk'],
  ['courtyard', 'spark', 'walk'], ['stair-1', 'row-1-left', 'walk'],
  ['row-1-left', 'row-1-mid', 'walk'], ['row-1-mid', 'row-1-right', 'walk'],
  ['stair-2', 'row-2-left', 'walk'], ['row-2-left', 'row-2-mid', 'walk'],
  ['row-2-mid', 'row-2-right', 'walk'], ['stair-3', 'row-3-left', 'walk'],
  ['row-3-left', 'row-3-mid', 'walk'], ['row-3-mid', 'row-3-right', 'walk'],
] as const).map(([from, to, kind]) => Object.freeze({ from, to, kind })))

type SeatSpec = readonly [
  id: string,
  row: number,
  approachNodeId: string,
  x: number,
  y: number,
  z: number,
  assetX: number,
  assetY: number,
  assetWidth: number,
  assetHeight: number,
]

const seatSpecs: readonly SeatSpec[] = Object.freeze([
  ['amfi-a1', 1, 'row-1-left', 48, 47.3, 1, 718, 449, 170, 25],
  ['amfi-a2', 1, 'row-1-mid', 63, 46.3, 1, 969, 440, 169, 24],
  ['amfi-a3', 1, 'row-1-right', 77, 45.3, 1, 1203, 430, 170, 25],
  ['amfi-b1', 2, 'row-2-left', 48, 40.3, 2, 718, 383, 170, 25],
  ['amfi-b2', 2, 'row-2-mid', 63, 39.3, 2, 969, 374, 169, 25],
  ['amfi-b3', 2, 'row-2-right', 77, 38.3, 2, 1203, 365, 170, 24],
  ['amfi-c1', 3, 'row-3-left', 49, 33.3, 3, 735, 318, 169, 24],
  ['amfi-c2', 3, 'row-3-mid', 64, 32.3, 3, 986, 308, 169, 25],
  ['amfi-c3', 3, 'row-3-right', 78, 31.3, 3, 1220, 299, 169, 24],
])

const seats: readonly ImageRoomSeat[] = Object.freeze(seatSpecs.map(([
  id, row, approachNodeId, x, y, z, assetX, assetY, assetWidth, assetHeight,
]) => Object.freeze({
  id,
  label: `Amphitheatre row ${row}`,
  approachNodeId,
  sit: Object.freeze({ x, y, z }),
  facing: 's' as const,
  foregroundMask: Object.freeze([
    Object.freeze({ x: x - 5, y: y + 0.5 }),
    Object.freeze({ x: x + 5, y: y + 0.5 }),
    Object.freeze({ x: x + 5, y: y + 2.9 }),
    Object.freeze({ x: x - 5, y: y + 2.9 }),
  ]),
  occlusion: null,
  foregroundAsset: Object.freeze({
    url: `assets/rooms/occlusion/chim-alan/seat-${id}.png`,
    x: assetX,
    y: assetY,
    width: assetWidth,
    height: assetHeight,
  }),
})))

const occluderSpecs = [
  ['amphi-row-front-1', [[34, 48], [85, 44.5], [85, 48], [34, 52]], 52, 568, 418, 855, 73],
  ['amphi-row-front-2', [[34, 41], [85, 37.5], [85, 41], [34, 45]], 45, 568, 352, 855, 73],
  ['amphi-row-front-3', [[34, 34], [85, 30.5], [85, 34], [34, 38]], 38, 568, 287, 855, 72],
] as const

const occluders: readonly ImageRoomOccluder[] = Object.freeze(occluderSpecs.map(([
  id, points, depthY, x, y, width, height,
]) => Object.freeze({
  id,
  type: 'amphitheatre-front',
  points: Object.freeze(points.map(([pointX, pointY]) => Object.freeze({ x: pointX, y: pointY }))),
  depthY,
  asset: Object.freeze({
    url: `assets/rooms/occlusion/chim-alan/object-${id}.png`, x, y, width, height,
  }),
})))

export const GRASS_AMPHITHEATRE_ROOM: ImageRoomDefinition = Object.freeze({
  id: 'grass-amphitheatre',
  title: 'Çim Alan',
  spawnNodeId: 'entrance',
  nodes,
  edges,
  seats,
  occluders,
  actors: Object.freeze({
    spark: Object.freeze({ nodeId: 'spark', name: 'Spark', label: 'rtAI · AI Host' }),
    rock: Object.freeze({ nodeId: 'rock', name: 'Rock', label: 'Rock' }),
  }),
  image: Object.freeze({
    url: 'assets/rooms/chim-alan-wide.png',
    width: 1672,
    height: 941,
    sha256: '84afe78fbf7fb502bea4646d402b638f4ade4e29969ed41fc6a103c2c5018ebf',
  }),
})
