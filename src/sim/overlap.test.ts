import { describe, it, expect } from 'vitest'
import { parseUniverse } from '../data/universe'
import { universe } from '../data'
import { overlap } from './overlap'

const s = (id: string, type = 'stock') => ({ id, name: id, type, asOf: '2026-10-01', source: [] })
const e = (id: string, holdings: { id: string; weightPct: number }[]) => ({
  id, name: id, type: 'etf', holdings, asOf: '2026-10-01', source: ['x'],
})

describe('overlap', () => {
  const u = parseUniverse([
    s('X'),
    s('Y'),
    s('Z'),
    s('O', 'other'),
    e('P', [{ id: 'X', weightPct: 10 }, { id: 'Y', weightPct: 5 }, { id: 'O', weightPct: 85 }]),
    e('Q', [{ id: 'X', weightPct: 8 }, { id: 'Z', weightPct: 2 }, { id: 'O', weightPct: 90 }]),
  ])

  it('reports shared exposure as min of both sides and ignores buckets', () => {
    const r = overlap(u, 'P', 'Q')
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]?.id).toBe('X')
    expect(r.rows[0]?.a).toBeCloseTo(0.1)
    expect(r.rows[0]?.b).toBeCloseTo(0.08)
    expect(r.rows[0]?.shared).toBeCloseTo(0.08)
    expect(r.total).toBeCloseTo(0.08)
  })

  it('finds NVDA shared by QQQ and SPY in the real snapshot', () => {
    const r = overlap(universe, 'QQQ', 'SPY')
    expect(r.rows.map((x) => x.id)).toEqual(['NVDA', 'AAPL', 'MSFT', 'TSLA'])
    expect(r.rows[0]?.shared).toBeCloseTo(0.0833)
  })
})
