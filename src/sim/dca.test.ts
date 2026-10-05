import { describe, expect, it } from 'vitest'
import { dca } from './dca'

describe('dca (dollar-cost averaging: same amount every month)', () => {
  it('buys amount ÷ price units each month; cheap months buy more', () => {
    const r = dca([10, 5, 10], 100)
    expect(r.units).toEqual([10, 20, 10])
    expect(r.totalUnits).toBe(40)
    expect(r.invested).toBe(300)
    expect(r.avgCost).toBe(300 / 40) // 7.5
    expect(r.avgPrice).toBeCloseTo(25 / 3, 12) // 8.33
  })

  it('average cost (total ÷ units, a harmonic mean) is never above the average price', () => {
    const paths = [[50, 45, 40, 32, 25, 30, 36, 40, 45, 48, 50, 50], [10, 20], [7, 7, 7], [3, 9, 1, 12]]
    for (const p of paths) {
      const r = dca(p, 3000)
      expect(r.avgCost).toBeLessThanOrEqual(r.avgPrice + 1e-12)
      expect(r.avgCost).toBeCloseTo(r.invested / r.totalUnits, 12)
    }
    const flat = dca([7, 7, 7], 70)
    expect(flat.avgCost).toBeCloseTo(flat.avgPrice, 12) // 價格不動：一樣
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => dca([], 100)).toThrow(/prices/)
    expect(() => dca([10, 0], 100)).toThrow(/prices/)
    expect(() => dca([10], 0)).toThrow(/amount/)
    expect(() => dca([10], NaN)).toThrow(RangeError)
  })
})
