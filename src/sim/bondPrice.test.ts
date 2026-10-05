import { describe, expect, it } from 'vitest'
import { bondPrice } from './bondPrice'

describe('bondPrice (face 100, annual coupon, present value)', () => {
  it('equals face value when the market rate equals the coupon', () => {
    expect(bondPrice({ coupon: 0.02, years: 10, rate: 0.02 })).toBeCloseTo(100, 9)
    expect(bondPrice({ coupon: 0.05, years: 3, rate: 0.05 })).toBeCloseTo(100, 9)
  })

  it('2% coupon, 10 years, market rate 5% → 2 × annuity + 100 ÷ 1.05^10 ≈ 76.83', () => {
    const annuity = (1 - 1.05 ** -10) / 0.05 // 7.7217
    const expected = 2 * annuity + 100 / 1.05 ** 10 // 15.443 + 61.391
    expect(bondPrice({ coupon: 0.02, years: 10, rate: 0.05 })).toBeCloseTo(expected, 9)
    expect(expected).toBeCloseTo(76.83, 2)
  })

  it('seesaw: a higher market rate always means a lower price; a lower rate a higher price', () => {
    let prev = Infinity
    for (let r = 0; r <= 0.1001; r += 0.005) {
      const p = bondPrice({ coupon: 0.02, years: 10, rate: r })
      expect(p).toBeLessThan(prev)
      prev = p
    }
    expect(bondPrice({ coupon: 0.02, years: 10, rate: 0.01 })).toBeGreaterThan(100)
  })

  it('pulls back toward 100 as maturity nears (fewer years left, same rates)', () => {
    const left = [10, 5, 1, 0].map((years) => bondPrice({ coupon: 0.02, years, rate: 0.05 }))
    for (let i = 1; i < left.length; i++) expect(left[i]!).toBeGreaterThan(left[i - 1]!)
    expect(left.at(-1)).toBe(100) // 到期：拿回 100
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => bondPrice({ coupon: -0.01, years: 10, rate: 0.05 })).toThrow(/coupon/)
    expect(() => bondPrice({ coupon: 0.02, years: 1.5, rate: 0.05 })).toThrow(/years/)
    expect(() => bondPrice({ coupon: 0.02, years: 10, rate: 1 })).toThrow(/rate/)
    expect(() => bondPrice({ coupon: 0.02, years: 10, rate: NaN })).toThrow(RangeError)
  })
})
