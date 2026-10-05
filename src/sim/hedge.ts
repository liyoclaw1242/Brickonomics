import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { inRange, nonNegInt, rate, returnRate } from './guard'
import { leveragedPath } from './leverage'

/** 一年約幾個交易日（年費依天數按比例扣） */
export const TRADING_DAYS = 250

/**
 * 反向 ETF 對沖的舉例（≈ 示意；反向 ETF 用通用名稱，不放真實代號）：
 * 100 元裡 hedgePct 放反向 ETF（−1 倍、每日重設），其餘放 0050（費率從資料讀）。
 * inverseFee：反向 ETF 一年的費用（1%，✎ 假設；hedgeExample 回傳 inverseFeeAssumed: true）。
 * 對照組（現金）：少買 0050、多留現金也能讓 ⚡ 的損失一樣小，平時還不用付反向 ETF 的代價——反向 ETF 不是特別的工具。
 * ⚡ strike：某一天大盤跌 strikeDrop；平時：calmDays 天裡大盤平穩地漲 calmRise（另有完全不漲的一年，只看費用）。
 */
export const HEDGE = { base: '0050', hedgePct: 20, inverseFee: 0.01, strikeDrop: 0.1, calmDays: 250, calmRise: 0.1 } as const

export type HedgeParams = { hedgePct: number; baseFee: number; inverseFee: number }
/**
 * plain：全部放 0050；hedged：一部分放反向 ETF；diff＝hedged − plain（正的＝對沖幫了忙，負的＝付出的代價）。
 * cash：對照組「少買一點 0050、其餘放現金」——0050 放 100 − 2 × hedgePct、現金 2 × hedgePct（現金不計利息，保守），
 * 大盤怎麼動，它和 hedged 動得一樣多（淨部位相同），所以 ⚡ 打下時損失一樣小；hedgePct > 50 時無法用現金做到，為 null。
 */
export type HedgeOutcome = { plain: number; hedged: number; diff: number; cash: number | null }

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
  const cash = p.hedgePct <= 50 ? (100 - 2 * p.hedgePct) * base + 2 * p.hedgePct : null
  return { plain, hedged, diff: hedged - plain, cash }
}

/** 平穩的路徑：days 天裡每天漲一樣的比例，總共漲 rise（第 i 天＝100 × (1 + rise)^(i ÷ days)；rise 0＝完全不動） */
export function calmPath(days: number, rise: number): number[] {
  nonNegInt('days', days)
  returnRate('rise', rise)
  return Array.from({ length: days + 1 }, (_, i) => (days === 0 ? 100 : 100 * (1 + rise) ** (i / days)))
}

/** 一列＝一種做法在三種情境的結果（給畫面列表）：0050 全押、0050＋反向 ETF、少買 0050＋現金 */
export type HedgeRow = {
  id: 'plain' | 'inverse' | 'cash'
  /** 100 元怎麼分：0050、反向 ETF、現金 */
  basePct: number
  inversePct: number
  cashPct: number
  strike: number
  flat: number
  rising: number
}

export type HedgeExample = {
  baseFee: number
  baseFeeVerified: boolean
  /** 反向 ETF 的費用是假設（✎），沒有資料來源 */
  inverseFeeAssumed: true
  rows: HedgeRow[]
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
  const strike = hedgeRun([100, 100 * (1 - h.strikeDrop)], p)
  const flat = hedgeRun(calmPath(h.calmDays, 0), p)
  const rising = hedgeRun(calmPath(h.calmDays, h.calmRise), p)
  const rows: HedgeRow[] = [
    { id: 'plain', basePct: 100, inversePct: 0, cashPct: 0, strike: strike.plain, flat: flat.plain, rising: rising.plain },
    { id: 'inverse', basePct: 100 - h.hedgePct, inversePct: h.hedgePct, cashPct: 0, strike: strike.hedged, flat: flat.hedged, rising: rising.hedged },
  ]
  if (strike.cash !== null && flat.cash !== null && rising.cash !== null) {
    rows.push({ id: 'cash', basePct: 100 - 2 * h.hedgePct, inversePct: 0, cashPct: 2 * h.hedgePct, strike: strike.cash, flat: flat.cash, rising: rising.cash })
  }
  return { baseFee, baseFeeVerified: isVerified(a, 'fees.expenseRatio'), inverseFeeAssumed: true, rows, strike, flat, rising }
}
