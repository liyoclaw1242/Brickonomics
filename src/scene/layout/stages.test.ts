import { describe, it, expect } from 'vitest'
import {
  blocksFor, towerVoxels, exDivTimeline, exDivBands, accumulateVsPayout, principalTrap,
  illustrativeTicks, layerCentroid, damageFromShocks,
} from './stages'
import { stackVoxels } from './voxels'

describe('blocks', () => {
  it('converts value to blocks (2 per block) and builds a tower', () => {
    expect(blocksFor(100)).toBe(50)
    expect(blocksFor(97)).toBe(49) // 48.5 → 49
    expect(towerVoxels(30, 5, 5)).toHaveLength(30)
    expect(() => blocksFor(-1)).toThrow(RangeError)
  })
})

describe('exDivTimeline', () => {
  it('pays out at phase 0.5 and conserves value at that moment', () => {
    expect(exDivTimeline(0.25, 'fill')).toEqual({ blockValue: 100, cash: 0 })
    expect(exDivTimeline(0.5, 'fill')).toEqual({ blockValue: 95, cash: 5 })
  })

  it('fills back to 100 or gaps down to 92 by phase 1', () => {
    expect(exDivTimeline(0.75, 'fill').blockValue).toBeCloseTo(97.5)
    expect(exDivTimeline(1, 'fill')).toEqual({ blockValue: 100, cash: 5 })
    expect(exDivTimeline(1, 'gap')).toEqual({ blockValue: 92, cash: 5 })
  })

  it('clamps phase into [0, 1]', () => {
    expect(exDivTimeline(-1, 'fill')).toEqual({ blockValue: 100, cash: 0 })
    expect(exDivTimeline(2, 'gap')).toEqual({ blockValue: 92, cash: 5 })
  })
})

describe('accumulateVsPayout (illustrative)', () => {
  it('starts equal', () => {
    const r = accumulateVsPayout(0)
    expect(r.accumulate.value).toBe(100)
    expect(r.payout.total).toBe(100)
  })

  it('compounds faster when income is reinvested', () => {
    const r = accumulateVsPayout(10)
    expect(r.accumulate.value).toBeCloseTo(196.715, 2) // 100 × 1.07^10
    expect(r.payout.value).toBeCloseTo(134.392, 2) // 100 × 1.03^10
    expect(r.payout.cashReceived).toBeCloseTo(45.856, 2) // 4 × (1.03^10 − 1) / 0.03
    expect(r.payout.total).toBeLessThan(r.accumulate.value)
  })
})

describe('principalTrap (illustrative)', () => {
  it('pays 6% while earning 3%, shrinking the tower', () => {
    const one = principalTrap(1)
    expect(one.value).toBeCloseTo(97)
    expect(one.cashReceived).toBeCloseTo(6)
    expect(one.fromPrincipal).toBeCloseTo(3)
    const ten = principalTrap(10)
    expect(ten.value).toBeCloseTo(73.742, 2) // 100 × 0.97^10
    expect(ten.cashReceived).toBeCloseTo(52.515, 2) // 6 × (1 − 0.97^10) / 0.03
    expect(ten.fromPrincipal).toBeCloseTo(26.258, 2)
  })
})

describe('illustrativeTicks', () => {
  it('is deterministic, positive and the right length', () => {
    const a = illustrativeTicks(50, 100)
    expect(a).toEqual(illustrativeTicks(50, 100))
    expect(a).toHaveLength(100)
    expect(a[0]).toBe(100)
    expect(Math.min(...a)).toBeGreaterThan(0)
    expect(illustrativeTicks(51, 100)).not.toEqual(a)
  })
})

describe('layerCentroid', () => {
  const v = stackVoxels([{ id: 'a', count: 4 }, { id: 'b', count: 4 }], 2, 2)

  it('averages a group, including the explode offset', () => {
    expect(layerCentroid(v, 0, 2, 2, 0, 2)).toEqual([0, 0.5, 0])
    const c = layerCentroid(v, 1, 2, 2, 1, 2)!
    expect(c[1]).toBeCloseTo(1.5 + 1.5) // y 1.5 + group 1 × gap 1.5
  })

  it('returns null for an empty group', () => {
    expect(layerCentroid(v, 5, 2, 2, 0, 2)).toBeNull()
  })
})

describe('damageFromShocks', () => {
  it('turns negative shocks into knock-out fractions and ignores gains', () => {
    expect(damageFromShocks({ '2330': -0.3, NVDA: 0.2 })).toEqual({ '2330': 0.3 })
    expect(damageFromShocks({ X: -1.5 })).toEqual({ X: 1 })
  })
})

describe('exDivBands (what the block lost, drawn above it)', () => {
  it('before the payout nothing is missing', () => {
    expect(exDivBands(100, 0)).toEqual({ gold: null, red: null })
  })
  it('at the payout the gold band is exactly the coins: 95 → 100', () => {
    expect(exDivBands(95, 5)).toEqual({ gold: [95, 100], red: null })
  })
  it('when the block does not grow back, the red band is the extra loss: 92 → 95', () => {
    expect(exDivBands(92, 5)).toEqual({ gold: [95, 100], red: [92, 95] })
  })
  it('when the block grows back the gold band shrinks', () => {
    expect(exDivBands(97.5, 5)).toEqual({ gold: [97.5, 100], red: null })
    expect(exDivBands(100, 5)).toEqual({ gold: null, red: null })
  })
})
