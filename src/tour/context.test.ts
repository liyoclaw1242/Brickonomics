import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { overlap } from '../sim/overlap'
import { makeTextContext, movePct, pct0, signedPct, wan } from './context'

describe('text context', () => {
  const c = makeTextContext(universe)

  it('adds up stock and bond (借據) weights of a basket; cash counts as neither', () => {
    // 安聯收益成長：股票 2.81+2.44+2.53+1.49+1.1+0.97+20.57 = 31.91；借據 31.98+30.4 = 62.38；現金 5.71
    expect(c.assetClassPct('ALLIANZ_INCOME_GROWTH', 'stock')).toBeCloseTo(31.91, 6)
    expect(c.assetClassPct('ALLIANZ_INCOME_GROWTH', 'bond')).toBeCloseTo(62.38, 6)
    // 駿利亨德森平衡：股票 5.86+4.46+4.11+3.01+2.98+2.19+1.69+1.46+38.32 = 64.08；借據 7.00+26.86 = 33.86；現金 2.06
    expect(c.assetClassPct('JH_BALANCED', 'stock')).toBeCloseTo(64.08, 6)
    expect(c.assetClassPct('JH_BALANCED', 'bond')).toBeCloseTo(33.86, 6)
  })

  it('every 其他 bucket in the snapshot is a stock bucket (so it counts as 股票)', () => {
    for (const a of universe.values()) if (a.type === 'other') expect(a.id, a.id).toMatch(/^OTHER_[A-Z]+_STOCK$/)
  })

  it('looks up holding weights and throws on unknown pairs', () => {
    expect(c.weightPct('0050', '2330')).toBe(56.31)
    expect(() => c.weightPct('0050', 'NVDA')).toThrow('no holding NVDA in 0050')
  })

  it('computes the 2330 -30% shock', () => {
    expect(c.shock('0050')).toBeCloseTo(-0.16893, 5) // -0.3 * 56.31 / 100
    expect(c.shock('SPY')).toBe(0)
  })

  it('reports sector weights for a product', () => {
    expect(c.sectorPct('QQQ', 'semiconductor')).toBeCloseTo(13.35, 6)
    expect(c.sectorPct('QQQ', 'finance')).toBe(0)
  })

  it('reads expense ratios and returns undefined when there is none', () => {
    expect(c.expenseRatio('QQQ')).toBe(universe.get('QQQ')!.fees!.expenseRatio)
    expect(c.expenseRatio('2330')).toBeUndefined()
    expect(c.expenseRatio('NOPE')).toBeUndefined()
  })

  it('reports the shared overlap of two baskets as a fraction', () => {
    const v = c.overlapShared('QQQ', 'SPY')
    expect(v).toBe(overlap(universe, 'QQQ', 'SPY').total)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThanOrEqual(1)
    expect(c.overlapShared('0050', 'SPY')).toBe(0)
  })
})

describe('exitFee', () => {
  it('reads the CDSC for the holding year and is 0 past the table', () => {
    const c = makeTextContext(universe)
    const id = 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD' // cdsc [0.03, 0.02, 0.01]
    expect(c.exitFee(id, 0)).toBe(0.03)
    expect(c.exitFee(id, 1.5)).toBe(0.02)
    expect(c.exitFee(id, 2)).toBe(0.01)
    expect(c.exitFee(id, 3)).toBe(0)
    expect(c.exitFee('0050', 0)).toBe(0)
  })
})

describe('formatting', () => {
  it('pct0 rounds percentages', () => {
    expect(pct0(57.35)).toBe('57')
    expect(pct0(31.98)).toBe('32')
  })

  it('signedPct uses a real minus sign and one decimal', () => {
    expect(signedPct(-0.17205)).toBe('−17.2%')
    expect(signedPct(0)).toBe('0.0%')
    expect(signedPct(0.05)).toBe('+5.0%')
  })

  it('movePct says 跌／漲 in words for big numbers (r3: the − sign was read as +)', () => {
    expect(movePct(-0.16893)).toBe('跌 16.9%')
    expect(movePct(-0.3)).toBe('跌 30.0%')
    expect(movePct(0.05)).toBe('漲 5.0%')
    expect(movePct(0)).toBe('0.0%')
    expect(movePct(-0.0004)).toBe('0.0%') // 顯示為 0.0 時不說跌
    // 數字部分和 signedPct 一致，只是把正負號換成字
    for (const x of [-0.17205, 0.05, -0.3]) expect(movePct(x).replace(/^[跌漲] /, '')).toBe(signedPct(x).slice(1))
  })

  it('wan shows money on the 100-萬 base: one decimal, no trailing .0', () => {
    expect(wan(98.5)).toBe('98.5 萬')
    expect(wan(97)).toBe('97 萬')
    expect(wan(1.958)).toBe('2 萬') // 1.958 → 2.0 → 2
    expect(wan(86.86)).toBe('86.9 萬')
    expect(wan(0)).toBe('0 萬')
    expect(wan(1e-9)).toBe('0 萬')
  })
})

describe('fundFeeRows (f-6, on a 100-萬 base)', () => {
  const c = makeTextContext(universe)
  it('gives the two fund classes with the entry and exit fees split out', () => {
    const [front, back] = c.fundFeeRows(0, 0.015)
    expect(front!.id).toBe('front')
    expect(front!.entry).toBeCloseTo(1.5, 9) // 100 × 0.015
    expect(front!.exit).toBe(0)
    expect(back!.id).toBe('back')
    expect(back!.entry).toBe(0) // U 級別免申購手續費
    expect(back!.exit).toBeCloseTo(3, 9) // 100 × 0.03
    expect(c.fundFeeRows(3, 0.015)[1]!.exit).toBe(0)
    expect(c.fundFeeRows(0, 0.015)).toHaveLength(2) // 沒有 0050
  })
})
