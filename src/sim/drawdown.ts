import { finite } from './guard'

export type Drawdown = {
  /** 跌之前的高點（第幾個） */
  peakIndex: number
  /** 跌到最低的那一點（第幾個） */
  troughIndex: number
  /** 從高點最多少掉的比例 0..1（＝(高點 − 低點) ÷ 高點） */
  pct: number
}

/**
 * 最大跌幅：沿著價格路徑，從「到目前為止的最高點」往下最多跌了多少。
 * path 至少一個點，每個價格須有限且 > 0，否則丟 RangeError。從沒跌過時 pct 0（peak＝trough＝0）。
 */
export function maxDrawdown(path: readonly number[]): Drawdown {
  if (path.length === 0) throw new RangeError('path must not be empty')
  path.forEach((p, i) => {
    finite(`path[${i}]`, p)
    if (p <= 0) throw new RangeError(`path[${i}] must be > 0: ${p}`)
  })
  let peak = 0
  let best: Drawdown = { peakIndex: 0, troughIndex: 0, pct: 0 }
  for (let i = 1; i < path.length; i++) {
    if (path[i]! > path[peak]!) peak = i
    const pct = (path[peak]! - path[i]!) / path[peak]!
    if (pct > best.pct) best = { peakIndex: peak, troughIndex: i, pct }
  }
  return best
}
