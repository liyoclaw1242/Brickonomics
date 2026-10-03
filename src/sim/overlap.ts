import type { Universe } from '../data/universe'
import type { AssetType } from '../data/schema'
import { flatten } from './holdings'

export type OverlapRow = { id: string; a: number; b: number; shared: number }

/** 彙總桶不代表特定公司，算進重疊會誤導 */
const NOT_COMPARABLE: readonly AssetType[] = ['other', 'cash', 'bondMixed']

export function overlap(u: Universe, aId: string, bId: string): { rows: OverlapRow[]; total: number } {
  const ea = flatten(u, aId)
  const eb = flatten(u, bId)
  const rows: OverlapRow[] = []
  for (const [id, a] of ea) {
    const b = eb.get(id)
    if (b === undefined) continue
    const type = u.get(id)?.type
    if (type && NOT_COMPARABLE.includes(type)) continue
    rows.push({ id, a, b, shared: Math.min(a, b) })
  }
  rows.sort((x, y) => y.shared - x.shared)
  return { rows, total: rows.reduce((s, r) => s + r.shared, 0) }
}
