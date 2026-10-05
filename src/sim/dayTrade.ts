import { TW_TRADING } from '../data/trading'
import { finite, inRange, nonNegInt, rate } from './guard'

/**
 * 當沖一進一出（買進＋同一天賣出）的成本，占成交金額的比例。
 * buyFee、sellFee：券商手續費（公告上限，已查證，取自 data/trading）；
 * sellCost：現股當沖賣出時的交易成本（0.15%，舉例 ✎；出處與查證留給 Plan 8 Task 3，未查證前畫面顯示 ？）。
 * 三項直接相加（買、賣的成交金額都約等於本金）。
 */
export const DAY_TRADE_COST = {
  buyFee: TW_TRADING.brokerFee,
  sellFee: TW_TRADING.brokerFee,
  sellCost: 0.0015,
  verified: { buyFee: TW_TRADING.verified.brokerFee, sellFee: TW_TRADING.verified.brokerFee, sellCost: false },
} as const

export type DayTradeParams = {
  /** 進出幾次（一次＝買進再賣出） */
  trades: number
  /** 每次進出的成本（占本金的比例） */
  costPerTrade: number
  /** 賺的機率 0..1 */
  winRate: number
  /** 賺的時候平均賺幾 %、賠的時候平均賠幾 %（比例，都寫成正數） */
  avgWin: number
  avgLoss: number
}

/**
 * 舉例（≈）：一年約 250 個交易日，每天進出一次；勝率五五波、賺賠都是 1%（輸贏對稱：不算成本時是公平的遊戲）。
 * 這是「為什麼多數人賠」的示意，不是策略。
 */
export const DAY_TRADE: DayTradeParams = {
  trades: 250,
  costPerTrade: DAY_TRADE_COST.buyFee + DAY_TRADE_COST.sellFee + DAY_TRADE_COST.sellCost,
  winRate: 0.5,
  avgWin: 0.01,
  avgLoss: 0.01,
}

export type DayTradeResult = {
  /** 每次進出的期望報酬（比例）＝勝率 × 賺 − 敗率 × 賠 − 成本 */
  expectedPerTrade: number
  /** 期望的本金路徑（起點 start，長度 trades + 1） */
  path: number[]
  /** trades 次後的期望本金 */
  capitalAfter: number
  /** 一路付掉的成本（每次＝當時本金 × costPerTrade，加總） */
  costPaid: number
}

function check(p: DayTradeParams): void {
  nonNegInt('trades', p.trades)
  rate('costPerTrade', p.costPerTrade)
  inRange('winRate', p.winRate, 0, 1)
  inRange('avgWin', p.avgWin, 0)
  rate('avgLoss', p.avgLoss)
}

/**
 * 當沖的成本怎麼把本金磨掉：每次用全部本金進出一次，期望值每次乘 (1 + expectedPerTrade)。
 * 每次的輸贏互相獨立，所以 trades 次後的期望本金正好是 start × (1 + expectedPerTrade)^trades。
 * 參數不合法丟 RangeError（訊息以參數名稱開頭）。
 */
export function dayTradeDrain(p: DayTradeParams, start = 100): DayTradeResult {
  check(p)
  finite('start', start)
  const e = p.winRate * p.avgWin - (1 - p.winRate) * p.avgLoss - p.costPerTrade
  const path = [start]
  let costPaid = 0
  for (let i = 0; i < p.trades; i++) {
    const now = path[i]!
    costPaid += now * p.costPerTrade
    path.push(Math.max(0, now * (1 + e)))
  }
  return { expectedPerTrade: e, path, capitalAfter: path[p.trades]!, costPaid }
}

/** 要贏多少比例才打平：勝率 × 賺 − (1 − 勝率) × 賠 − 成本 ＝ 0 → (賠 + 成本) ÷ (賺 + 賠)。賺、賠都是 0 時丟 RangeError */
export function breakEvenWinRate(p: Pick<DayTradeParams, 'avgWin' | 'avgLoss' | 'costPerTrade'>): number {
  inRange('avgWin', p.avgWin, 0)
  rate('avgLoss', p.avgLoss)
  rate('costPerTrade', p.costPerTrade)
  if (p.avgWin + p.avgLoss === 0) throw new RangeError('avgWin + avgLoss must be > 0')
  return (p.avgLoss + p.costPerTrade) / (p.avgWin + p.avgLoss)
}
