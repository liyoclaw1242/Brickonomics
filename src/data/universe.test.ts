import { describe, it, expect } from 'vitest'
import { parseUniverse, UniverseError } from './universe'

const stock = (id: string) => ({ id, name: id, type: 'stock', asOf: '2026-10-01', source: [] })
const basket = (id: string, holdings: { id: string; weightPct: number }[]) => ({
  id, name: id, type: 'etf', holdings, asOf: '2026-10-01', source: ['https://example.com'],
})

function errorsOf(raw: unknown[]): string[] {
  try {
    parseUniverse(raw)
  } catch (e) {
    if (e instanceof UniverseError) return e.errors
    throw e
  }
  return []
}

describe('parseUniverse', () => {
  it('accepts a valid universe and indexes by id', () => {
    const u = parseUniverse([stock('A'), stock('B'), basket('E', [{ id: 'A', weightPct: 60 }, { id: 'B', weightPct: 40 }])])
    expect(u.size).toBe(3)
    expect(u.get('E')?.holdings?.[0]?.weightPct).toBe(60)
  })

  it('rejects schema violations with the item index', () => {
    const errs = errorsOf([{ id: 'A', name: 'A', type: 'stock', asOf: '2026/10/01', source: [] }])
    expect(errs[0]).toMatch(/^#0: asOf/)
  })

  it('rejects duplicate ids', () => {
    expect(errorsOf([stock('A'), stock('A')])).toContain('duplicate id A')
  })

  it('rejects holdings that reference unknown ids', () => {
    expect(errorsOf([stock('A'), basket('E', [{ id: 'A', weightPct: 50 }, { id: 'X', weightPct: 50 }])]))
      .toContain('E: unknown holding X')
  })

  it('rejects baskets whose weights do not sum to 100 ± 0.5', () => {
    const errs = errorsOf([stock('A'), basket('E', [{ id: 'A', weightPct: 98 }])])
    expect(errs[0]).toMatch(/^E: holdings sum 98\.00%/)
  })

  it('tolerates rounding within 0.5%', () => {
    expect(() => parseUniverse([stock('A'), stock('B'), basket('E', [{ id: 'A', weightPct: 60.3 }, { id: 'B', weightPct: 40 }])])).not.toThrow()
  })

  it('accepts a sum of exactly 100.5 even when floating point gives 100.50000000000001', () => {
    // 30.1 + 33.95 + 36.45 = 100.5 in decimal (|sum - 100| = 0.5, on the boundary);
    // summed in binary floating point it is 100.50000000000001, so a bare `> 0.5` would reject it
    const raw = [stock('A'), stock('B'), stock('C'),
      basket('E', [{ id: 'A', weightPct: 30.1 }, { id: 'B', weightPct: 33.95 }, { id: 'C', weightPct: 36.45 }])]
    expect(() => parseUniverse(raw)).not.toThrow()
    // 30.1 + 33.95 + 36.55 = 100.6 -> clearly outside the tolerance
    expect(errorsOf([stock('A'), stock('B'), stock('C'),
      basket('E', [{ id: 'A', weightPct: 30.1 }, { id: 'B', weightPct: 33.95 }, { id: 'C', weightPct: 36.55 }])])[0]).toMatch(/holdings sum/)
  })

  it('rejects duplicate holding ids within one basket', () => {
    expect(errorsOf([stock('A'), basket('E', [{ id: 'A', weightPct: 50 }, { id: 'A', weightPct: 50 }])]))
      .toContain('E: duplicate holding A')
  })

  it('rejects unknown verified keys', () => {
    const errs = errorsOf([{ ...stock('A'), verified: { fee: true } }])
    expect(errs[0]).toMatch(/^#0: verified/)
    expect(() => parseUniverse([{ ...stock('A'), verified: { 'fees.cdsc': true } }])).not.toThrow()
  })

  it('rejects baskets without holdings and non-baskets with holdings', () => {
    const errs = errorsOf([
      { ...stock('S'), holdings: [{ id: 'S', weightPct: 100 }] },
      { id: 'E', name: 'E', type: 'etf', asOf: '2026-10-01', source: [] },
    ])
    expect(errs).toHaveLength(2)
  })

  it('rejects holding cycles', () => {
    const errs = errorsOf([basket('E1', [{ id: 'E2', weightPct: 100 }]), basket('E2', [{ id: 'E1', weightPct: 100 }])])
    expect(errs.some((e) => e.startsWith('cycle:'))).toBe(true)
  })

  it('accepts a positive marketCapUsdB and rejects a negative one', () => {
    expect(() => parseUniverse([{ ...stock('A'), marketCapUsdB: 1200 }])).not.toThrow()
    expect(errorsOf([{ ...stock('A'), marketCapUsdB: -1 }])[0]).toMatch(/^#0: marketCapUsdB/)
  })

  it('accepts the marketCap verified key', () => {
    expect(() => parseUniverse([{ ...stock('A'), verified: { marketCap: true } }])).not.toThrow()
  })
})
