import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { productGroups, legendRows, formatPct, pickInfo, sourceLabel, legendMeta, nextButton } from './model'

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
    expect(rows[0]).toMatchObject({ id: '2330', name: '台積電', weightPct: 56.31, aggregate: false })
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
      title: '台積電', subtitle: '元大台灣50 的組成', weightPct: 56.31, asOf: '2026-10-02', verified: true, aggregate: false,
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

describe('legendMeta', () => {
  it('gives the basket data date and verification', () => {
    expect(legendMeta(universe, '0050')).toEqual({ asOf: '2026-10-02', verified: true })
    expect(legendMeta(universe, 'JH_BALANCED')?.verified).toBe(false)
  })
  it('is null for non-baskets', () => {
    expect(legendMeta(universe, '2330')).toBeNull()
  })
})

describe('sourceLabel', () => {
  it('links valid http(s) urls by hostname', () => {
    expect(sourceLabel('https://www.yuantaetfs.com/x')).toEqual({ href: 'https://www.yuantaetfs.com/x', text: 'www.yuantaetfs.com' })
  })
  it('falls back to raw text for malformed urls', () => {
    expect(sourceLabel('http://')).toEqual({ href: null, text: 'http://' })
  })
  it('keeps non-url text', () => {
    expect(sourceLabel('公開說明書')).toEqual({ href: null, text: '公開說明書' })
  })
})

describe('nextButton (r3: a greyed 下一步 looked broken)', () => {
  it('says what to do while the step waits, and is 下一步 again once done', () => {
    expect(nextButton(false, false)).toEqual({ text: '先拉上面的拉桿', name: '先拉上面的拉桿，再按下一步', waiting: true })
    expect(nextButton(true, false)).toEqual({ text: '下一步', name: '下一步', waiting: false })
    expect(nextButton(true, true)).toEqual({ text: '自由玩', name: '自由玩', waiting: false })
  })

  it('the accessible name starts with the visible text (WCAG 2.5.3) and still says 下一步', () => {
    const b = nextButton(false, false)
    expect(b.name.startsWith(b.text)).toBe(true)
    expect(b.name).toMatch(/下一步/)
  })
})
