import { describe, expect, it } from 'vitest'
import { yearsToPayBack } from './valuation'

describe('yearsToPayBack (P/E in years of earnings)', () => {
  it('= price ÷ earnings per share', () => {
    expect(yearsToPayBack(600, 40)).toBe(15)
    expect(yearsToPayBack(600, 10)).toBe(60)
    expect(yearsToPayBack(100, 8)).toBeCloseTo(12.5, 12)
  })
  it('rejects zero, negative or non-finite inputs, naming the parameter', () => {
    expect(() => yearsToPayBack(0, 10)).toThrow(/price/)
    expect(() => yearsToPayBack(100, 0)).toThrow(/earnings/)
    expect(() => yearsToPayBack(100, -5)).toThrow(/earnings/)
    expect(() => yearsToPayBack(NaN, 5)).toThrow(RangeError)
  })
})
