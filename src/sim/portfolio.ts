import { inRange, returnRate } from './guard'

/** 一場風暴裡股票、債券各漲跌多少（比例；−0.4＝跌 40%） */
export type StormScenario = { stock: number; bond: number }

/** 舉例的風暴（≈ 示意，不是預測）：股票跌 40%、債券漲 5% */
export const STORM: StormScenario = { stock: -0.4, bond: 0.05 }

export type StressResult = {
  /** 風暴後股票那一截、債券那一截（起點合計 100） */
  stock: number
  bond: number
  /** 風暴後整座組合塔剩多少（起點 100） */
  remaining: number
  /** 少掉幾 %（＝100 − remaining；負的＝反而變多） */
  lossPct: number
}

/**
 * 組合塔的壓力測試：100 元裡 stockPct 放股票、其餘放債券，風暴裡各自漲跌 scenario 的比例後剩多少。
 * stockPct 須在 [0, 100]；scenario 的兩個比例須 > −1，否則丟 RangeError。
 */
export function stressTest(p: { stockPct: number; scenario: StormScenario }): StressResult {
  const s = inRange('stockPct', p.stockPct, 0, 100)
  returnRate('stock', p.scenario.stock)
  returnRate('bond', p.scenario.bond)
  const stock = s * (1 + p.scenario.stock)
  const bond = (100 - s) * (1 + p.scenario.bond)
  const remaining = stock + bond
  return { stock, bond, remaining, lossPct: 100 - remaining }
}
