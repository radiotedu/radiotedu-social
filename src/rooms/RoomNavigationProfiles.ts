import type { NavigationFieldGeometry, WorldPoint } from '../pathfinding/RoomNavigationField'
import type { ImageRoomDefinition, ImageRoomId } from './ImageRoomDefinition'
import chimAlanLayout from './data/chim-alan-courtyard-layout.json'
import grassAmphitheatreLayout from './data/chim-alan-amphitheatre-layout.json'

type PercentPoint = readonly [number, number]
type PercentPolygon = readonly PercentPoint[]
type PercentLayer = Readonly<{ z: number; walkable: readonly PercentPolygon[] }>
type PercentProfile = Readonly<{
  layers: readonly PercentLayer[]
  obstacles?: readonly PercentPolygon[]
  interactionObstacles?: readonly PercentPolygon[]
}>

type PixelPolygon = readonly (readonly [number, number])[]
type ChimAlanLayout = Readonly<{
  navigation: Readonly<{
    layers: readonly Readonly<{ z: number; walkable: readonly PixelPolygon[] }>[]
    obstacles: readonly PixelPolygon[]
    interactionObstacles: readonly PixelPolygon[]
  }>
}>

type GrassAmphitheatreLayout = Readonly<{
  rows: readonly Readonly<{ z: number; surface: PixelPolygon }>[]
  navigation: Readonly<{
    ground: PixelPolygon
    courtyard: PixelPolygon
    obstacles: readonly PixelPolygon[]
    interactionObstacles: readonly PixelPolygon[]
  }>
}>

const CHIM_ALAN_LAYOUT = chimAlanLayout as unknown as ChimAlanLayout
const GRASS_AMPHITHEATRE_LAYOUT = grassAmphitheatreLayout as unknown as GrassAmphitheatreLayout

const LIBRARY_TABLETOPS: readonly PercentPolygon[] = Object.freeze([
  [[50.36, 23.38], [53.53, 20.19], [68.48, 34.33], [65.31, 37.94]],
  [[39.53, 30.50], [42.88, 27.10], [58.49, 44.85], [55.14, 48.46]],
  [[28.59, 40.70], [31.64, 37.19], [47.37, 52.92], [44.02, 56.54]],
  [[14.71, 49.20], [18.06, 45.90], [33.55, 61.96], [30.20, 65.57]],
  [[57.00, 59.50], [60.00, 55.90], [76.00, 72.10], [72.70, 75.60]],
  [[44.32, 68.20], [47.55, 64.72], [62.98, 80.66], [59.63, 84.27]],
])

// The bookcase-like end cabinets are deeper than the tabletops. Keeping them
// separate preserves the chair aisles while preventing the avatar's body from
// visually crossing a desk end even when its ground anchor is just outside the
// tabletop polygon.
const LIBRARY_TABLE_END_CAPS: readonly PercentPolygon[] = Object.freeze([
  [[65.00, 34.00], [68.50, 32.70], [70.40, 36.60], [70.40, 42.50], [66.80, 44.40], [65.00, 40.60]],
  [[54.80, 45.80], [58.40, 44.70], [58.40, 50.80], [55.30, 52.60], [53.90, 48.60]],
  [[43.80, 53.80], [47.70, 52.50], [47.70, 59.20], [44.80, 60.80], [43.50, 56.80]],
  [[30.00, 62.20], [33.80, 60.80], [33.80, 68.70], [30.60, 70.10], [29.40, 66.20]],
  [[72.50, 72.00], [76.60, 70.80], [76.60, 78.40], [73.40, 80.00], [72.00, 76.20]],
  [[59.40, 80.20], [63.90, 78.90], [63.90, 87.50], [60.40, 89.50], [59.00, 85.40]],
])

const LIBRARY_TABLE_END_BODY_CLEARANCE: readonly PercentPolygon[] = Object.freeze([
  [[28.90, 66.00], [30.60, 70.10], [33.80, 68.70], [33.80, 71.80], [29.90, 74.10], [28.30, 68.20]],
])

const PROFILES: Readonly<Record<Exclude<ImageRoomId, 'chim-alan' | 'grass-amphitheatre'>, PercentProfile>> = Object.freeze({
  library: {
    layers: [{ z: 0, walkable: [[
      [1, 48], [8, 37], [34, 18], [68, 15], [98, 35], [99, 69],
      [87, 84], [62, 96], [27, 91], [3, 73],
    ]] }],
    // Exact visible tabletop footprints. The route field must treat the full
    // isometric surface as solid; using only the near edge made an otherwise
    // valid A* segment appear to walk over the desk in the flattened artwork.
    obstacles: [
      ...LIBRARY_TABLETOPS,
      ...LIBRARY_TABLE_END_CAPS,
      ...LIBRARY_TABLE_END_BODY_CLEARANCE,
      [[0, 27.630], [36.124, 18.704], [37.081, 36.132], [0, 56.961]],
      [[34.20, 26.90], [37.30, 26.90], [37.30, 41.40], [34.20, 41.40]],
      [[37.60, 24.60], [40.10, 24.60], [40.10, 36.10], [37.60, 36.10]],
      [[66.089, 18.916], [95.215, 36.769], [96.172, 61.849], [69.976, 53.454]],
    ],
    // Pointer targets use the visible tabletop surfaces, not just their
    // narrow ground-contact footprints. This keeps a desk click from being
    // interpreted as a reachable floor destination while leaving the chair
    // approach aisles available to A*.
    interactionObstacles: [...LIBRARY_TABLETOPS, ...LIBRARY_TABLE_END_CAPS, ...LIBRARY_TABLE_END_BODY_CLEARANCE],
  },
  'sports-center': {
    layers: [{ z: 0, walkable: [[
      // Keep the field on the tiled pool deck. The former outline followed
      // the artwork's outer roof silhouette, so clicks on the glazing and
      // rear wall were incorrectly accepted as floor destinations.
      [1, 66], [43, 20], [93, 37], [99, 57], [99, 75], [66, 98], [7, 81], [1, 72],
    ]] }],
    obstacles: [
      [[47, 28], [83, 39], [61, 78], [18, 62]],
      [[76, 66], [88, 69], [86, 75], [74, 72]],
      [[79, 57], [91, 60], [89, 66], [77, 63]],
      [[83, 48], [95, 51], [92, 57], [81, 54]],
      [[87, 40], [98, 43], [95, 49], [84, 46]],
    ],
  },
  auditorium: {
    layers: [
      { z: 0, walkable: [
        // Flat foreground floor, bounded by the visible wall cap rather than
        // the artwork canvas edge.
        [[3, 51], [20, 43], [32, 48], [44, 57], [55, 66], [74, 77], [67, 90], [50, 89], [31, 81], [16, 78], [2, 65]],
        // Left aisle between the stage and the first seating bank.
        [[45, 36], [51, 37], [67, 68], [61, 75], [55, 69], [43, 48], [42, 43]],
        // Blue-lit centre aisle through the raked seating.
        [[75, 32], [82, 34], [69, 76], [62, 73]],
        // Right stepped aisle and its connection back to the foreground.
        [[89, 32], [96, 34], [100, 42], [100, 52], [75, 81], [69, 77]],
      ] },
      { z: 1, walkable: [[[5, 44], [29, 34], [46, 39], [27, 51], [8, 49]]] },
    ],
  },
  'learning-lab': {
    layers: [{ z: 0, walkable: [[
      // The walkable silhouette begins at the wall/floor seam, not at the
      // ceiling outline. This prevents routes from climbing the left wall,
      // windows and lighting plane while preserving the desk aisles.
      [1, 62], [55, 25], [99, 48], [99, 76], [64, 98], [15, 98], [1, 81],
    ]] }],
    obstacles: [
      [[31, 36], [45, 32], [50, 41], [35, 50]],
      [[40, 43], [61, 32], [64, 43], [42, 56]],
      [[50, 55], [72, 41], [77, 56], [52, 71]],
      [[18, 57], [35, 48], [39, 61], [22, 72]],
      [[26, 70], [43, 59], [47, 72], [30, 84]],
      [[61, 64], [83, 48], [87, 64], [66, 78]],
      [[36, 83], [52, 70], [59, 85], [42, 92]],
    ],
  },
})

function toPixels(room: ImageRoomDefinition, polygon: PercentPolygon): readonly WorldPoint[] {
  return polygon.map(([x, y]) => ({
    x: (x / 100) * room.image.width,
    y: (y / 100) * room.image.height,
  }))
}

export function roomNavigationGeometry(room: ImageRoomDefinition): NavigationFieldGeometry {
  if (room.id === 'chim-alan') {
    return Object.freeze({
      layers: Object.freeze(CHIM_ALAN_LAYOUT.navigation.layers.map((layer) => Object.freeze({
        z: layer.z,
        walkable: Object.freeze(layer.walkable.map((polygon) => Object.freeze(
          polygon.map(([x, y]) => Object.freeze({ x, y })),
        ))),
      }))),
      obstacles: Object.freeze(CHIM_ALAN_LAYOUT.navigation.obstacles.map((polygon) => Object.freeze(
        polygon.map(([x, y]) => Object.freeze({ x, y })),
      ))),
    })
  }
  if (room.id === 'grass-amphitheatre') {
    const rowLayers = GRASS_AMPHITHEATRE_LAYOUT.rows.map((row) => ({
      z: row.z,
      walkable: [row.surface.map(([x, y]) => ({ x, y }))],
    }))
    const elevated = rowLayers.map((layer) => layer.z === 3
      ? {
          ...layer,
          walkable: [
            ...layer.walkable,
            GRASS_AMPHITHEATRE_LAYOUT.navigation.courtyard.map(([x, y]) => ({ x, y })),
          ],
        }
      : layer)
    return Object.freeze({
      layers: Object.freeze([
        Object.freeze({
          z: 0,
          walkable: Object.freeze([
            GRASS_AMPHITHEATRE_LAYOUT.navigation.ground.map(([x, y]) => Object.freeze({ x, y })),
          ]),
        }),
        ...elevated.map((layer) => Object.freeze({
          z: layer.z,
          walkable: Object.freeze(layer.walkable.map((polygon) => Object.freeze(polygon))),
        })),
      ]),
      obstacles: Object.freeze(GRASS_AMPHITHEATRE_LAYOUT.navigation.obstacles.map((polygon) => Object.freeze(
        polygon.map(([x, y]) => Object.freeze({ x, y })),
      ))),
    })
  }
  const profile = PROFILES[room.id]
  const navigationOccluders = room.id === 'library'
    ? []
    : room.occluders
  return Object.freeze({
    layers: profile.layers.map((layer) => Object.freeze({
      z: layer.z,
      walkable: layer.walkable.map((polygon) => toPixels(room, polygon)),
    })),
    obstacles: [
      ...(profile.obstacles ?? []).map((polygon) => toPixels(room, polygon)),
      ...navigationOccluders.map((occluder) => toPixels(room, occluder.points.map((point) => [point.x, point.y] as const))),
    ],
  })
}

export function roomInteractionObstacles(room: ImageRoomDefinition): readonly (readonly WorldPoint[])[] {
  if (room.id === 'chim-alan') {
    return CHIM_ALAN_LAYOUT.navigation.interactionObstacles.map((polygon) => (
      polygon.map(([x, y]) => ({ x, y }))
    ))
  }
  if (room.id === 'grass-amphitheatre') {
    return GRASS_AMPHITHEATRE_LAYOUT.navigation.interactionObstacles.map((polygon) => (
      polygon.map(([x, y]) => ({ x, y }))
    ))
  }
  const profile = PROFILES[room.id]
  return (profile.interactionObstacles ?? profile.obstacles ?? []).map((polygon) => toPixels(room, polygon))
}
