import type { Asset } from '../data/schema'

export type FeeProfile = {
  /** 入口門：買進時扣除的比例 */
  entry: number
  /** 持有中：每年各項內扣費率（經理費、分銷費⋯） */
  annual: number[]
  /** 出口門：第 1 年、第 2 年⋯賣出時扣除的比例 */
  exitByYear: number[]
  /** 出口門：超出 exitByYear 之後的賣出成本 */
  exitDefault: number
}

export type TradingCost = { buy: number; sell: number }

const combine = (x: number, y: number) => 1 - (1 - x) * (1 - y)

export function profileFromFees(fees: Asset['fees'], trading: TradingCost = { buy: 0, sell: 0 }): FeeProfile {
  const annual = [fees?.expenseRatio, fees?.distributionFee].filter((r): r is number => r !== undefined && r > 0)
  return {
    entry: combine(fees?.frontLoad ?? 0, trading.buy),
    annual,
    exitByYear: (fees?.cdsc ?? []).map((c) => combine(c, trading.sell)),
    exitDefault: trading.sell,
  }
}

/**
 * Calculates the value of an investment after applying all fees and growth.
 * Selling at the end of year `years` uses `exitByYear[years - 1]`.
 * Selling within the first year (years = 0) uses the year-1 rate `exitByYear[0]`.
 * Beyond the schedule uses `exitDefault`.
 */
export function valueAfter(p: FeeProfile, years: number, opts: { amount?: number; grossReturn?: number } = {}): number {
  const amount = opts.amount ?? 100
  const growth = 1 + (opts.grossReturn ?? 0)
  const keepPerYear = p.annual.reduce((k, r) => k * (1 - r), 1)
  const exit = years >= 1 ? (p.exitByYear[years - 1] ?? p.exitDefault) : (p.exitByYear[0] ?? p.exitDefault)
  return amount * (1 - p.entry) * Math.pow(growth * keepPerYear, years) * (1 - exit)
}

/** a 的剩餘價值第一次超過 b 的年份（1..maxYears）；都沒有超過時回傳 null */
export function firstYearAhead(
  a: FeeProfile,
  b: FeeProfile,
  maxYears = 30,
  opts: { amount?: number; grossReturn?: number } = {},
): number | null {
  for (let y = 1; y <= maxYears; y++) {
    if (valueAfter(a, y, opts) > valueAfter(b, y, opts)) return y
  }
  return null
}
