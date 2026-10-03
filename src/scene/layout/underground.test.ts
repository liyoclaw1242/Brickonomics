import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { parseUniverse } from '../../data/universe'
import { SECTORS, LAYER_THICKNESS, GROUND_TOP, strataLayout, goldVein, sectorBreakdown, coreSegments } from './underground'

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

describe('coreSegments', () => {
  it('splits the core height by weight from the top down', () => {
    expect(coreSegments([{ sector: 'semiconductor', weightPct: 60 }, { sector: 'unclassified', weightPct: 40 }], 10)).toEqual([
      { sector: 'semiconductor', top: 0, bottom: -6 },
      { sector: 'unclassified', top: -6, bottom: -10 },
    ])
  })

  it('normalises when weights do not sum to 100', () => {
    const seg = coreSegments([{ sector: 'auto', weightPct: 1 }, { sector: 'finance', weightPct: 3 }], 8)
    expect(seg[0]!.bottom).toBeCloseTo(-2)
    expect(seg[1]!.bottom).toBeCloseTo(-8)
  })
})
