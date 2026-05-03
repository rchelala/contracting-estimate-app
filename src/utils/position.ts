/** Returns next position value: max+10, or 10 if list empty. Gap-friendly. */
export function nextPosition(existing: number[]): number {
  if (existing.length === 0) return 10
  return Math.max(...existing) + 10
}

/** Given an array of ids in desired order, returns position assignments (10, 20, 30...). */
export function reorderPositions<T extends string>(orderedIds: T[]): Array<{ id: T; position: number }> {
  return orderedIds.map((id, idx) => ({ id, position: (idx + 1) * 10 }))
}
