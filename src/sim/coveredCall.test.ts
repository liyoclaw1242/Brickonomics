import { describe, expect, it } from 'vitest'
import { COVERED_CALL, coveredCall } from './coveredCall'

describe('COVERED_CALL example constant (≈ illustrative, not a real fund)', () => {
  it('ceiling +5%, premium 2%; the slider runs from −20% to +20% in 1% steps', () => {
    expect(COVERED_CALL).toEqual({ cap: 0.05, premium: 0.02, minMovePct: -20, maxMovePct: 20, illustrative: true })
  })
})

describe('coveredCall (one period; plain = move; covered = min(move, cap) + premium)', () => {
  const { cap, premium } = COVERED_CALL

  it('big rise +20%: plain +20%; covered min(0.20, 0.05) + 0.02 = +7%; the 15% above the ceiling is sold away', () => {
    const r = coveredCall({ move: 0.2, cap, premium })
    expect(r.plain).toBeCloseTo(0.2, 12)
    expect(r.covered).toBeCloseTo(0.07, 12)
    expect(r.cut).toBeCloseTo(0.15, 12)
    expect(r.diff).toBeCloseTo(0.07 - 0.2, 12) // −13%：大漲少賺
  })

  it('flat 0%: plain 0; covered 0 + 0.02 = +2% (only the premium); nothing cut', () => {
    const r = coveredCall({ move: 0, cap, premium })
    expect(r.plain).toBe(0)
    expect(r.covered).toBeCloseTo(0.02, 12)
    expect(r.cut).toBe(0)
    expect(r.diff).toBeCloseTo(0.02, 12)
  })

  it('fall −20%: plain −20%; covered −0.20 + 0.02 = −18% (still falls, cushioned only by the premium)', () => {
    const r = coveredCall({ move: -0.2, cap, premium })
    expect(r.plain).toBeCloseTo(-0.2, 12)
    expect(r.covered).toBeCloseTo(-0.18, 12)
    expect(r.cut).toBe(0)
    expect(r.diff).toBeCloseTo(0.02, 12)
  })

  it('move exactly at the ceiling (+5%): plain +5%; covered 0.05 + 0.02 = +7%; cut 0', () => {
    const r = coveredCall({ move: cap, premium, cap })
    expect(r.plain).toBe(0.05)
    expect(r.covered).toBeCloseTo(0.07, 12)
    expect(r.cut).toBe(0)
  })

  it('break-even: covered beats plain exactly while move < cap + premium (= +7%)', () => {
    expect(coveredCall({ move: 0.069, cap, premium }).diff).toBeGreaterThan(0)
    expect(coveredCall({ move: 0.07, cap, premium }).diff).toBeCloseTo(0, 12)
    expect(coveredCall({ move: 0.071, cap, premium }).diff).toBeLessThan(0)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => coveredCall({ move: -1, cap, premium })).toThrow(/move/)
    expect(() => coveredCall({ move: Number.NaN, cap, premium })).toThrow(/move/)
    expect(() => coveredCall({ move: 0, cap: -0.01, premium })).toThrow(/cap/)
    expect(() => coveredCall({ move: 0, cap, premium: 1 })).toThrow(/premium/)
    expect(() => coveredCall({ move: 0, cap, premium: -0.01 })).toThrow(/premium/)
  })
})
