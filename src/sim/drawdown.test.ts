import { describe, expect, it } from 'vitest'
import { maxDrawdown } from './drawdown'

describe('maxDrawdown', () => {
  it('finds the biggest fall from a running peak: 100→140→84→120 is −40%', () => {
    expect(maxDrawdown([100, 140, 84, 120])).toEqual({ peakIndex: 1, troughIndex: 2, pct: (140 - 84) / 140 })
    expect(maxDrawdown([100, 140, 84, 120]).pct).toBeCloseTo(0.4, 12)
  })

  it('uses the peak before the trough, not a later higher price', () => {
    // 50→40 是 20%；之後 200→150 是 25%（最大）
    expect(maxDrawdown([50, 40, 200, 150])).toEqual({ peakIndex: 2, troughIndex: 3, pct: (200 - 150) / 200 })
    // 先跌 50%（100→50），後來漲到 300 也不會「抵銷」
    expect(maxDrawdown([100, 50, 300]).pct).toBeCloseTo(0.5, 12)
  })

  it('a path that never falls has 0 drawdown at the start', () => {
    expect(maxDrawdown([10, 20, 30])).toEqual({ peakIndex: 0, troughIndex: 0, pct: 0 })
    expect(maxDrawdown([7])).toEqual({ peakIndex: 0, troughIndex: 0, pct: 0 })
  })

  it('rejects empty paths and non-positive or non-finite prices, naming the parameter', () => {
    expect(() => maxDrawdown([])).toThrow(/path/)
    expect(() => maxDrawdown([1, 0])).toThrow(/path/)
    expect(() => maxDrawdown([1, NaN])).toThrow(RangeError)
    expect(() => maxDrawdown([1, Infinity])).toThrow(RangeError)
  })
})
