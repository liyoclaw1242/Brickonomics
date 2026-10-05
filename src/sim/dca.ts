import { finite } from './guard'

export type DcaResult = {
  /** 每個月買到的單位數（＝amount ÷ 那個月的價格） */
  units: number[]
  totalUnits: number
  /** 總共投入的錢（＝amount × 月數） */
  invested: number
  /** 平均成本＝總投入 ÷ 總單位（調和平均，永遠 ≤ 平均價格） */
  avgCost: number
  /** 各月價格的平均（算術平均） */
  avgPrice: number
}

/**
 * 定期定額：每個月用同樣的錢 amount 買，價格低的月份買到比較多單位。
 * prices 至少一個、每個須有限且 > 0；amount 須有限且 > 0，否則丟 RangeError。
 */
export function dca(prices: readonly number[], amount: number): DcaResult {
  if (prices.length === 0) throw new RangeError('prices must not be empty')
  prices.forEach((p, i) => {
    finite(`prices[${i}]`, p)
    if (p <= 0) throw new RangeError(`prices[${i}] must be > 0: ${p}`)
  })
  finite('amount', amount)
  if (amount <= 0) throw new RangeError(`amount must be > 0: ${amount}`)
  const units = prices.map((p) => amount / p)
  const totalUnits = units.reduce((a, b) => a + b, 0)
  const invested = amount * prices.length
  return { units, totalUnits, invested, avgCost: invested / totalUnits, avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length }
}
