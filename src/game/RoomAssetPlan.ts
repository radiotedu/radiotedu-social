import { AUDITORIUM_RADIOTEDU_SCREEN } from '../rooms/AuditoriumPresentation'
import { IMAGE_ROOMS, type ImageRoomId } from '../rooms/ImageRoomDefinition'

const CAMPUS_CAT_ASSETS = [
  'campus-cat-tarcin-walk.png',
  'campus-cat-benek-walk.png',
  'campus-cat-komur-walk.png',
] as const

export type CampusCatVariant = 0 | 1 | 2

const CAMPUS_CAT_ROSTERS: Readonly<Record<ImageRoomId, readonly CampusCatVariant[]>> = Object.freeze({
  library: [0],
  'chim-alan': [1, 2],
  'grass-amphitheatre': [0, 2],
  'sports-center': [1],
  auditorium: [0],
  'learning-lab': [2],
})

export type RoomTextureAsset = Readonly<
  | { kind: 'image'; key: string; url: string }
  | {
    kind: 'spritesheet'
    key: string
    url: string
    frameWidth: number
    frameHeight: number
    endFrame: number
  }
>

export function campusCatVariantForPet(pet: string | null | undefined): CampusCatVariant {
  return pet === 'pet-benek' ? 1 : pet === 'pet-komur' ? 2 : 0
}

export function campusCatVariantsForRoom(
  roomId: ImageRoomId,
  equippedPet: string | null | undefined,
): readonly CampusCatVariant[] {
  if (roomId === 'library' && equippedPet) return Object.freeze([campusCatVariantForPet(equippedPet)])
  return CAMPUS_CAT_ROSTERS[roomId]
}

export function campusCatTextureAsset(
  variant: CampusCatVariant,
  baseUrl = import.meta.env.BASE_URL,
): RoomTextureAsset {
  return Object.freeze({
    kind: 'spritesheet',
    key: `campus-cat:${variant}`,
    url: `${baseUrl}assets/npcs/${CAMPUS_CAT_ASSETS[variant]}`,
    frameWidth: 256,
    frameHeight: 192,
    endFrame: 31,
  })
}

export function roomTextureAssets(
  roomId: ImageRoomId,
  equippedPet: string | null | undefined,
  baseUrl = import.meta.env.BASE_URL,
): readonly RoomTextureAsset[] {
  const room = IMAGE_ROOMS[roomId]
  const assets: RoomTextureAsset[] = [{
    kind: 'image',
    key: `room:${room.id}`,
    url: `${baseUrl}${room.image.url}`,
  }]

  for (const occluder of room.occluders) {
    if (room.id === 'library' && occluder.id.endsWith('study-table')) continue
    assets.push({
      kind: 'image',
      key: `occluder:${room.id}:${occluder.id}`,
      url: `${baseUrl}${occluder.asset.url}`,
    })
  }
  for (const seat of room.seats) {
    if (!seat.foregroundAsset) continue
    assets.push({
      kind: 'image',
      key: `seat-foreground:${room.id}:${seat.id}`,
      url: `${baseUrl}${seat.foregroundAsset.url}`,
    })
  }
  if (room.id === 'auditorium') {
    assets.push({
      kind: 'image',
      key: 'auditorium:radiotedu-screen',
      url: `${baseUrl}${AUDITORIUM_RADIOTEDU_SCREEN.url}`,
    })
  }
  for (const variant of campusCatVariantsForRoom(roomId, equippedPet)) {
    assets.push(campusCatTextureAsset(variant, baseUrl))
  }

  return Object.freeze(assets.map((asset) => Object.freeze(asset)))
}

export function isRoomTextureKey(key: string): boolean {
  return key.startsWith('room:')
    || key.startsWith('occluder:')
    || key.startsWith('seat-foreground:')
    || key.startsWith('campus-cat:')
    || key === 'auditorium:radiotedu-screen'
}
