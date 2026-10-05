import { describe, expect, it } from 'vitest'
import { TW_TRADING } from '../data/trading'
import { DAY_TRADE, DAY_TRADE_COST, breakEvenWinRate, dayTradeDrain } from './dayTrade'

describe('day-trade example (why most lose: costs at a 50% win rate)', () => {
  it('cost per round trip = buy fee + sell fee + sell-side cost = 0.001425 + 0.001425 + 0.0015 = 0.00435', () => {
    expect(DAY_TRADE_COST.buyFee).toBe(TW_TRADING.brokerFee)
    expect(DAY_TRADE_COST.sellFee).toBe(TW_TRADING.brokerFee)
    expect(DAY_TRADE.costPerTrade).toBeCloseTo(0.00435, 12)
    // sellCost 尚未查證（Plan 8 Task 3 查證）：畫面要顯示 ？
    expect(DAY_TRADE_COST.verified.sellCost).toBe(false)
  })

  it('example: 250 trades, win 50% of the time, +1% / −1%', () => {
    expect(DAY_TRADE).toMatchObject({ trades: 250, winRate: 0.5, avgWin: 0.01, avgLoss: 0.01 })
  })
})

describe('dayTradeDrain (expected value; whole capital each trade; start 100)', () => {
  it('expected per trade = 0.5 × 0.01 − 0.5 × 0.01 − 0.00435 = −0.00435', () => {
    expect(dayTradeDrain(DAY_TRADE).expectedPerTrade).toBeCloseTo(-0.00435, 12)
  })

  it('after 250 trades: 100 × (1 − 0.00435)^250 = 100 × e^(250 × ln 0.99565) = 100 × e^(−1.08987) ≈ 33.63 left', () => {
    const r = dayTradeDrain(DAY_TRADE)
    expect(r.capitalAfter).toBeCloseTo(100 * (1 - 0.00435) ** 250, 9)
    expect(r.capitalAfter).toBeCloseTo(33.626, 3)
    // 一路付掉的成本＝每次「當時本金 × 0.00435」加總＝100 × (1 − 0.99565^250) ≈ 66.37（輸贏互相抵掉，少掉的全是成本）
    expect(r.costPaid).toBeCloseTo(100 - r.capitalAfter, 9)
    expect(r.path).toHaveLength(251)
    expect(r.path[0]).toBe(100)
    expect(r.path[20]).toBeCloseTo(100 * 0.99565 ** 20, 9) // ≈ 91.65：一個月（20 次）就少 8%
  })

  it('no costs and a fair game: expected value 0, capital stays 100', () => {
    const r = dayTradeDrain({ ...DAY_TRADE, costPerTrade: 0 })
    expect(r.expectedPerTrade).toBe(0)
    expect(r.capitalAfter).toBeCloseTo(100, 12)
    expect(r.costPaid).toBe(0)
  })

  it('even winning 55% of the time still loses: 0.55 × 0.01 − 0.45 × 0.01 − 0.00435 = −0.00335 → 100 × 0.99665^250 ≈ 43.22', () => {
    const r = dayTradeDrain({ ...DAY_TRADE, winRate: 0.55 })
    expect(r.expectedPerTrade).toBeCloseTo(-0.00335, 12)
    expect(r.capitalAfter).toBeCloseTo(43.218, 3)
  })

  it('break-even win rate = (avgLoss + cost) ÷ (avgWin + avgLoss) = (0.01 + 0.00435) ÷ 0.02 = 0.7175', () => {
    expect(breakEvenWinRate(DAY_TRADE)).toBeCloseTo(0.7175, 12)
    expect(dayTradeDrain({ ...DAY_TRADE, winRate: 0.7175 }).expectedPerTrade).toBeCloseTo(0, 12)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => dayTradeDrain({ ...DAY_TRADE, trades: 1.5 })).toThrow(/trades/)
    expect(() => dayTradeDrain({ ...DAY_TRADE, costPerTrade: -0.1 })).toThrow(/costPerTrade/)
    expect(() => dayTradeDrain({ ...DAY_TRADE, winRate: 1.1 })).toThrow(/winRate/)
    expect(() => dayTradeDrain({ ...DAY_TRADE, avgWin: -0.01 })).toThrow(/avgWin/)
    expect(() => dayTradeDrain({ ...DAY_TRADE, avgLoss: 1 })).toThrow(/avgLoss/)
    expect(() => breakEvenWinRate({ avgWin: 0, avgLoss: 0, costPerTrade: 0 })).toThrow(/avgWin/)
  })
})
