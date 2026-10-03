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
})
