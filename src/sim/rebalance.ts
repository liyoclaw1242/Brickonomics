import { inRange, returnRate } from './guard'

/** 再平衡的舉例（≈ 示意）：目標股票 60%、債券 40%；之後股票漲 30%、債券不動 */
export const REBALANCE = { targetStockPct: 60, stockReturn: 0.3, bondReturn: 0 } as const

export type Holding = { stock: number; bond: number }
export type Mix = Holding & { total: number; /** 股票占全部的 %（0..100） */ stockPct: number }

const mixOf = (stock: number, bond: number): Mix => ({ stock, bond, total: stock + bond, stockPct: (stock / (stock + bond)) * 100 })

/**
 * 漂移：100 元照目標比例分好（股票 targetStockPct、債券其餘），各自漲跌之後的比例（塔長歪了）。
 * targetStockPct 須在 [0, 100]、兩個報酬率須 > −1，否則丟 RangeError。
 */
export function drift(p: { targetStockPct: number; stockReturn: number; bondReturn: number }): Mix {
  const s = inRange('targetStockPct', p.targetStockPct, 0, 100)
  returnRate('stockReturn', p.stockReturn)
  returnRate('bondReturn', p.bondReturn)
  return mixOf(s * (1 + p.stockReturn), (100 - s) * (1 + p.bondReturn))
}

/**
 * 再平衡（剪高補低）：總數不變，搬回目標比例。moved＝從股票搬到債券的錢（負的＝從債券搬到股票）。
 * 兩邊須 ≥ 0 且合計 > 0、targetStockPct 須在 [0, 100]，否則丟 RangeError。不含買賣成本。
 */
export function rebalance(h: Holding, targetStockPct: number): Mix & { moved: number } {
  inRange('stock', h.stock, 0)
  inRange('bond', h.bond, 0)
  inRange('targetStockPct', targetStockPct, 0, 100)
  const total = h.stock + h.bond
  if (total <= 0) throw new RangeError(`total must be > 0: ${total}`)
  const stock = (total * targetStockPct) / 100
  return { ...mixOf(stock, total - stock), moved: h.stock - stock }
}
