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

export const CORE_R_MIN = 0.25
export const CORE_R_MAX = 2.2
export const STUB_MAX_HEIGHT = 4

type Row = { sector: Sector; weightPct: number }

/**
 * 岩芯：每一層一個圓盤，半徑 = R_MIN + (R_MAX − R_MIN) × √(權重/100)。
 * 取平方根讓「面積」大致與比例成正比；該產業 0% 時留一根細桿（R_MIN），表示岩芯仍然穿過這一層。
 */
export function coreDiscs(rows: Row[]): { sector: Sector; top: number; bottom: number; radius: number }[] {
  return strataLayout().map((l) => {
    const w = Math.min(100, Math.max(0, rows.find((r) => r.sector === l.sector)?.weightPct ?? 0))
    return { ...l, radius: CORE_R_MIN + (CORE_R_MAX - CORE_R_MIN) * Math.sqrt(w / 100) }
  })
}

/** 「未細分」不屬於任何一層，畫在地面上方：高度與比例成正比，100% 時為 STUB_MAX_HEIGHT */
export function unclassifiedStub(rows: Row[]): { weightPct: number; height: number } {
  const w = Math.min(100, Math.max(0, rows.find((r) => r.sector === 'unclassified')?.weightPct ?? 0))
  return { weightPct: w, height: (w / 100) * STUB_MAX_HEIGHT }
}
