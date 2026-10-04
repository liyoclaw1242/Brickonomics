import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { overlap } from '../sim/overlap'
import { makeTextContext, pct0, signedPct } from './context'

describe('text context', () => {
  const c = makeTextContext(universe)

  it('looks up holding weights and throws on unknown pairs', () => {
    expect(c.weightPct('0050', '2330')).toBe(56.31)
    expect(() => c.weightPct('0050', 'NVDA')).toThrow('no holding NVDA in 0050')
  })

  it('computes the 2330 -30% shock', () => {
    expect(c.shock('0050')).toBeCloseTo(-0.16893, 5) // -0.3 * 56.31 / 100
    expect(c.shock('SPY')).toBe(0)
  })

  it('reports sector weights for a product', () => {
    expect(c.sectorPct('QQQ', 'semiconductor')).toBeCloseTo(13.35, 6)
    expect(c.sectorPct('QQQ', 'finance')).toBe(0)
  })

  it('reads expense ratios and returns undefined when there is none', () => {
    expect(c.expenseRatio('QQQ')).toBe(universe.get('QQQ')!.fees!.expenseRatio)
    expect(c.expenseRatio('2330')).toBeUndefined()
    expect(c.expenseRatio('NOPE')).toBeUndefined()
  })

  it('reports the shared overlap of two baskets as a fraction', () => {
    const v = c.overlapShared('QQQ', 'SPY')
    expect(v).toBe(overlap(universe, 'QQQ', 'SPY').total)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThanOrEqual(1)
    expect(c.overlapShared('0050', 'SPY')).toBe(0)
  })
})

describe('formatting', () => {
  it('pct0 rounds percentages', () => {
    expect(pct0(57.35)).toBe('57')
    expect(pct0(31.98)).toBe('32')
  })

  it('signedPct uses a real minus sign and one decimal', () => {
    expect(signedPct(-0.17205)).toBe('−17.2%')
    expect(signedPct(0)).toBe('0.0%')
    expect(signedPct(0.05)).toBe('+5.0%')
  })
})
