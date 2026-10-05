import { describe, expect, it } from 'vitest'
import { PAIRS, combine, correlation, pathOf, volatility } from './correlation'

describe('correlation example paths (≈ illustrative returns per period)', () => {
  it('a = +12% / −8% repeated; opposite moves the other way, same moves with it; all average +2%', () => {
    expect(PAIRS.a).toEqual([0.12, -0.08, 0.12, -0.08])
    expect(PAIRS.opposite).toEqual([-0.04, 0.08, -0.04, 0.08])
    expect(PAIRS.same).toEqual([0.08, -0.04, 0.08, -0.04])
    for (const p of [PAIRS.a, PAIRS.opposite, PAIRS.same]) expect(p.reduce((x, y) => x + y, 0) / p.length).toBeCloseTo(0.02, 12)
  })
})

describe('volatility (population standard deviation of the returns)', () => {
  it('a: mean 0.02, each return is 0.02 ± 0.10 → sqrt(mean(0.10²)) = 0.10', () => {
    expect(volatility(PAIRS.a)).toBeCloseTo(0.1, 12)
  })
  it('opposite and same: 0.02 ± 0.06 → 0.06', () => {
    expect(volatility(PAIRS.opposite)).toBeCloseTo(0.06, 12)
    expect(volatility(PAIRS.same)).toBeCloseTo(0.06, 12)
  })
  it('a flat path has 0 volatility; [0.1, −0.1] → mean 0, sqrt((0.01 + 0.01) ÷ 2) = 0.1', () => {
    expect(volatility([0.03, 0.03, 0.03])).toBe(0)
    expect(volatility([0.1, -0.1])).toBeCloseTo(0.1, 12)
  })
})

describe('combine (w in a, 1 − w in b, each period)', () => {
  it('50/50 with the opposite path: 0.5 × 0.12 + 0.5 × (−0.04) = 0.04; 0.5 × (−0.08) + 0.5 × 0.08 = 0 → [0.04, 0, 0.04, 0]', () => {
    const mix = combine(PAIRS.a, PAIRS.opposite, 0.5)
    ;[0.04, 0, 0.04, 0].forEach((v, i) => expect(mix[i]).toBeCloseTo(v, 12))
  })

  it('一上一下: same average +2%, but volatility 0.02 (opposite mix) vs 0.08 (same mix)', () => {
    // opposite：0.02 ± 0.02 → 0.02；same：0.5 × 0.12 + 0.5 × 0.08 = 0.10，0.5 × (−0.08) + 0.5 × (−0.04) = −0.06 → 0.02 ± 0.08 → 0.08
    expect(volatility(combine(PAIRS.a, PAIRS.opposite, 0.5))).toBeCloseTo(0.02, 12)
    expect(volatility(combine(PAIRS.a, PAIRS.same, 0.5))).toBeCloseTo(0.08, 12)
  })

  it('opposite mix at w = 0.06 ÷ (0.10 + 0.06) = 0.375 cancels out completely: 0.375 × 0.10 − 0.625 × 0.06 = 0', () => {
    expect(volatility(combine(PAIRS.a, PAIRS.opposite, 0.375))).toBeCloseTo(0, 12)
  })

  it('w = 1 is all a, w = 0 is all b', () => {
    expect(combine(PAIRS.a, PAIRS.opposite, 1)).toEqual(PAIRS.a)
    expect(combine(PAIRS.a, PAIRS.opposite, 0)).toEqual(PAIRS.opposite)
  })
})

describe('correlation and pathOf', () => {
  it('opposite → −1, same → +1 (each is a straight-line copy of a: opposite = 0.02 − 0.6 × (a − 0.02))', () => {
    expect(correlation(PAIRS.a, PAIRS.opposite)).toBeCloseTo(-1, 12)
    expect(correlation(PAIRS.a, PAIRS.same)).toBeCloseTo(1, 12)
  })

  it('tower heights from 100: a → 100 × 1.12 × 0.92 × 1.12 × 0.92 = 100 × 1.0304² = 106.17; the opposite mix → 100 × 1.04² = 108.16', () => {
    const a = pathOf(PAIRS.a)
    expect(a).toHaveLength(5)
    expect(a[1]).toBeCloseTo(112, 10)
    expect(a[2]).toBeCloseTo(103.04, 10)
    expect(a.at(-1)).toBeCloseTo(100 * 1.0304 ** 2, 10)
    expect(a.at(-1)).toBeCloseTo(106.172, 3)
    expect(pathOf(combine(PAIRS.a, PAIRS.opposite, 0.5)).at(-1)).toBeCloseTo(108.16, 10)
    expect(pathOf([0.1], 50)[1]).toBeCloseTo(55, 12) // 50 × 1.1
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => volatility([])).toThrow(/returns/)
    expect(() => volatility([0.1, NaN])).toThrow(/returns/)
    expect(() => combine([0.1], [0.1, 0.2], 0.5)).toThrow(/length/)
    expect(() => combine([0.1], [0.2], 1.2)).toThrow(/w/)
    expect(() => correlation([0.1, 0.1], [0.2, 0.3])).toThrow(/flat/)
    expect(() => pathOf([-1])).toThrow(/returns/)
    expect(() => pathOf([0.1], 0)).toThrow(/start/)
  })
})
