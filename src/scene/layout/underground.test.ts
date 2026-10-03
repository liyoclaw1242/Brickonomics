import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { parseUniverse } from '../../data/universe'
import { T } from '../../ui/strings'
import { SECTORS, LAYER_THICKNESS, GROUND_TOP, strataLayout, goldVein, sectorBreakdown, coreDiscs, unclassifiedStub } from './underground'

describe('strataLayout', () => {
  it('stacks one layer per sector from the ground down', () => {
    const s = strataLayout()
    expect(s.map((l) => l.sector)).toEqual([...SECTORS])
    expect(s[0]!.top).toBe(GROUND_TOP)
    expect(s[0]!.bottom).toBeCloseTo(GROUND_TOP - LAYER_THICKNESS)
    expect(s[5]!.bottom).toBeCloseTo(GROUND_TOP - 6 * LAYER_THICKNESS) // -15.6
  })

  it('puts the gold vein below the last layer', () => {
    const g = goldVein()
    expect(g.top).toBeCloseTo(GROUND_TOP - 6 * LAYER_THICKNESS - 0.4) // -16.0
    expect(g.bottom).toBeCloseTo(g.top - 1)
  })
})

describe('sectorBreakdown', () => {
  it('groups QQQ named holdings by sector and leaves the rest unclassified', () => {
    // NVDA 8.33 + MU 5.02 = 13.35 半導體；AAPL 7.35 電子；MSFT 5.76 軟體；TSLA 2.82 汽車；其他 70.72
    expect(sectorBreakdown(universe, 'QQQ')).toEqual([
      { sector: 'semiconductor', weightPct: expect.closeTo(13.35, 6) },
      { sector: 'electronics', weightPct: expect.closeTo(7.35, 6) },
      { sector: 'software', weightPct: expect.closeTo(5.76, 6) },
      { sector: 'auto', weightPct: expect.closeTo(2.82, 6) },
      { sector: 'unclassified', weightPct: expect.closeTo(70.72, 6) },
    ])
  })

  it('treats bonds, cash and unknown sectors as unclassified', () => {
    const u = parseUniverse([
      { id: 'A', name: 'A', type: 'stock', sector: 'semiconductor', asOf: '2026-10-03', source: [] },
      { id: 'B', name: 'B', type: 'stock', sector: 'mystery', asOf: '2026-10-03', source: [] },
      { id: 'G', name: 'G', type: 'govBond', asOf: '2026-10-03', source: [] },
      { id: 'F', name: 'F', type: 'fund', holdings: [{ id: 'A', weightPct: 50 }, { id: 'B', weightPct: 20 }, { id: 'G', weightPct: 30 }], asOf: '2026-10-03', source: ['x'] },
    ])
    expect(sectorBreakdown(u, 'F')).toEqual([
      { sector: 'semiconductor', weightPct: expect.closeTo(50, 6) },
      { sector: 'unclassified', weightPct: expect.closeTo(50, 6) },
    ])
  })
})

describe('T.sectors', () => {
  it('has exactly the sectors plus unclassified', () => {
    expect(Object.keys(T.sectors)).toEqual([...SECTORS, 'unclassified'])
  })
})

describe('coreDiscs', () => {
  const layers = strataLayout()
  it('has one disc per stratum with the same top and bottom', () => {
    const d = coreDiscs([])
    expect(d.map((x) => x.sector)).toEqual([...SECTORS])
    d.forEach((x, i) => {
      expect(x.top).toBe(layers[i]!.top)
      expect(x.bottom).toBe(layers[i]!.bottom)
    })
  })

  it('maps weight to radius with a square root between 0.25 and 2.2', () => {
    const d = coreDiscs([
      { sector: 'semiconductor', weightPct: 100 }, // 0.25 + 1.95 × 1 = 2.2
      { sector: 'electronics', weightPct: 25 }, // 0.25 + 1.95 × 0.5 = 1.225
      { sector: 'software', weightPct: 16 }, // 0.25 + 1.95 × 0.4 = 1.03
    ])
    expect(d[0]!.radius).toBeCloseTo(2.2, 9)
    expect(d[1]!.radius).toBeCloseTo(1.225, 9)
    expect(d[2]!.radius).toBeCloseTo(1.03, 9)
  })

  it('leaves a thin rod where the product has no weight in that sector', () => {
    const d = coreDiscs([{ sector: 'semiconductor', weightPct: 63.02 }])
    expect(d[5]!.sector).toBe('finance')
    expect(d[5]!.radius).toBe(0.25)
    // 0050：0.25 + 1.95 × √0.6302 = 0.25 + 1.95 × 0.793851 ≈ 1.79802
    expect(d[0]!.radius).toBeCloseTo(1.79802, 4)
  })

  it('ignores the unclassified row (it is not a stratum)', () => {
    const d = coreDiscs([{ sector: 'unclassified', weightPct: 70 }])
    expect(d.every((x) => x.radius === 0.25)).toBe(true)
  })

  it('0050 keeps a 0.25 rod in the finance layer (snapshot has no finance classification)', () => {
    const d = coreDiscs(sectorBreakdown(universe, '0050'))
    expect(d.find((x) => x.sector === 'finance')!.radius).toBe(0.25)
    expect(d.find((x) => x.sector === 'electronics')!.radius).toBeCloseTo(0.25 + 1.95 * Math.sqrt(0.0617), 9) // ≈ 0.7343
  })
})

describe('unclassifiedStub', () => {
  it('height is proportional to the unclassified weight, capped at 4', () => {
    expect(unclassifiedStub([{ sector: 'unclassified', weightPct: 50 }])).toEqual({ weightPct: 50, height: 2 })
    expect(unclassifiedStub([{ sector: 'unclassified', weightPct: 100 }]).height).toBe(4)
    expect(unclassifiedStub([{ sector: 'unclassified', weightPct: 250 }]).height).toBe(4)
  })
  it('is empty when nothing is unclassified', () => {
    expect(unclassifiedStub([{ sector: 'auto', weightPct: 10 }])).toEqual({ weightPct: 0, height: 0 })
  })
  it('QQQ: 70.72% → 4 × 0.7072 = 2.8288', () => {
    expect(unclassifiedStub(sectorBreakdown(universe, 'QQQ')).height).toBeCloseTo(2.8288, 6)
  })
})
