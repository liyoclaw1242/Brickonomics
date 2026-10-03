import { describe, it, expect } from 'vitest'
import { universe, SNAPSHOT_DATE } from './index'

const weightOf = (basketId: string, holdingId: string) =>
  universe.get(basketId)?.holdings?.find((h) => h.id === holdingId)?.weightPct

describe('snapshot', () => {
  it('loads and validates', () => {
    expect(SNAPSHOT_DATE).toBe('2026-10-03')
    expect(universe.size).toBeGreaterThan(20)
  })

  it('contains the products named in the spec', () => {
    for (const id of ['2330', 'NVDA', 'TSLA', '0050', 'QQQ', 'SPY', 'ALLIANZ_TAIWAN', 'JH_BALANCED', 'SCHRODER_GLOBAL_INCOME_BOND', 'ALLIANZ_INCOME_GROWTH', 'GOLD']) {
      expect(universe.has(id), id).toBe(true)
    }
  })

  it('keeps the key teaching facts', () => {
    expect(weightOf('0050', '2330')).toBe(57.35)
    expect(weightOf('ALLIANZ_TAIWAN', '2330')).toBe(4.87)
    expect(weightOf('QQQ', 'NVDA')).toBe(8.33)
    expect(weightOf('SPY', 'NVDA')).toBe(8.45)
    expect(weightOf('JH_BALANCED', 'NVDA')).toBe(5.86)
    expect(weightOf('ALLIANZ_INCOME_GROWTH', 'NVDA')).toBe(2.81)
  })

  it('every basket has sources and a verified map', () => {
    for (const a of universe.values()) {
      if (a.type !== 'etf' && a.type !== 'fund') continue
      expect(a.source.length, a.id).toBeGreaterThan(0)
      expect(a.verified, a.id).toBeDefined()
    }
  })
})

describe('aggregate buckets', () => {
  it('flags every non-company bucket as aggregate and nothing else', () => {
    const agg = [...universe.values()].filter((a) => a.aggregate).map((a) => a.id).sort()
    expect(agg).toEqual(['BOND_MIXED_US', 'CASH', 'CONVERTIBLE_US', 'GLOBAL_BOND_MIXED', 'OTHER_TW_STOCK', 'OTHER_US_STOCK', 'US_HIGH_YIELD', 'US_TREASURY'])
    expect(universe.get('GOLD')?.aggregate).toBeUndefined()
  })

  it('landmark stocks have a market cap', () => {
    for (const id of ['2330', 'NVDA', 'TSLA', 'AAPL', 'MSFT']) {
      expect(universe.get(id)?.marketCapUsdB, id).toBeGreaterThan(0)
    }
  })

  it('every market cap carries a verified flag and a source', () => {
    for (const a of universe.values()) {
      if (a.marketCapUsdB === undefined) continue
      expect(a.verified?.marketCap, a.id).toBeDefined()
      expect(a.source.length, a.id).toBeGreaterThan(0)
    }
  })
})
