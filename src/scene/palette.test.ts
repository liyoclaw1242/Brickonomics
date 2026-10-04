import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import type { Asset } from '../data/schema'
import { lookFor, basketLooks, productLooks, SECTOR_COLORS, ACCENT_COLORS, colorForKey } from './palette'

const a = (id: string, type: Asset['type'], sector?: string): Asset => ({ id, name: id, type, sector, asOf: '2026-10-03', source: [] })

describe('lookFor', () => {
  it('colors stocks by sector with a matte material', () => {
    expect(lookFor(a('S', 'stock', 'semiconductor'))).toEqual({ color: SECTOR_COLORS.semiconductor, kind: 'matte' })
  })

  it('falls back for unknown sectors', () => {
    expect(lookFor(a('S', 'stock', 'mystery')).kind).toBe('matte')
  })

  it('uses material to show bond credit quality', () => {
    expect(lookFor(a('G', 'govBond')).kind).toBe('diamond')
    expect(lookFor(a('C', 'corpBond')).kind).toBe('metal')
    expect(lookFor(a('H', 'highYieldBond')).kind).toBe('glass')
    expect(lookFor(a('AU', 'gold')).kind).toBe('gold')
  })
})

describe('basketLooks', () => {
  it('keeps the first color and shifts later duplicates', () => {
    const looks = basketLooks([a('A', 'stock', 'semiconductor'), a('B', 'stock', 'semiconductor')])
    expect(looks[0]?.color).toBe(SECTOR_COLORS.semiconductor)
    expect(looks[1]?.color).not.toBe(looks[0]?.color)
    expect(looks[1]?.kind).toBe('matte')
  })

  it('gives every holding a distinct color in every real basket', () => {
    for (const p of universe.values()) {
      if (!p.holdings) continue
      const colors = productLooks(universe, p.id).map((l) => l.color)
      expect(new Set(colors).size, p.id).toBe(colors.length)
    }
  })
})

describe('productLooks', () => {
  it('follows the holdings order', () => {
    const looks = productLooks(universe, '0050')
    expect(looks).toHaveLength(universe.get('0050')!.holdings!.length)
    expect(looks[0]?.color).toBe(SECTOR_COLORS.semiconductor) // 2330
  })

  it('throws for non-baskets', () => {
    expect(() => productLooks(universe, '2330')).toThrow('not a basket: 2330')
  })
})

describe('colorForKey', () => {
  it('maps coin and loss to the accent colours', () => {
    expect(colorForKey(universe, 'coin')).toBe(ACCENT_COLORS.coin)
    expect(colorForKey(universe, 'loss')).toBe(ACCENT_COLORS.loss)
  })

  it('maps sector ids to their sector colour', () => {
    expect(colorForKey(universe, 'semiconductor')).toBe(SECTOR_COLORS.semiconductor)
  })

  it('maps holding and asset ids to their block colour', () => {
    expect(colorForKey(universe, '2330')).toBe(lookFor(universe.get('2330')!).color)
    expect(colorForKey(universe, 'CONVERTIBLE_US')).toBe(lookFor(universe.get('CONVERTIBLE_US')!).color)
  })

  it('returns undefined for unknown keys', () => {
    expect(colorForKey(universe, 'nope')).toBeUndefined()
    expect(colorForKey(universe, 'toString')).toBeUndefined()
  })
})
