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
