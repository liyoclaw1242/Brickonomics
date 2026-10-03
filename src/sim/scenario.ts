import type { Universe } from '../data/universe'
import { flatten } from './holdings'

/** 底層資產 id → 漲跌幅（小數，-0.3 代表跌 30%） */
export type Shocks = Record<string, number>

/** 假設情境下商品的漲跌幅；只計直接曝險，不模擬連動效應。 */
export function shockImpact(u: Universe, productId: string, shocks: Shocks): number {
  let impact = 0
  for (const [id, fraction] of flatten(u, productId)) {
    impact += fraction * (shocks[id] ?? 0)
  }
  return impact
}
