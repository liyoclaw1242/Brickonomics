import { describe, expect, it } from 'vitest'
import { TW_TRADING } from '../data/trading'
import { DAY_TRADE, DAY_TRADE_COST, breakEvenWinRate, dayTradeCostVerified, dayTradeDrain } from './dayTrade'

describe('day-trade example (why most lose: costs at a 50% win rate)', () => {
  it('cost per round trip = buy fee + sell fee (posted cap) + day-trade sell-side cost = 0.001425 + 0.001425 + 0.0015 = 0.00435, all from TW_TRADING', () => {
    expect(DAY_TRADE_COST.buyFee).toBe(TW_TRADING.brokerFee)
    expect(DAY_TRADE_COST.sellFee).toBe(TW_TRADING.brokerFee)
    expect(DAY_TRADE_COST.sellCost).toBe(TW_TRADING.dayTradeSellCost)
    expect(TW_TRADING.dayTradeSellCost).toBe(0.0015)
    expect(DAY_TRADE.costPerTrade).toBeCloseTo(0.00435, 12)
  })

  it('verified flags follow the data (Task 4 derives ？ from them)', () => {
    expect(DAY_TRADE_COST.verified).toEqual({
      buyFee: TW_TRADING.verified.brokerFee,
      sellFee: TW_TRADING.verified.brokerFee,
      sellCost: TW_TRADING.verified.dayTradeSellCost,
    })
    expect(dayTradeCostVerified()).toBe(TW_TRADING.verified.brokerFee && TW_TRADING.verified.dayTradeSellCost)
    expect(DAY_TRADE_COST.sellCostUntil).toBe('2027-12-31')
  })

  it('example: 250 trades, win 50% of the time, +1% / −1% — all illustrative (≈), only the cost comes from data', () => {
    expect(DAY_TRADE).toMatchObject({ trades: 250, winRate: 0.5, avgWin: 0.01, avgLoss: 0.01 })
    expect(DAY_TRADE.illustrative).toEqual(['trades', 'winRate', 'avgWin', 'avgLoss'])
    expect(TW_TRADING.brokerFeeIsPosted).toBe(true) // 手續費是公告費率（是否為法定上限未確認），實收常有折扣
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

describe('fix round: discount, break-even and the cost expiry date', () => {
  it('dayTradeCostPerTrade(discount): broker fee × discount on both sides + the sell-side cost; 2.8 折 → 0.1425% × 0.28 × 2 + 0.15% = 0.2298%', async () => {
    const { dayTradeCostPerTrade } = await import('./dayTrade')
    expect(dayTradeCostPerTrade(1)).toBeCloseTo(0.00435, 12)
    expect(dayTradeCostPerTrade(0.28)).toBeCloseTo(0.001425 * 0.28 * 2 + 0.0015, 12)
    expect(() => dayTradeCostPerTrade(0)).toThrow(RangeError)
    expect(() => dayTradeCostPerTrade(1.5)).toThrow(RangeError)
  })
  it('break-even win rate: (1% + cost) ÷ 2% → 71.75% at the posted fee, 61.49% at 2.8 折', async () => {
    const { dayTradeCostPerTrade } = await import('./dayTrade')
    expect(breakEvenWinRate({ avgWin: 0.01, avgLoss: 0.01, costPerTrade: dayTradeCostPerTrade(1) })).toBeCloseTo(0.7175, 12)
    expect(breakEvenWinRate({ avgWin: 0.01, avgLoss: 0.01, costPerTrade: dayTradeCostPerTrade(0.28) })).toBeCloseTo((0.01 + 0.002298) / 0.02, 12)
  })
  it('after dayTradeSellCostUntil the sell-side cost is no longer known, so the cost counts as unverified (？ instead of a stale number)', () => {
    expect(dayTradeCostVerified(new Date('2026-10-05'))).toBe(true)
    expect(dayTradeCostVerified(new Date('2027-12-31T12:00:00'))).toBe(true)
    expect(dayTradeCostVerified(new Date('2028-01-01T00:00:01'))).toBe(false)
  })
})
