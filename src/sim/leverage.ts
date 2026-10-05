import { finite, inRange, nonNegInt, rate } from './guard'

/**
 * 槓桿／反向 ETF 耗損的舉例（≈ 示意，通用名稱，不是真實商品）：大盤 −10%、+10% 來回 5 次（先跌再漲：🌊 浪頭打到＝跌那一步，2 倍塔被打矮一截）；
 * 一般塔（大盤本身）、2 倍塔（2 倍槓桿 ETF）、反向塔（反向 ETF，−1 倍）。
 */
export const LEVERAGE = { start: 100, move: 0.1, rounds: 5, double: 2, inverse: -1 } as const

function checkPath(path: readonly number[]): void {
  if (path.length === 0) throw new RangeError('path must not be empty')
  path.forEach((p, i) => {
    finite(`path[${i}]`, p)
    if (p <= 0) throw new RangeError(`path[${i}] must be > 0: ${p}`)
  })
}

/**
 * 跌漲來回：從 start 開始先跌 move、再漲 move，重複 rounds 次（長度 2 × rounds + 1）。
 * start 須 > 0、move 須在 [0, 1)、rounds 為非負整數，否則丟 RangeError。
 */
export function choppyPath(start: number, move: number, rounds: number): number[] {
  finite('start', start)
  if (start <= 0) throw new RangeError(`start must be > 0: ${start}`)
  rate('move', move)
  nonNegInt('rounds', rounds)
  const out = [start]
  for (let i = 0; i < rounds; i++) {
    const last = out[out.length - 1]!
    out.push(last * (1 - move))
    out.push(last * (1 - move) * (1 + move))
  }
  return out
}

/**
 * 每日重設的槓桿：每一步塔都動「k × 那一步大盤漲跌的比例」（k = 2 為 2 倍、k = −1 為反向）。
 * 起點與大盤相同（path[0]）。一步把塔打到 0 以下時停在 0（之後都是 0）。不含費用（費用見 hedge.ts）。
 * path 至少一點、每點有限且 > 0；k 須在 [−3, 3]，否則丟 RangeError。
 */
export function leveragedPath(path: readonly number[], k: number): number[] {
  checkPath(path)
  inRange('k', k, -3, 3)
  const out = [path[0]!]
  for (let i = 1; i < path.length; i++) {
    const step = path[i]! / path[i - 1]! - 1
    out.push(Math.max(0, out[i - 1]! * (1 + k * step)))
  }
  return out
}

/** 舉例的三座塔（每一步的高度）：一般、2 倍、反向 */
export function leverageTowers(p: { start: number; move: number; rounds: number; double: number; inverse: number } = LEVERAGE): {
  plain: number[]
  double: number[]
  inverse: number[]
} {
  const plain = choppyPath(p.start, p.move, p.rounds)
  return { plain, double: leveragedPath(plain, p.double), inverse: leveragedPath(plain, p.inverse) }
}
