export type NearestSeatCandidate = Readonly<{
  seatId: string
  x: number
  y: number
  available: boolean
  reachable: boolean
}>

export function resolveNearestAvailableSeat(
  origin: Readonly<{ x: number; y: number }>,
  candidates: readonly NearestSeatCandidate[],
): NearestSeatCandidate | null {
  return candidates
    .filter((candidate) => candidate.available && candidate.reachable)
    .map((candidate) => ({
      candidate,
      distanceSquared: ((candidate.x - origin.x) ** 2) + ((candidate.y - origin.y) ** 2),
    }))
    .sort((left, right) => (
      left.distanceSquared - right.distanceSquared
      || left.candidate.seatId.localeCompare(right.candidate.seatId)
    ))[0]?.candidate ?? null
}
