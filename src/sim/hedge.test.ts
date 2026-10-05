import { describe, expect, it } from 'vitest'
import { universe } from '../data'
import { HEDGE, TRADING_DAYS, calmPath, hedgeExample, hedgeRun } from './hedge'

describe('hedge example constant (≈ illustrative; generic inverse ETF, no real ticker)', () => {
  it('0050 with 20 of 100 moved into an inverse ETF; inverse ETF yearly cost 1% is an assumption (✎)', () => {
    expect(HEDGE).toEqual({ base: '0050', hedgePct: 20, inverseFee: 0.01, strikeDrop: 0.1, calmDays: 250, calmRise: 0.1 })
    expect(TRADING_DAYS).toBe(250)
  })
})

describe('calmPath (a steady move spread evenly over the days)', () => {
  it('rise 10% over 250 days: day i = 100 × 1.1^(i ÷ 250); ends at 110', () => {
    const p = calmPath(250, 0.1)
    expect(p).toHaveLength(251)
    expect(p[125]).toBeCloseTo(100 * Math.sqrt(1.1), 10)
    expect(p.at(-1)).toBeCloseTo(110, 10)
    expect(calmPath(3, 0)).toEqual([100, 100, 100, 100])
  })
})

describe('hedgeExample (start 100; 0050 fee from the data, 0.14%)', () => {
  const r = hedgeExample(universe)

  it('uses the verified 0050 expense ratio', () => {
    expect(r.baseFee).toBe(0.0014)
    expect(r.baseFeeVerified).toBe(true)
  })

  it('⚡ strike (one day −10%): plain 100 × 0.9 = 90; hedged 80 × 0.9 + 20 × 1.1 = 72 + 22 = 94 (one day of fees is tiny: × 0.9986^(1/250), × 0.99^(1/250))', () => {
    expect(r.strike.plain).toBeCloseTo(90 * 0.9986 ** (1 / 250), 10)
    expect(r.strike.hedged).toBeCloseTo(72 * 0.9986 ** (1 / 250) + 22 * 0.99 ** (1 / 250), 10)
    expect(r.strike.plain).toBeCloseTo(90, 2)
    expect(r.strike.hedged).toBeCloseTo(94, 2)
    // 損失變小：少掉 10 → 少掉 6
    expect(r.strike.diff).toBeCloseTo(4, 2)
  })

  it('calm flat year (market 0%): plain 100 × 0.9986 = 99.86; hedged 80 × 0.9986 + 20 × 0.99 = 79.888 + 19.8 = 99.688 → costs 0.172 a year', () => {
    expect(r.flat.plain).toBeCloseTo(99.86, 10)
    expect(r.flat.hedged).toBeCloseTo(99.688, 10)
    expect(r.flat.diff).toBeCloseTo(-0.172, 10)
  })

  it('calm rising year (+10% over 250 days): plain 110 × 0.9986 = 109.846; inverse side 20 × (1 − r)^250 × 0.99 with r = 1.1^(1/250) − 1 ≈ 0.00038131 → 20 × 0.909058 × 0.99 = 17.999; hedged 87.877 + 17.999 = 105.876 → costs 3.97', () => {
    const daily = 1.1 ** (1 / 250) - 1
    expect(r.rising.plain).toBeCloseTo(109.846, 10)
    expect(r.rising.hedged).toBeCloseTo(80 * 1.1 * 0.9986 + 20 * (1 - daily) ** 250 * 0.99, 9)
    expect(r.rising.hedged).toBeCloseTo(105.876, 3)
    expect(r.rising.diff).toBeCloseTo(-3.970, 3)
  })

  it('both sides: the hedge helps only in the strike; in calm or rising days it always costs', () => {
    expect(r.strike.diff).toBeGreaterThan(0)
    expect(r.flat.diff).toBeLessThan(0)
    expect(r.rising.diff).toBeLessThan(r.flat.diff)
  })
})

describe('hedgeRun', () => {
  it('hedgePct 0 is the plain tower; hedgePct 50 on a −10% day with no fees: 50 × 0.9 + 50 × 1.1 = 100', () => {
    const z = hedgeRun([100, 90], { hedgePct: 0, baseFee: 0, inverseFee: 0 })
    expect(z.hedged).toBeCloseTo(z.plain, 12)
    expect(hedgeRun([100, 90], { hedgePct: 50, baseFee: 0, inverseFee: 0 }).hedged).toBeCloseTo(100, 10)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => hedgeRun([100, 90], { hedgePct: 120, baseFee: 0, inverseFee: 0 })).toThrow(/hedgePct/)
    expect(() => hedgeRun([100, 90], { hedgePct: 20, baseFee: -0.1, inverseFee: 0 })).toThrow(/baseFee/)
    expect(() => hedgeRun([100, 90], { hedgePct: 20, baseFee: 0, inverseFee: 1 })).toThrow(/inverseFee/)
    expect(() => hedgeRun([], { hedgePct: 20, baseFee: 0, inverseFee: 0 })).toThrow(/path/)
    expect(() => calmPath(1.5, 0.1)).toThrow(/days/)
    expect(() => calmPath(10, -1)).toThrow(/rise/)
  })
})
