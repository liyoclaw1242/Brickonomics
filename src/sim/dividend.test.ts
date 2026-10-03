import { describe, it, expect } from 'vitest'
import { exDividend, simulateDistribution } from './dividend'

describe('exDividend', () => {
  it('conserves value: price drops by exactly the cash paid', () => {
    const r = exDividend(100, 5)
    expect(r).toEqual({ price: 95, cash: 5 })
    expect(r.price + r.cash).toBe(100)
  })

  it('rejects negative or larger-than-price dividends', () => {
    expect(() => exDividend(100, -1)).toThrow()
    expect(() => exDividend(100, 101)).toThrow()
  })

  it('rejects invalid parameters with RangeError naming the parameter', () => {
    expect(() => exDividend(0, 0)).toThrow(/price/)
    expect(() => exDividend(NaN, 1)).toThrow(RangeError)
    expect(() => exDividend(Infinity, 1)).toThrow(/price/)
    expect(() => exDividend(100, -1)).toThrow(RangeError)
    expect(() => exDividend(100, -1)).toThrow(/dividend/)
    expect(() => exDividend(100, NaN)).toThrow(/dividend/)
    expect(() => exDividend(100, 101)).toThrow(/dividend/)
  })
})

describe('simulateDistribution', () => {
  const base = { initialValue: 100, incomeYield: 0.05, priceReturn: 0, periods: 2 }

  it('starts with the initial state', () => {
    const s = simulateDistribution({ ...base, payoutRate: 0.05, mode: 'payout' })
    expect(s).toHaveLength(3)
    expect(s[0]).toEqual({ period: 0, value: 100, cashReceived: 0, fromPrincipal: 0, total: 100 })
  })

  it('accumulating class compounds income into value', () => {
    const last = simulateDistribution({ ...base, payoutRate: 0.05, mode: 'accumulate' }).at(-1)!
    expect(last.value).toBeCloseTo(110.25)
    expect(last.cashReceived).toBe(0)
  })

  it('distributing class pays income out and ends with a lower total', () => {
    const last = simulateDistribution({ ...base, payoutRate: 0.05, mode: 'payout' }).at(-1)!
    expect(last.value).toBeCloseTo(100)
    expect(last.cashReceived).toBeCloseTo(10)
    expect(last.total).toBeCloseTo(110)
    expect(last.fromPrincipal).toBe(0)
  })

  it('paying out more than income eats principal (illustrative only)', () => {
    const s = simulateDistribution({ initialValue: 100, incomeYield: 0.03, priceReturn: 0, payoutRate: 0.06, periods: 1, mode: 'payout' })
    expect(s[1]?.value).toBeCloseTo(97)
    expect(s[1]?.cashReceived).toBeCloseTo(6)
    expect(s[1]?.fromPrincipal).toBeCloseTo(3)
  })

  it('with a non-zero priceReturn: fromPrincipal ignores price gains', () => {
    // initial 100, incomeYield 3%, priceReturn +5%, payoutRate 6%, payout mode
    // 期 1：income = 100 * 0.03 = 3；payout = 100 * 0.06 = 6；fromPrincipal += 6 - 3 = 3
    //       value = 100 * 1.05 + 3 - 6 = 102；cash = 6；total = 108
    // 期 2：income = 102 * 0.03 = 3.06；payout = 102 * 0.06 = 6.12；fromPrincipal += 6.12 - 3.06 = 3.06 -> 6.06
    //       value = 102 * 1.05 + 3.06 - 6.12 = 107.1 - 3.06 = 104.04；cash = 6 + 6.12 = 12.12；total = 116.16
    const s = simulateDistribution({ initialValue: 100, incomeYield: 0.03, priceReturn: 0.05, payoutRate: 0.06, periods: 2, mode: 'payout' })
    expect(s[1]?.value).toBeCloseTo(102, 9)
    expect(s[1]?.fromPrincipal).toBeCloseTo(3, 9)
    expect(s[2]?.value).toBeCloseTo(104.04, 9)
    expect(s[2]?.cashReceived).toBeCloseTo(12.12, 9)
    expect(s[2]?.fromPrincipal).toBeCloseTo(6.06, 9) // 價值已高於 100，仍累計「配出超過產出」
    expect(s[2]?.total).toBeCloseTo(116.16, 9)
  })

  it('ex-dividend then price recovery (填息) restores the price and keeps the cash', () => {
    // 除息：100 - 5 = 95，拿到 5。填息：95 * (1 + 5/95) = 95 + 5 = 100。
    const ex = exDividend(100, 5)
    const refilled = ex.price * (1 + 5 / 95)
    expect(refilled).toBeCloseTo(100, 9)
    expect(refilled + ex.cash).toBeCloseTo(105, 9) // 填息後價格回到 100，金幣 5 留在手上
  })

  it('rejects invalid parameters with RangeError naming the parameter', () => {
    const run = (o: object) => () => simulateDistribution({ ...base, payoutRate: 0.05, mode: 'payout', ...o })
    expect(run({ initialValue: -1 })).toThrow(/initialValue/)
    expect(run({ initialValue: NaN })).toThrow(RangeError)
    expect(run({ incomeYield: 1 })).toThrow(/incomeYield/)
    expect(run({ incomeYield: -0.1 })).toThrow(RangeError)
    expect(run({ priceReturn: -1 })).toThrow(/priceReturn/)
    expect(run({ priceReturn: NaN })).toThrow(RangeError)
    expect(run({ payoutRate: 1.5 })).toThrow(/payoutRate/)
    expect(run({ payoutRate: Infinity })).toThrow(RangeError)
    expect(run({ periods: 1.5 })).toThrow(/periods/)
    expect(run({ periods: -1 })).toThrow(RangeError)
  })

  it('throws when a payout would make the value negative', () => {
    // value 100, priceReturn -0.9, income 0, payout 0.95 -> 100 * 0.1 - 95 = -85 < 0
    const bad = () => simulateDistribution({ initialValue: 100, incomeYield: 0, priceReturn: -0.9, payoutRate: 0.95, periods: 1, mode: 'payout' })
    expect(bad).toThrow(RangeError)
    expect(bad).toThrow(/payoutRate/)
  })
})
