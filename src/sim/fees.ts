import type { Asset } from '../data/schema'
import { inRange, nonNegInt, rate, returnRate } from './guard'

export type AnnualFee = {
  rate: number
  /** 這項費用只收幾年；未填 = 持有期間都收 */
  years?: number
}

export type FeeProfile = {
  /** 入口門：買進時扣除的比例 */
  entry: number
  /** 持有中：每年各項內扣費（經理費、分銷費⋯） */
  annual: AnnualFee[]
  /** 出口門：第 1 年、第 2 年⋯賣出時扣除的比例 */
  exitByYear: number[]
  /** 出口門：超出 exitByYear 之後的賣出成本 */
  exitDefault: number
}

export type TradingCost = { buy: number; sell: number }

const combine = (x: number, y: number) => 1 - (1 - x) * (1 - y)

export function profileFromFees(fees: Asset['fees'], trading: TradingCost = { buy: 0, sell: 0 }): FeeProfile {
  rate('buy', trading.buy)
  rate('sell', trading.sell)
  const annual: AnnualFee[] = []
  if (fees?.expenseRatio) annual.push({ rate: fees.expenseRatio })
  if (fees?.distributionFee) {
    annual.push(
      fees.distributionFeeYears === undefined
        ? { rate: fees.distributionFee }
        : { rate: fees.distributionFee, years: fees.distributionFeeYears },
    )
  }
  return {
    entry: combine(fees?.frontLoad ?? 0, trading.buy),
    annual,
    exitByYear: (fees?.cdsc ?? []).map((c) => combine(c, trading.sell)),
    exitDefault: trading.sell,
  }
}

/**
 * 持有 `years` 年（有限、≥ 0，可為小數）後賣出的剩餘價值。
 *
 * - 入口門：買進時扣 entry。
 * - 年費：每項費用貢獻 (1 - rate)^min(years, fee.years ?? years)；成長貢獻 (1 + g)^years。
 * - 出口門：exit = exitByYear[Math.floor(years)] ?? exitDefault。
 *   未滿 1 年 → exitByYear[0]；滿 1 年未滿 2 年 → exitByYear[1]；⋯；超出表 → exitDefault。
 *
 * 教學簡化：遞延手續費（CDSC）以「贖回價值」計算；實務上常以「成本與贖回價值較低者」計算。
 * 參數不合法（years 非有限或 < 0、grossReturn ≤ -1、費率不在 [0, 1) 等）丟 RangeError。
 */
export function valueAfter(p: FeeProfile, years: number, opts: { amount?: number; grossReturn?: number } = {}): number {
  inRange('years', years, 0)
  const amount = inRange('amount', opts.amount ?? 100, 0)
  const g = returnRate('grossReturn', opts.grossReturn ?? 0)
  rate('entry', p.entry)
  p.annual.forEach((f, i) => {
    rate(`annual[${i}].rate`, f.rate)
    if (f.years !== undefined) inRange(`annual[${i}].years`, f.years, 0)
  })
  p.exitByYear.forEach((r, i) => rate(`exitByYear[${i}]`, r))
  rate('exitDefault', p.exitDefault)

  const keep = p.annual.reduce((k, f) => k * Math.pow(1 - f.rate, Math.min(years, f.years ?? years)), 1)
  const exit = p.exitByYear[Math.floor(years)] ?? p.exitDefault
  return amount * (1 - p.entry) * Math.pow(1 + g, years) * keep * (1 - exit)
}

/** a 的剩餘價值第一次超過 b 的年份（1..maxYears）；都沒有超過時回傳 null。maxYears 須為 ≥ 1 的整數。 */
export function firstYearAhead(
  a: FeeProfile,
  b: FeeProfile,
  maxYears = 30,
  opts: { amount?: number; grossReturn?: number } = {},
): number | null {
  if (nonNegInt('maxYears', maxYears) < 1) throw new RangeError(`maxYears must be >= 1: ${maxYears}`)
  for (let y = 1; y <= maxYears; y++) {
    if (valueAfter(a, y, opts) > valueAfter(b, y, opts)) return y
  }
  return null
}
