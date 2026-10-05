import { describe, expect, it } from 'vitest'
import { bondPrice } from './bondPrice'
import { DURATION, priceChange } from './duration'

describe('priceChange (an IOU bought at face 100 with coupon = rateFrom; rates move to rateTo)', () => {
  it('example: 2-year vs 20-year IOU, rates 2% → 3% (≈ illustrative)', () => {
    expect(DURATION).toEqual({ rateFrom: 0.02, rateTo: 0.03, short: 2, long: 20 })
  })

  it('2 years: 2 ÷ 1.03 + 102 ÷ 1.03² = 1.9417 + 96.1448 = 98.0865 → −1.91%', () => {
    expect(priceChange(2, 0.02, 0.03)).toBeCloseTo((2 / 1.03 + 102 / 1.03 ** 2) / 100 - 1, 12)
    expect(priceChange(2, 0.02, 0.03)).toBeCloseTo(-0.019135, 6)
  })

  it('20 years: 2 × (1 − 1.03^−20) ÷ 0.03 + 100 ÷ 1.03^20 = 2 × 14.8775 + 55.3676 = 85.1225 → −14.88%', () => {
    const annuity = (1 - 1.03 ** -20) / 0.03 // 14.8775
    expect(priceChange(20, 0.02, 0.03)).toBeCloseTo((2 * annuity + 100 / 1.03 ** 20) / 100 - 1, 12)
    expect(priceChange(20, 0.02, 0.03)).toBeCloseTo(-0.148775, 6)
  })

  it('the longer board tips further: 20-year drop ≈ 7.8 × the 2-year drop (0.148775 ÷ 0.019135)', () => {
    const short = priceChange(DURATION.short, DURATION.rateFrom, DURATION.rateTo)
    const long = priceChange(DURATION.long, DURATION.rateFrom, DURATION.rateTo)
    expect(long).toBeLessThan(short)
    expect(long / short).toBeCloseTo(7.775, 2)
    let prev = 0
    for (const y of [1, 2, 5, 10, 20, 30]) {
      const c = priceChange(y, 0.02, 0.03)
      expect(c).toBeLessThan(prev)
      prev = c
    }
  })

  it('reuses bondPrice: same as bondPrice({ coupon: rateFrom, years, rate: rateTo }) ÷ 100 − 1', () => {
    expect(priceChange(10, 0.02, 0.05)).toBeCloseTo(bondPrice({ coupon: 0.02, years: 10, rate: 0.05 }) / 100 - 1, 12)
  })

  it('rates fall 2% → 1%: 20 years rises to 118.05 (+18.05%), 2 years to 101.97 (+1.97%); no move → 0; 0 years → 0', () => {
    // 20 年：2 × (1 − 1.01^−20) ÷ 0.01 + 100 ÷ 1.01^20 = 2 × 18.0456 + 81.9544 = 118.0456
    expect(priceChange(20, 0.02, 0.01)).toBeCloseTo(0.180456, 6)
    // 2 年：2 ÷ 1.01 + 102 ÷ 1.01² = 1.9802 + 99.9902 = 101.9704
    expect(priceChange(2, 0.02, 0.01)).toBeCloseTo(0.019704, 6)
    expect(priceChange(20, 0.02, 0.02)).toBeCloseTo(0, 12)
    expect(priceChange(0, 0.02, 0.05)).toBe(0)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => priceChange(2.5, 0.02, 0.03)).toThrow(/years/)
    expect(() => priceChange(2, -0.01, 0.03)).toThrow(/coupon|rateFrom/)
    expect(() => priceChange(2, 0.02, 1)).toThrow(/rate/)
  })
})
