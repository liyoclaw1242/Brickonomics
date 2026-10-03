import type { Universe } from '../../data/universe'
import { flatten } from '../../sim/holdings'

export const SECTORS = ['semiconductor', 'electronics', 'software', 'internet', 'auto', 'finance'] as const
export type Sector = (typeof SECTORS)[number] | 'unclassified'

export const LAYER_THICKNESS = 2.5
export const GROUND_TOP = -0.6
const VEIN_GAP = 0.4
const VEIN_THICKNESS = 1

const isSector = (s: string | undefined): s is (typeof SECTORS)[number] => (SECTORS as readonly string[]).includes(s ?? '')

export function strataLayout(): { sector: Sector; top: number; bottom: number }[] {
  return SECTORS.map((sector, i) => ({
    sector,
    top: GROUND_TOP - i * LAYER_THICKNESS,
    bottom: GROUND_TOP - (i + 1) * LAYER_THICKNESS,
  }))
}

export function goldVein(): { top: number; bottom: number } {
  const top = GROUND_TOP - SECTORS.length * LAYER_THICKNESS - VEIN_GAP
  return { top, bottom: top - VEIN_THICKNESS }
}

/** 商品攤平後依產業加總；彙總桶、債券、現金、未知產業 → 未細分 */
export function sectorBreakdown(u: Universe, productId: string): { sector: Sector; weightPct: number }[] {
  const sums = new Map<Sector, number>()
  for (const [id, f] of flatten(u, productId)) {
    const a = u.get(id)
    const sector: Sector = a?.type === 'stock' && isSector(a.sector) ? a.sector : 'unclassified'
    sums.set(sector, (sums.get(sector) ?? 0) + f * 100)
  }
  const order: Sector[] = [...SECTORS, 'unclassified']
  return order.filter((s) => (sums.get(s) ?? 0) > 0).map((s) => ({ sector: s, weightPct: sums.get(s)! }))
}

/** 岩芯分段：依權重比例由上往下切，總長 height（相對座標，往下為負） */
export function coreSegments(rows: { sector: Sector; weightPct: number }[], height: number): { sector: Sector; top: number; bottom: number }[] {
  const total = rows.reduce((s, r) => s + r.weightPct, 0)
  let y = 0
  return rows.map((r) => {
    const len = total > 0 ? (r.weightPct / total) * height : 0
    const seg = { sector: r.sector, top: y, bottom: y - len }
    y -= len
    return seg
  })
}
