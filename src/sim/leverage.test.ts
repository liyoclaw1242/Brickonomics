import { describe, expect, it } from 'vitest'
import { LEVERAGE, choppyPath, leverageTowers, leveragedPath } from './leverage'

describe('choppyPath (−move then +move, repeated)', () => {
  it('100, −10%, +10%: 100 → 90 → 99 → 89.1 → 98.01', () => {
    const p = choppyPath(100, 0.1, 2)
    expect(p).toHaveLength(5)
    ;[100, 90, 99, 89.1, 98.01].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 10))
  })
})

describe('leveragedPath (daily reset: each step the tower moves k × that step’s change)', () => {
  it('k = 2 on 100 → 110 → 99: +20% → 120, then 2 × (−10%) = −20% → 96', () => {
    const p = leveragedPath([100, 110, 99], 2)
    ;[100, 120, 96].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 10))
  })

  it('k = −1 (inverse) on 100 → 110 → 99: −10% → 90, then +10% → 99', () => {
    const p = leveragedPath([100, 110, 99], -1)
    ;[100, 90, 99].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 10))
  })

  it('k = 1 copies the path; a straight rise is fine for k = 2 (100 → 110 → 121 gives 100 → 120 → 144)', () => {
    const base = [100, 110, 121]
    leveragedPath(base, 1).forEach((v, i) => expect(v).toBeCloseTo(base[i]!, 10))
    ;[100, 120, 144].forEach((v, i) => expect(leveragedPath(base, 2)[i]).toBeCloseTo(v, 10))
  })

  it('one round (+m then −m) multiplies the tower by (1 + k·m)(1 − k·m) = 1 − k²·m²', () => {
    for (const k of [1, 2, 3, -1, -2]) {
      const p = leveragedPath(choppyPath(100, 0.1, 1), k)
      expect(p[2]! / 100).toBeCloseTo(1 - k * k * 0.01, 12)
    }
  })

  it('a step that would push the tower below 0 leaves it at 0 for good (k = 3, −40% step: 1 + 3 × (−0.4) < 0)', () => {
    expect(leveragedPath([100, 60, 120], 3)).toEqual([100, 0, 0])
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => leveragedPath([], 2)).toThrow(/path/)
    expect(() => leveragedPath([100, 0], 2)).toThrow(/path/)
    expect(() => leveragedPath([100, 110], 5)).toThrow(/k/)
    expect(() => leveragedPath([100, 110], NaN)).toThrow(/k/)
    expect(() => choppyPath(100, 1, 2)).toThrow(/move/)
    expect(() => choppyPath(100, 0.1, 1.5)).toThrow(/rounds/)
    expect(() => choppyPath(0, 0.1, 2)).toThrow(/start/)
  })
})

describe('leverage example: −10% / +10% five times (≈ illustrative); plain vs 2× vs inverse', () => {
  it('example constant', () => {
    expect(LEVERAGE).toEqual({ start: 100, move: 0.1, rounds: 5, double: 2, inverse: -1 })
  })

  it('plain: 100 × (0.9 × 1.1)^5 = 100 × 0.99^5 = 95.10; 2×: 100 × (0.8 × 1.2)^5 = 100 × 0.96^5 = 81.54; inverse: 100 × (1.1 × 0.9)^5 = 95.10', () => {
    // 第一步（浪頭打到）：大盤 100 → 90、2 倍塔 100 → 80（被打矮一截）、反向塔 100 → 110
    expect(leverageTowers().plain[1]).toBeCloseTo(90, 10)
    expect(leverageTowers().double[1]).toBeCloseTo(80, 10)
    expect(leverageTowers().inverse[1]).toBeCloseTo(110, 10)
    const t = leverageTowers()
    expect(t.plain).toHaveLength(11)
    expect(t.plain.at(-1)).toBeCloseTo(95.099, 3)
    expect(t.double.at(-1)).toBeCloseTo(100 * 0.96 ** 5, 9)
    expect(t.double.at(-1)).toBeCloseTo(81.537, 3)
    expect(t.inverse.at(-1)).toBeCloseTo(95.099, 3)
  })

  it('the 2× tower loses far more than 2 × the plain loss: 18.46% vs 2 × 4.90% = 9.80%', () => {
    const t = leverageTowers()
    const plainLoss = 100 - t.plain.at(-1)!
    const doubleLoss = 100 - t.double.at(-1)!
    expect(doubleLoss).toBeGreaterThan(2 * plainLoss)
    expect(doubleLoss).toBeCloseTo(18.463, 3)
    expect(plainLoss).toBeCloseTo(4.901, 3)
  })

  it('after each full wave (up + down) the 2× tower is lower than before: 100, 96, 92.16, 88.47, 84.93, 81.54', () => {
    const d = leverageTowers().double
    ;[100, 96, 92.16, 88.4736, 84.934656, 81.53726976].forEach((v, i) => expect(d[2 * i]).toBeCloseTo(v, 8))
  })
})
