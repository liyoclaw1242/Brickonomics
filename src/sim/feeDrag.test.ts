import { describe, expect, it } from 'vitest'
import { universe } from '../data'
import { FEE_DRAG, feeDrag, grow } from './feeDrag'

describe('grow (compound growth with a yearly fee)', () => {
  it('value = principal × (1 + grossReturn)^years × (1 − fee)^years (same rule as fees.valueAfter)', () => {
    // 100 × 1.06^30 × 0.9812^30 = 100 × 5.74349 × 0.56588 = 325.01
    expect(grow(100, 0.06, 0.0188, 30)).toBeCloseTo(100 * 1.06 ** 30 * 0.9812 ** 30, 9)
    expect(grow(100, 0.06, 0.0188, 30)).toBeCloseTo(325.014, 3)
    // 100 × 5.74349 × 0.9986^30 = 100 × 5.74349 × 0.95884 = 550.71
    expect(grow(100, 0.06, 0.0014, 30)).toBeCloseTo(550.710, 3)
    // 沒有費用：100 × 1.06^30 = 574.35
    expect(grow(100, 0.06, 0, 30)).toBeCloseTo(574.349, 3)
    expect(grow(250, 0, 0.01, 1)).toBeCloseTo(247.5, 12) // 250 × 0.99
    expect(grow(100, 0.06, 0.0188, 0)).toBe(100)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => grow(-1, 0.06, 0.01, 30)).toThrow(/principal/)
    expect(() => grow(100, -1, 0.01, 30)).toThrow(/grossReturn/)
    expect(() => grow(100, 0.06, 1, 30)).toThrow(/fee/)
    expect(() => grow(100, 0.06, 0.01, -1)).toThrow(/years/)
  })
})

describe('feeDrag example: active 1.88% vs passive 0.14% for 30 years (fees from the verified data)', () => {
  it('uses JH_BALANCED (1.88%) and 0050 (0.14%) from the snapshot; 6% gross return is an assumption (≈)', () => {
    expect(FEE_DRAG).toMatchObject({ active: 'JH_BALANCED', passive: '0050', principal: 100, grossReturn: 0.06, years: 30 })
    const r = feeDrag(universe)
    expect(r.active.fee).toBe(0.0188)
    expect(r.passive.fee).toBe(0.0014)
    expect(r.active.verified).toBe(true)
    expect(r.passive.verified).toBe(true)
  })

  it('30 years: active 325.01, passive 550.71, no fee 574.35 → the 1.74-point fee gap costs 225.70 (41% of the passive result)', () => {
    const r = feeDrag(universe)
    expect(r.active.value).toBeCloseTo(325.014, 3)
    expect(r.passive.value).toBeCloseTo(550.710, 3)
    expect(r.noFee).toBeCloseTo(574.349, 3)
    // 被費用吃掉的：574.35 − 325.01 = 249.34；574.35 − 550.71 = 23.64
    expect(r.active.lost).toBeCloseTo(249.335, 3)
    expect(r.passive.lost).toBeCloseTo(23.639, 3)
    expect(r.gap).toBeCloseTo(225.696, 3)
  })

  it('unknown asset or missing expense ratio throws', () => {
    expect(() => feeDrag(universe, { ...FEE_DRAG, active: 'NOPE' })).toThrow(/NOPE/)
  })
})
