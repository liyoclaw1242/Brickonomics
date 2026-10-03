import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { applyShrink, buildingHeight, cityLayout, islandSize, buildingVoxels, ISLAND_CENTERS, HEIGHT } from './city'

describe('buildingHeight', () => {
  it('is logarithmic in market cap (USD billions)', () => {
    expect(buildingHeight(10)).toBe(2) // 2 + 6*log10(1)
    expect(buildingHeight(100)).toBe(8) // 2 + 6*1
    expect(buildingHeight(1000)).toBe(14) // 2 + 6*2
    expect(buildingHeight(5000)).toBe(18) // 2 + 6*2.699 = 18.19
  })

  it('never goes below the minimum and uses a fallback when unknown', () => {
    expect(buildingHeight(1)).toBe(HEIGHT.min)
    expect(buildingHeight(undefined)).toBe(HEIGHT.fallback)
  })

  it('rejects non-positive caps', () => {
    expect(() => buildingHeight(0)).toThrow(RangeError)
    expect(() => buildingHeight(Number.NaN)).toThrow(RangeError)
  })
})

describe('cityLayout', () => {
  const assets = [...universe.values()]
  const placements = cityLayout(assets)

  it('places every TW/US stock exactly once', () => {
    const stocks = assets.filter((a) => a.type === 'stock' && (a.region === 'TW' || a.region === 'US'))
    expect(placements).toHaveLength(stocks.length)
    expect(new Set(placements.map((p) => p.id)).size).toBe(stocks.length)
  })

  it('puts Taiwan on the west island and the US on the east', () => {
    for (const p of placements) {
      if (p.region === 'TW') expect(p.x, p.id).toBeLessThan(0)
      else expect(p.x, p.id).toBeGreaterThan(0)
    }
  })

  it('never puts two buildings on the same spot', () => {
    const spots = placements.map((p) => `${p.x},${p.z}`)
    expect(new Set(spots).size).toBe(spots.length)
  })

  it('orders each island tallest first', () => {
    for (const region of ['TW', 'US'] as const) {
      const hs = placements.filter((p) => p.region === region).map((p) => p.height)
      expect(hs[0]).toBe(Math.max(...hs))
    }
  })

  it('keeps buildings inside their island', () => {
    for (const region of ['TW', 'US'] as const) {
      const list = placements.filter((p) => p.region === region)
      const half = islandSize(list.length) / 2
      const [cx, cz] = ISLAND_CENTERS[region]
      for (const p of list) {
        expect(Math.abs(p.x - cx) + 1, p.id).toBeLessThanOrEqual(half)
        expect(Math.abs(p.z - cz) + 1, p.id).toBeLessThanOrEqual(half)
      }
    }
  })
})

describe('buildingVoxels', () => {
  it('builds a 2x2 column of height h for each building', () => {
    const v = buildingVoxels([{ id: 'A', region: 'TW', x: 0, z: 0, height: 3 }])
    expect(v).toHaveLength(12)
    expect(new Set(v.map((b) => b.x))).toEqual(new Set([-0.5, 0.5]))
    expect(Math.max(...v.map((b) => b.y))).toBe(2.5)
  })
})

describe('applyShrink', () => {
  const ps = [
    { id: '2330', region: 'TW' as const, x: 0, z: 0, height: 16 },
    { id: 'NVDA', region: 'US' as const, x: 4, z: 0, height: 19 },
  ]

  it('shrinks only the listed buildings, rounding and keeping at least one layer', () => {
    const out = applyShrink(ps, { '2330': 0.3 })
    expect(out[0]!.height).toBe(11) // round(16 × 0.7) = round(11.2)
    expect(out[1]!.height).toBe(19)
    expect(applyShrink(ps, { '2330': 1 })[0]!.height).toBe(1)
  })
})
