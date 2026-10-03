import type { Universe } from '../data/universe'
import { shockImpact } from '../sim/scenario'
import type { TextContext } from './types'

/** 第 5 關的假設情境：台積電下跌 30% */
export const SHOCK_2330: Readonly<Record<string, number>> = { '2330': -0.3 }

export function makeTextContext(u: Universe): TextContext {
  return {
    weightPct: (productId, holdingId) => {
      const w = u.get(productId)?.holdings?.find((h) => h.id === holdingId)?.weightPct
      if (w === undefined) throw new Error(`no holding ${holdingId} in ${productId}`)
      return w
    },
    shock: (productId) => shockImpact(u, productId, { ...SHOCK_2330 }),
  }
}

export const pct0 = (w: number): string => w.toFixed(0)

/** 0.05 → '+5.0%'；-0.172 → '−17.2%'（U+2212）；0 → '0.0%' */
export function signedPct(x: number): string {
  const s = Math.abs(x * 100).toFixed(1)
  if (s === '0.0') return '0.0%'
  return `${x < 0 ? '−' : '+'}${s}%`
}
