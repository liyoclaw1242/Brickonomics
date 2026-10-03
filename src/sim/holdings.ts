import type { Universe } from '../data/universe'

/** 底層資產 id → 占商品的比例（0～1） */
export type Exposure = Map<string, number>

export function flatten(u: Universe, id: string): Exposure {
  const asset = u.get(id)
  if (!asset) throw new Error(`unknown asset ${id}`)
  const out: Exposure = new Map()
  if (!asset.holdings) {
    out.set(id, 1)
    return out
  }
  for (const h of asset.holdings) {
    for (const [leaf, f] of flatten(u, h.id)) {
      out.set(leaf, (out.get(leaf) ?? 0) + (f * h.weightPct) / 100)
    }
  }
  return out
}
