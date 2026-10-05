import { finite, inRange, returnRate } from './guard'

/**
 * 相關性的舉例報酬路徑（≈ 示意，每一期的報酬率）：平均都是 +2%。
 * a：+12%／−8% 輪流；opposite：和 a「一上一下」（a 漲它跌）；same：和 a 一起漲跌。
 */
export const PAIRS = {
  a: [0.12, -0.08, 0.12, -0.08],
  opposite: [-0.04, 0.08, -0.04, 0.08],
  same: [0.08, -0.04, 0.08, -0.04],
} as const satisfies Record<string, readonly number[]>

function checkReturns(returns: readonly number[], name = 'returns'): void {
  if (returns.length === 0) throw new RangeError(`${name} must not be empty`)
  returns.forEach((r, i) => finite(`${name}[${i}]`, r))
}

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

/**
 * 波動（上下晃多大）：各期報酬率的標準差（母體，除以期數）。
 * returns 至少一期、每期須有限，否則丟 RangeError。
 */
export function volatility(returns: readonly number[]): number {
  checkReturns(returns)
  const m = mean(returns)
  return Math.sqrt(mean(returns.map((r) => (r - m) ** 2)))
}

/**
 * 組合：每一期 w 放在 a、1 − w 放在 b（每期重新分配回這個比例），組合的報酬率＝w × a + (1 − w) × b。
 * a、b 期數須相同；w 須在 [0, 1]，否則丟 RangeError。
 */
export function combine(a: readonly number[], b: readonly number[], w: number): number[] {
  checkReturns(a, 'a')
  checkReturns(b, 'b')
  if (a.length !== b.length) throw new RangeError(`a and b must have the same length: ${a.length} vs ${b.length}`)
  inRange('w', w, 0, 1)
  return a.map((x, i) => w * x + (1 - w) * b[i]!)
}

/**
 * 相關係數（−1..1）：一起漲跌接近 +1，一上一下接近 −1。
 * 期數須相同；任一條完全不動（波動 0）時沒有定義，丟 RangeError。
 */
export function correlation(a: readonly number[], b: readonly number[]): number {
  checkReturns(a, 'a')
  checkReturns(b, 'b')
  if (a.length !== b.length) throw new RangeError(`a and b must have the same length: ${a.length} vs ${b.length}`)
  const sa = volatility(a)
  const sb = volatility(b)
  if (sa === 0 || sb === 0) throw new RangeError('correlation is undefined for a flat path (volatility 0)')
  const ma = mean(a)
  const mb = mean(b)
  return mean(a.map((x, i) => (x - ma) * (b[i]! - mb))) / (sa * sb)
}

/**
 * 塔的高度路徑：從 start 開始，每期乘 (1 + 報酬率)；長度＝期數 + 1。
 * 每期報酬率須 > −1，start 須有限且 > 0，否則丟 RangeError。
 */
export function pathOf(returns: readonly number[], start = 100): number[] {
  returns.forEach((r, i) => returnRate(`returns[${i}]`, r))
  finite('start', start)
  if (start <= 0) throw new RangeError(`start must be > 0: ${start}`)
  const out = [start]
  for (const r of returns) out.push(out[out.length - 1]! * (1 + r))
  return out
}
