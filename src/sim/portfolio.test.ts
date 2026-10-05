import { describe, expect, it } from 'vitest'
import { STORM, stressTest } from './portfolio'

describe('stressTest (portfolio tower in a storm; start 100)', () => {
  it('example storm: stocks −40%, bonds +5% (≈ illustrative)', () => {
    expect(STORM).toEqual({ stock: -0.4, bond: 0.05 })
  })

  it('60% stocks: 60 × (1 − 0.4) + 40 × (1 + 0.05) = 36 + 42 = 78 → loses 22%', () => {
    const r = stressTest({ stockPct: 60, scenario: STORM })
    expect(r.stock).toBeCloseTo(36, 12)
    expect(r.bond).toBeCloseTo(42, 12)
    expect(r.remaining).toBeCloseTo(78, 12)
    expect(r.lossPct).toBeCloseTo(22, 12)
  })

  it('100% stocks: 100 × 0.6 = 60 → loses 40%; 0% stocks: 100 × 1.05 = 105 → gains 5% (lossPct −5)', () => {
    expect(stressTest({ stockPct: 100, scenario: STORM }).remaining).toBeCloseTo(60, 12)
    expect(stressTest({ stockPct: 100, scenario: STORM }).lossPct).toBeCloseTo(40, 12)
    expect(stressTest({ stockPct: 0, scenario: STORM }).remaining).toBeCloseTo(105, 12)
    expect(stressTest({ stockPct: 0, scenario: STORM }).lossPct).toBeCloseTo(-5, 12)
  })

  it('fewer stocks → a smaller loss in this storm (each 10 points of stock: 10 × (0.4 + 0.05) = 4.5 less loss)', () => {
    const loss = [0, 20, 40, 60, 80, 100].map((s) => stressTest({ stockPct: s, scenario: STORM }).lossPct)
    for (let i = 1; i < loss.length; i++) expect(loss[i]! - loss[i - 1]!).toBeCloseTo(9, 12) // 20 points × 0.45
  })

  it('a storm where bonds also fall (stocks −20%, bonds −10%), 50/50: 50 × 0.8 + 50 × 0.9 = 85', () => {
    expect(stressTest({ stockPct: 50, scenario: { stock: -0.2, bond: -0.1 } }).remaining).toBeCloseTo(85, 12)
  })

  it('rejects bad inputs, naming the parameter', () => {
    expect(() => stressTest({ stockPct: 101, scenario: STORM })).toThrow(/stockPct/)
    expect(() => stressTest({ stockPct: -1, scenario: STORM })).toThrow(/stockPct/)
    expect(() => stressTest({ stockPct: 50, scenario: { stock: -1, bond: 0 } })).toThrow(/stock/)
    expect(() => stressTest({ stockPct: 50, scenario: { stock: 0, bond: NaN } })).toThrow(/bond/)
  })
})

describe('fix round: a storm where stocks and bonds fall together (like 2022, example numbers)', () => {
  it('STORMS lists the two example storms; 60/40 in the both-fall storm: 60 × 0.75 + 40 × 0.85 = 79 (loses 21)', async () => {
    const { STORMS, stressTest: st } = await import('./portfolio')
    expect(STORMS).toEqual([{ stock: -0.4, bond: 0.05 }, { stock: -0.25, bond: -0.15 }])
    expect(st({ stockPct: 60, scenario: STORMS[1]! }).remaining).toBeCloseTo(79, 12)
    expect(st({ stockPct: 20, scenario: STORMS[1]! }).lossPct).toBeCloseTo(17, 12) // 15 + 68 = 83
  })
})
