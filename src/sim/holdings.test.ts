import { describe, it, expect } from 'vitest'
import { parseUniverse } from '../data/universe'
import { flatten } from './holdings'

const s = (id: string) => ({ id, name: id, type: 'stock', asOf: '2026-10-01', source: [] })
const b = (id: string, type: 'etf' | 'fund', holdings: { id: string; weightPct: number }[]) => ({
  id, name: id, type, holdings, asOf: '2026-10-01', source: ['x'],
})

const u = parseUniverse([
  s('A'),
  s('B'),
  b('E', 'etf', [{ id: 'A', weightPct: 40 }, { id: 'B', weightPct: 60 }]),
  b('F', 'fund', [{ id: 'E', weightPct: 50 }, { id: 'A', weightPct: 50 }]),
])

describe('flatten', () => {
  it('returns the asset itself for a leaf', () => {
    expect([...flatten(u, 'A')]).toEqual([['A', 1]])
  })

  it('converts percent weights to fractions', () => {
    const e = flatten(u, 'E')
    expect(e.get('A')).toBeCloseTo(0.4)
    expect(e.get('B')).toBeCloseTo(0.6)
  })

  it('merges nested exposure to the same leaf', () => {
    const f = flatten(u, 'F')
    expect(f.get('A')).toBeCloseTo(0.7) // 0.5 * 0.4 + 0.5
    expect(f.get('B')).toBeCloseTo(0.3)
    expect(f.has('E')).toBe(false)
  })

  it('throws on unknown ids', () => {
    expect(() => flatten(u, 'NOPE')).toThrow('unknown asset NOPE')
  })
})
