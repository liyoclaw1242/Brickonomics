import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { productGroups, legendRows, formatPct, pickInfo } from './model'

describe('productGroups', () => {
  it('splits baskets into ETFs and funds in data order', () => {
    const g = productGroups(universe)
    expect(g.etfs.map((a) => a.id)).toEqual(['0050', 'QQQ', 'SPY'])
    expect(g.funds.map((a) => a.id)).toEqual([
      'ALLIANZ_TAIWAN', 'JH_BALANCED', 'SCHRODER_GLOBAL_INCOME_BOND', 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', 'ALLIANZ_INCOME_GROWTH',
    ])
  })
})

describe('legendRows', () => {
  it('lists holdings with names, weights and distinct colors', () => {
    const rows = legendRows(universe, '0050')
    expect(rows[0]).toMatchObject({ id: '2330', name: '台積電', weightPct: 57.35, aggregate: false })
    expect(rows.at(-1)).toMatchObject({ id: 'OTHER_TW_STOCK', aggregate: true })
    expect(new Set(rows.map((r) => r.color)).size).toBe(rows.length)
  })

  it('returns nothing for non-baskets', () => {
    expect(legendRows(universe, '2330')).toEqual([])
  })
})

describe('formatPct', () => {
  it('shows two decimals', () => {
    expect(formatPct(57.35)).toBe('57.35%')
    expect(formatPct(5.6)).toBe('5.60%')
  })
})

describe('pickInfo', () => {
  it('describes a holding inside a basket with the basket date and holdings flag', () => {
    expect(pickInfo(universe, { productId: '0050', holdingId: '2330' })).toMatchObject({
      title: '台積電', subtitle: '元大台灣50 的組成', weightPct: 57.35, asOf: '2026-08-01', verified: true, aggregate: false,
    })
  })

  it('flags unverified holdings and aggregate buckets', () => {
    expect(pickInfo(universe, { productId: 'JH_BALANCED', holdingId: 'NVDA' })?.verified).toBe(false)
    expect(pickInfo(universe, { productId: '0050', holdingId: 'OTHER_TW_STOCK' })?.aggregate).toBe(true)
  })

  it('describes a building (a stock on its own)', () => {
    const info = pickInfo(universe, { productId: '2330', holdingId: '2330' })
    expect(info).toMatchObject({ title: '台積電', weightPct: null })
    expect(info?.subtitle).toContain('台灣')
  })

  it('returns null for nothing picked or unknown ids', () => {
    expect(pickInfo(universe, null)).toBeNull()
    expect(pickInfo(universe, { productId: 'NOPE', holdingId: 'NOPE' })).toBeNull()
  })
})
