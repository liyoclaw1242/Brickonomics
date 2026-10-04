import type { Universe } from '../data/universe'
import { shockImpact } from '../sim/scenario'
import { overlap } from '../sim/overlap'
import type { AssetType } from '../data/schema'
import type { TextContext } from './types'
import { sectorBreakdown } from '../scene/layout/underground'

/** 第 5 關的假設情境：台積電下跌 30% */
export const SHOCK_2330: Readonly<Record<string, number>> = { '2330': -0.3 }

/** 「借據」＝各種債券；「其他」彙總桶在快照裡都是股票（OTHER_TW_STOCK、OTHER_US_STOCK，有測試守著） */
const CLASS_OF: Partial<Record<AssetType, 'stock' | 'bond'>> = {
  stock: 'stock',
  other: 'stock',
  govBond: 'bond',
  corpBond: 'bond',
  highYieldBond: 'bond',
  convertible: 'bond',
  bondMixed: 'bond',
}

export function makeTextContext(u: Universe): TextContext {
  return {
    weightPct: (productId, holdingId) => {
      const w = u.get(productId)?.holdings?.find((h) => h.id === holdingId)?.weightPct
      if (w === undefined) throw new Error(`no holding ${holdingId} in ${productId}`)
      return w
    },
    shock: (productId) => shockImpact(u, productId, { ...SHOCK_2330 }),
    sectorPct: (productId, sector) => sectorBreakdown(u, productId).find((r) => r.sector === sector)?.weightPct ?? 0,
    expenseRatio: (productId) => u.get(productId)?.fees?.expenseRatio,
    overlapShared: (a, b) => overlap(u, a, b).total,
    assetClassPct: (productId, kind) =>
      (u.get(productId)?.holdings ?? []).reduce((sum, h) => {
        const t = u.get(h.id)?.type
        return t !== undefined && CLASS_OF[t] === kind ? sum + h.weightPct : sum
      }, 0),
    exitFee: (productId, years) => u.get(productId)?.fees?.cdsc?.[Math.floor(years)] ?? 0,
  }
}

export const pct0 = (w: number): string => w.toFixed(0)

/** 0.05 → '+5.0%'；-0.172 → '−17.2%'（U+2212）；0 → '0.0%' */
export function signedPct(x: number): string {
  const s = Math.abs(x * 100).toFixed(1)
  if (s === '0.0') return '0.0%'
  return `${x < 0 ? '−' : '+'}${s}%`
}
