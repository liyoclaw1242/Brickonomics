import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { shockImpact } from './scenario'

describe('shockImpact', () => {
  it('2330 -30% moves 0050 by about -16.9%', () => {
    expect(shockImpact(universe, '0050', { '2330': -0.3 })).toBeCloseTo(-0.16893, 5) // -0.3 * 56.31 / 100
  })

  it('the same shock barely moves 安聯台灣大壩', () => {
    expect(shockImpact(universe, 'ALLIANZ_TAIWAN', { '2330': -0.3 })).toBeCloseTo(-0.01461, 5)
  })

  it('a stock held directly takes the full shock', () => {
    expect(shockImpact(universe, '2330', { '2330': -0.3 })).toBeCloseTo(-0.3)
  })

  it('combines multiple shocks and ignores unrelated assets', () => {
    // SPY: NVDA 8.45% * -0.2 + TSLA 1.51% * -0.5 = -0.0169 - 0.00755
    expect(shockImpact(universe, 'SPY', { NVDA: -0.2, TSLA: -0.5, '2330': -0.9 })).toBeCloseTo(-0.02445, 5)
  })

  it('rejects shocks that are not finite or below -1', () => {
    expect(() => shockImpact(universe, 'SPY', { NVDA: -1.5 })).toThrow(RangeError)
    expect(() => shockImpact(universe, 'SPY', { NVDA: -1.5 })).toThrow(/shocks\[NVDA\]/)
    expect(() => shockImpact(universe, 'SPY', { NVDA: NaN })).toThrow(/shocks\[NVDA\]/)
    expect(() => shockImpact(universe, 'SPY', { NVDA: -1 })).not.toThrow()
  })
})
