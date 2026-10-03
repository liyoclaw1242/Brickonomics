import type { Vec3 } from '../camera'

export const COIN_RADIUS = 0.35
export const COIN_HEIGHT = 0.12

export type CoinParams = { from: Vec3; to: Vec3; rate: number; fallTime: number; arc: number }

/** 時間 t 秒時，飛行中的金幣位置（最新的在前）；自 t = 0 起每 1/rate 秒產生一枚 */
export function coinPositions(t: number, p: CoinParams, max = 64): Vec3[] {
  if (!(p.rate > 0) || !(p.fallTime > 0)) throw new RangeError(`rate and fallTime must be > 0: ${p.rate}, ${p.fallTime}`)
  const out: Vec3[] = []
  for (let i = Math.floor(t * p.rate); i >= 0 && out.length < max; i--) {
    const age = t - i / p.rate
    if (age >= p.fallTime) break
    const s = age / p.fallTime
    out.push([
      p.from[0] + (p.to[0] - p.from[0]) * s,
      p.from[1] + (p.to[1] - p.from[1]) * s + p.arc * 4 * s * (1 - s),
      p.from[2] + (p.to[2] - p.from[2]) * s,
    ])
  }
  return out
}

/** 金幣堆：每柱 perColumn 枚往上疊，柱子沿 x 排開（相對座標，底部貼齊 y = 0） */
export function coinPileLayout(n: number, perColumn = 10, spacing = 0.8): Vec3[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a non-negative integer: ${n}`)
  return Array.from({ length: n }, (_, i) => [Math.floor(i / perColumn) * spacing, COIN_HEIGHT / 2 + (i % perColumn) * COIN_HEIGHT, 0] as Vec3)
}
