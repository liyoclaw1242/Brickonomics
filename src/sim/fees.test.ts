import { describe, it, expect } from 'vitest'
import { profileFromFees, valueAfter, firstYearAhead, type FeeProfile } from './fees'

// 示意費率，不是任何真實基金
const front: FeeProfile = { entry: 0.05, annual: [0.01], exitByYear: [], exitDefault: 0 }
const back: FeeProfile = { entry: 0, annual: [0.01, 0.01], exitByYear: [0.04, 0.03, 0.02, 0.01], exitDefault: 0 }

describe('valueAfter', () => {
  it('front-load: entry gate then annual drag', () => {
    expect(valueAfter(front, 1)).toBeCloseTo(94.05, 4) // 100 * 0.95 * 0.99
    expect(valueAfter(front, 6)).toBeCloseTo(89.4406, 3)
  })

  it('back-load: annual drag includes distribution fee, exit gate declines by year', () => {
    expect(valueAfter(back, 1)).toBeCloseTo(94.0896, 4) // 100 * 0.9801 * 0.96
    expect(valueAfter(back, 4)).toBeCloseTo(91.3517, 3)
    expect(valueAfter(back, 5)).toBeCloseTo(90.4382, 3) // CDSC 已歸零
  })

  it('selling within the first year (years = 0) pays the year-1 CDSC', () => {
    expect(valueAfter(back, 0)).toBeCloseTo(96, 6) // 100 * (1 - 0.04)
    expect(valueAfter(front, 0)).toBeCloseTo(95, 6) // entry gate only
  })

  it('applies gross return and amount', () => {
    expect(valueAfter({ entry: 0, annual: [], exitByYear: [], exitDefault: 0 }, 2, { amount: 1000, grossReturn: 0.1 })).toBeCloseTo(1210)
  })
})

describe('firstYearAhead', () => {
  it('front-load overtakes back-load in year 6 for these illustrative fees', () => {
    expect(firstYearAhead(front, back)).toBe(6)
  })

  it('returns null when a never overtakes b within maxYears', () => {
    // 第 1～3 年 front（94.05、93.11、92.18）都低於 back（94.09、93.18、92.27）
    expect(firstYearAhead(front, back, 3)).toBeNull()
  })
})

describe('profileFromFees', () => {
  it('maps fund fees to gates', () => {
    const p = profileFromFees({ frontLoad: 0.03, expenseRatio: 0.015 })
    expect(p.entry).toBeCloseTo(0.03)
    expect(p.annual).toEqual([0.015])
    expect(p.exitByYear).toEqual([])
    expect(p.exitDefault).toBe(0)
  })

  it('combines trading costs multiplicatively with load and CDSC', () => {
    const p = profileFromFees({ expenseRatio: 0.0014, cdsc: [0.04] }, { buy: 0.001425, sell: 0.002425 })
    expect(p.entry).toBeCloseTo(0.001425)
    expect(p.annual).toEqual([0.0014])
    expect(p.exitByYear[0]).toBeCloseTo(1 - 0.96 * (1 - 0.002425))
    expect(p.exitDefault).toBeCloseTo(0.002425)
  })

  it('handles missing fees', () => {
    expect(profileFromFees(undefined)).toEqual({ entry: 0, annual: [], exitByYear: [], exitDefault: 0 })
  })
})
