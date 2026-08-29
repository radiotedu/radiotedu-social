import type { ImageRoomId } from './ImageRoomDefinition'

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

/**
 * Matches the avatar to the perspective and furniture scale authored into each
 * room image. Indoor and outdoor artwork intentionally use different scales.
 */
export function roomAvatarScale(
  roomId: ImageRoomId,
  yPercent: number,
  seated: boolean,
  seatId: string | null = null,
): number {
  const y = clamp(yPercent, 0, 100)
  if (roomId === 'chim-alan' || roomId === 'grass-amphitheatre') {
    const depthScale = 0.68 + clamp((y - 18) / 78, 0, 1) * 0.34
    return seated ? depthScale * 0.96 : depthScale
  }
  if (roomId === 'sports-center') {
    const depthScale = 0.72 + clamp((y - 18) / 76, 0, 1) * 0.36
    return seated ? depthScale * 0.96 : depthScale
  }
  if (roomId === 'auditorium') {
    return 0.74 + clamp((y - 30) / 60, 0, 1) * 0.28
  }
  if (roomId === 'learning-lab') {
    const depthScale = 0.78 + clamp((y - 27) / 66, 0, 1) * 0.4
    return seated ? depthScale * 0.94 : depthScale
  }
  return seated ? 1 : 1.08
}
