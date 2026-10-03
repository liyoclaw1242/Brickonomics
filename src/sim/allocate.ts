import { inRange, nonNegInt } from './guard'

export type WeightInput = { id: string; weight: number }
export type BlockCount = { id: string; count: number }

/** 依權重分配整數方塊數，總和恆等於 total（最大餘數法；餘數相同時，排在前面的優先）。
 * weights 須有限且 ≥ 0（不可全為 0），total 為非負整數，否則丟 RangeError。 */
export function allocateBlocks(weights: WeightInput[], total: number): BlockCount[] {
  nonNegInt('total', total)
  if (weights.length === 0) throw new RangeError('weights must not be empty')
  for (const w of weights) inRange(`weights[${w.id}]`, w.weight, 0)
  const sum = weights.reduce((s, w) => s + w.weight, 0)
  if (sum <= 0) throw new RangeError('weights must not all be zero')

  const raw = weights.map((w) => (w.weight / sum) * total)
  const counts = raw.map(Math.floor)
  let left = total - counts.reduce((s, c) => s + c, 0)
  const order = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    counts[i] += 1
    left -= 1
  }
  return weights.map((w, i) => ({ id: w.id, count: counts[i] }))
}
