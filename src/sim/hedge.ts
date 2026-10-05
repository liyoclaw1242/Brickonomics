import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { inRange, nonNegInt, rate, returnRate } from './guard'
import { leveragedPath } from './leverage'

/** 一年約幾個交易日（年費依天數按比例扣） */
export const TRADING_DAYS = 250

/**
 * 反向 ETF 對沖的舉例（≈ 示意；反向 ETF 用通用名稱，不放真實代號）：
 * 100 元裡 hedgePct 放反向 ETF（−1 倍、每日重設），其餘放 0050（費率從資料讀）。
 * inverseFee：反向 ETF 一年的費用（1%，✎ 假設）。
 * ⚡ strike：某一天大盤跌 strikeDrop；平時：calmDays 天裡大盤平穩地漲 calmRise（另有完全不漲的一年，只看費用）。
 */
export const HEDGE = { base: '0050', hedgePct: 20, inverseFee: 0.01, strikeDrop: 0.1, calmDays: 250, calmRise: 0.1 } as const

export type HedgeParams = { hedgePct: number; baseFee: number; inverseFee: number }
/** plain：全部放 0050；hedged：一部分放反向 ETF；diff＝hedged − plain（正的＝對沖幫了忙，負的＝付出的代價） */
export type HedgeOutcome = { plain: number; hedged: number; diff: number }

/**
 * 沿著每天的大盤路徑 path 走完（買了就放著，不再調整比例），起點 100：
 * 0050 那邊＝(100 − hedgePct) × 大盤漲跌 × (1 − baseFee)^(天數 ÷ 250)；
 * 反向那邊＝hedgePct × 反向塔漲跌（leveragedPath(path, −1)）× (1 − inverseFee)^(天數 ÷ 250)。
 * hedgePct 須在 [0, 100]、兩個費率在 [0, 1)，path 規則同 leveragedPath，否則丟 RangeError。
 */
export function hedgeRun(path: readonly number[], p: HedgeParams): HedgeOutcome {
  inRange('hedgePct', p.hedgePct, 0, 100)
  rate('baseFee', p.baseFee)
  rate('inverseFee', p.inverseFee)
  const inverse = leveragedPath(path, -1)
  const days = path.length - 1
  const base = (path[days]! / path[0]!) * (1 - p.baseFee) ** (days / TRADING_DAYS)
  const inv = (inverse[days]! / path[0]!) * (1 - p.inverseFee) ** (days / TRADING_DAYS)
  const plain = 100 * base
  const hedged = (100 - p.hedgePct) * base + p.hedgePct * inv
  return { plain, hedged, diff: hedged - plain }
}

/** 平穩的路徑：days 天裡每天漲一樣的比例，總共漲 rise（第 i 天＝100 × (1 + rise)^(i ÷ days)；rise 0＝完全不動） */
export function calmPath(days: number, rise: number): number[] {
  nonNegInt('days', days)
  returnRate('rise', rise)
  return Array.from({ length: days + 1 }, (_, i) => (days === 0 ? 100 : 100 * (1 + rise) ** (i / days)))
}

export type HedgeExample = {
  baseFee: number
  baseFeeVerified: boolean
  /** ⚡ 打下的那一天：對沖讓損失變小 */
  strike: HedgeOutcome
  /** 平時（大盤一整年不動）：反向那邊每天扣費用 */
  flat: HedgeOutcome
  /** 平時（大盤一整年慢慢漲）：反向那邊一直賠，加上費用 */
  rising: HedgeOutcome
}

/** 兩邊都算：⚡ 打下時與平時（不動、上漲）。0050 的費率從資料讀；沒有資料時丟 Error */
export function hedgeExample(u: Universe, h: typeof HEDGE = HEDGE): HedgeExample {
  const a = u.get(h.base)
  const baseFee = a?.fees?.expenseRatio
  if (!a || baseFee === undefined) throw new Error(`no expenseRatio for asset ${h.base}`)
  const p: HedgeParams = { hedgePct: h.hedgePct, baseFee, inverseFee: h.inverseFee }
  return {
    baseFee,
    baseFeeVerified: isVerified(a, 'fees.expenseRatio'),
    strike: hedgeRun([100, 100 * (1 - h.strikeDrop)], p),
    flat: hedgeRun(calmPath(h.calmDays, 0), p),
    rising: hedgeRun(calmPath(h.calmDays, h.calmRise), p),
  }
}
