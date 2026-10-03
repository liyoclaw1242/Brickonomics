import type { Universe } from '../data/universe'
import { flatten } from './holdings'

export type OverlapRow = { id: string; a: number; b: number; shared: number }

export function overlap(u: Universe, aId: string, bId: string): { rows: OverlapRow[]; total: number } {
  const ea = flatten(u, aId)
  const eb = flatten(u, bId)
  const rows: OverlapRow[] = []
  for (const [id, a] of ea) {
    const b = eb.get(id)
    if (b === undefined) continue
    // 彙總桶（aggregate）不代表特定公司，算進重疊會誤導
    if (u.get(id)?.aggregate) continue
    rows.push({ id, a, b, shared: Math.min(a, b) })
  }
  rows.sort((x, y) => y.shared - x.shared)
  return { rows, total: rows.reduce((s, r) => s + r.shared, 0) }
}
