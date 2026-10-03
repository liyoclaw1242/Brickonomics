import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { profileFromFees, valueAfter, firstYearAhead, type FeeProfile } from './fees'

// 示意費率，不是任何真實基金
const front: FeeProfile = { entry: 0.05, annual: [{ rate: 0.01 }], exitByYear: [], exitDefault: 0 }
const back: FeeProfile = {
  entry: 0,
  annual: [{ rate: 0.01 }, { rate: 0.01 }],
  exitByYear: [0.04, 0.03, 0.02, 0.01],
  exitDefault: 0,
}
const none: FeeProfile = { entry: 0, annual: [], exitByYear: [], exitDefault: 0 }

// 出口門：exit = exitByYear[floor(years)] ?? exitDefault
//   years 0～<1 → 第 1 年費率 [0]；1～<2 → [1]；⋯；超出表 → exitDefault
// 年費：每項 (1 - rate)^min(years, fee.years ?? years)；成長 (1 + g)^years

describe('valueAfter', () => {
  it('front-load: entry gate then annual drag', () => {
    expect(valueAfter(front, 1)).toBeCloseTo(94.05, 4) // 100 * 0.95 * 0.99
    // 100 * 0.95 * 0.99^6 ; 0.99^6 = 0.941480149 -> 95 * 0.941480149 = 89.440614
    expect(valueAfter(front, 6)).toBeCloseTo(89.4406, 3)
  })

  it('back-load: annual drag includes distribution fee, exit gate declines by year', () => {
    // years = 1 -> exitByYear[1] = 0.03 ; 100 * 0.99^2 * 0.97 = 100 * 0.9801 * 0.97 = 95.0697
    expect(valueAfter(back, 1)).toBeCloseTo(95.0697, 4)
    // years = 3 -> exitByYear[3] = 0.01 ; 100 * 0.99^6 * 0.99 = 100 * 0.941480149 * 0.99 = 93.20653
    expect(valueAfter(back, 3)).toBeCloseTo(93.2065, 3)
    // years = 4 -> beyond schedule, exit 0 ; 100 * 0.99^8 = 100 * 0.922744694 = 92.2745
    expect(valueAfter(back, 4)).toBeCloseTo(92.2745, 3)
    // years = 5 -> 100 * 0.99^10 = 100 * 0.904382075 = 90.4382
    expect(valueAfter(back, 5)).toBeCloseTo(90.4382, 3)
  })

  it('selling within the first year (years = 0) pays the year-1 CDSC', () => {
    expect(valueAfter(back, 0)).toBeCloseTo(96, 6) // 100 * (1 - 0.04)
    expect(valueAfter(front, 0)).toBeCloseTo(95, 6) // entry gate only
  })

  it('fractional years use the schedule slot of the completed years', () => {
    // 0.5 年 -> floor 0 -> cdsc[0] = 0.04 ; 100 * (0.99^2)^0.5 * 0.96 = 100 * 0.99 * 0.96 = 95.04
    expect(valueAfter(back, 0.5)).toBeCloseTo(95.04, 6)
    // 1.5 年 -> floor 1 -> cdsc[1] = 0.03 ; 100 * (0.99^2)^1.5 * 0.97 = 100 * 0.99^3 * 0.97 = 100 * 0.970299 * 0.97 = 94.119003
    expect(valueAfter(back, 1.5)).toBeCloseTo(94.119003, 5)
  })

  it('applies gross return and amount', () => {
    expect(valueAfter(none, 2, { amount: 1000, grossReturn: 0.1 })).toBeCloseTo(1210)
  })

  it('a fee with years stops being charged after that many years', () => {
    const p: FeeProfile = { entry: 0, annual: [{ rate: 0.02, years: 2 }], exitByYear: [], exitDefault: 0 }
    expect(valueAfter(p, 1)).toBeCloseTo(98, 6) // 100 * 0.98
    expect(valueAfter(p, 2)).toBeCloseTo(96.04, 6) // 100 * 0.98^2
    expect(valueAfter(p, 5)).toBeCloseTo(96.04, 6) // 只收 2 年：100 * 0.98^min(5, 2)
    expect(valueAfter(p, 1.5)).toBeCloseTo(100 * Math.pow(0.98, 1.5), 6) // min(1.5, 2) = 1.5
  })

  it('rejects invalid parameters with RangeError naming the parameter', () => {
    expect(() => valueAfter(back, -1)).toThrow(RangeError)
    expect(() => valueAfter(back, -1)).toThrow(/years/)
    expect(() => valueAfter(back, NaN)).toThrow(/years/)
    expect(() => valueAfter(back, Infinity)).toThrow(/years/)
    expect(() => valueAfter(back, 1, { grossReturn: -1 })).toThrow(/grossReturn/)
    expect(() => valueAfter(back, 1, { amount: -5 })).toThrow(/amount/)
    expect(() => valueAfter({ ...back, entry: 1 }, 1)).toThrow(/entry/)
    expect(() => valueAfter({ ...back, annual: [{ rate: 1.2 }] }, 1)).toThrow(/annual/)
    expect(() => valueAfter({ ...back, exitDefault: -0.1 }, 1)).toThrow(/exitDefault/)
  })
})

describe('firstYearAhead', () => {
  it('front-load overtakes back-load in year 6 for these illustrative fees', () => {
    // front(y) = 95 * 0.99^y ; back(y) = 100 * 0.99^(2y) * (1 - exit(y)), exit(y) = [.04,.03,.02,.01][y] ?? 0
    // y1: 94.0500 vs 95.0697  y2: 93.1095 vs 94.1384  y3: 92.1784 vs 93.2065
    // y4: 91.2566 vs 92.2745  y5: 90.3441 vs 90.4382  (front 仍落後)
    // y6: 89.4406 vs 100 * 0.99^12 = 88.6385  -> front 首次領先
    expect(firstYearAhead(front, back)).toBe(6)
  })

  it('returns null when a never overtakes b within maxYears', () => {
    // 第 1～3 年 front（94.05、93.11、92.18）都低於 back（95.07、94.14、93.21）
    expect(firstYearAhead(front, back, 3)).toBeNull()
    expect(firstYearAhead(front, back, 5)).toBeNull() // y5: 90.34 < 90.44
  })

  it('rejects invalid maxYears', () => {
    expect(() => firstYearAhead(front, back, 0)).toThrow(RangeError)
    expect(() => firstYearAhead(front, back, 0)).toThrow(/maxYears/)
    expect(() => firstYearAhead(front, back, 2.5)).toThrow(/maxYears/)
    expect(() => firstYearAhead(front, back, NaN)).toThrow(/maxYears/)
    expect(() => firstYearAhead(front, back, 5, { grossReturn: -2 })).toThrow(/grossReturn/)
  })
})

describe('profileFromFees', () => {
  it('maps fund fees to gates', () => {
    const p = profileFromFees({ frontLoad: 0.03, expenseRatio: 0.015 })
    expect(p.entry).toBeCloseTo(0.03)
    expect(p.annual).toEqual([{ rate: 0.015 }])
    expect(p.exitByYear).toEqual([])
    expect(p.exitDefault).toBe(0)
  })

  it('combines trading costs multiplicatively with load and CDSC', () => {
    const p = profileFromFees({ expenseRatio: 0.0014, cdsc: [0.04] }, { buy: 0.001425, sell: 0.002425 })
    expect(p.entry).toBeCloseTo(0.001425)
    expect(p.annual).toEqual([{ rate: 0.0014 }])
    expect(p.exitByYear[0]).toBeCloseTo(1 - 0.96 * (1 - 0.002425))
    expect(p.exitDefault).toBeCloseTo(0.002425)
  })

  it('maps distributionFee with its duration, dropping zero/undefined rates', () => {
    const p = profileFromFees({ expenseRatio: 0.01, distributionFee: 0.005, distributionFeeYears: 3 })
    expect(p.annual).toEqual([{ rate: 0.01 }, { rate: 0.005, years: 3 }])
    // 沒有 years -> 永久收費，且不帶 years 欄位
    expect(profileFromFees({ distributionFee: 0.005 }).annual).toEqual([{ rate: 0.005 }])
    expect(profileFromFees({ expenseRatio: 0, distributionFee: 0 }).annual).toEqual([])
  })

  it('handles missing fees', () => {
    expect(profileFromFees(undefined)).toEqual({ entry: 0, annual: [], exitByYear: [], exitDefault: 0 })
  })

  it('rejects invalid trading costs', () => {
    expect(() => profileFromFees(undefined, { buy: -0.1, sell: 0 })).toThrow(/buy/)
    expect(() => profileFromFees(undefined, { buy: 0, sell: 1 })).toThrow(RangeError)
    expect(() => profileFromFees(undefined, { buy: 0, sell: NaN })).toThrow(/sell/)
  })
})

describe('Schroder U class (real snapshot fees)', () => {
  const u = profileFromFees(universe.get('SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD')!.fees)
  // annual: 管理費 1.1% 永久 + 分銷費 1.0% 只收 3 年；CDSC [3%, 2%, 1%]，之後 0
  it('maps to the documented schedule', () => {
    expect(u.annual).toEqual([{ rate: 0.011 }, { rate: 0.01, years: 3 }])
    expect(u.exitByYear).toHaveLength(3)
    ;[0.03, 0.02, 0.01].forEach((c, i) => expect(u.exitByYear[i]).toBeCloseTo(c, 12)) // combine() 浮點誤差
    expect(u.exitDefault).toBe(0)
  })

  it('exit is 1% at 2 years and 0% at 3 years', () => {
    // 2 年：100 * 0.989^2 * 0.99^2 * (1 - 0.01)
    //   0.989^2 = 0.978121 ; 0.99^2 = 0.9801 ; 0.978121 * 0.9801 = 0.958656392 ; * 0.99 = 0.949069828 -> 94.9070
    expect(valueAfter(u, 2)).toBeCloseTo(94.907, 3)
    // 3 年（滿 3 年，CDSC 0）：100 * 0.989^3 * 0.99^3 ; 0.989^3 = 0.967361669 ; 0.99^3 = 0.970299
    //   0.967361669 * 0.970299 = 0.938629739 -> 93.8630
    expect(valueAfter(u, 3)).toBeCloseTo(93.863, 3)
  })

  it('the distribution fee stops after year 3 (only the 1.1% management fee remains)', () => {
    // 第 4、5 年只剩管理費，且 CDSC 都是 0：value(5) / value(4) = 0.989
    expect(valueAfter(u, 5) / valueAfter(u, 4)).toBeCloseTo(0.989, 9)
    // 第 3→4 年同樣只扣管理費（分銷費只收 3 年）
    expect(valueAfter(u, 4) / valueAfter(u, 3)).toBeCloseTo(0.989, 9)
    // 第 2→3 年仍收分銷費：(0.989 * 0.99) 再乘上出口門變動 1/0.99
    expect(valueAfter(u, 3) / valueAfter(u, 2)).toBeCloseTo((0.989 * 0.99) / 0.99, 9)
  })
})
