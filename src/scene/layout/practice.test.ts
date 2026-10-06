import { describe, expect, it } from 'vitest'
import { CHECKUP_COLORS, CHECKUP_LAYOUT, checkupBasket, checkupHyDamage, navPayoutLayout, NP_LAYOUT, PERF_LAYOUT, perfLayout, REGION_LAYOUT, regionTiles, CC_RISE_MIN, ccNow, ccSunny } from './practice'
import { checkupOf } from '../../data/fundCheckup'
import { basketVoxels } from './basket'
import { QUALITY } from '../quality'
import { ACCENT_COLORS } from '../palette'

describe('x-cc covered-call tower (ceiling +5%, premium 2%; ≈)', () => {
  it('big rise +20%: tower kept at 105, the plain tower would reach 120 (15 sold away), coin 2', () => {
    const n = ccNow(20)
    expect(n.kept).toBeCloseTo(105, 10)
    expect(n.full).toBeCloseTo(120, 10)
    expect(n.full - n.kept).toBeCloseTo(100 * n.cut, 10)
    expect(n.ceiling).toBeCloseTo(105, 10)
    expect(n.coin).toBeCloseTo(2, 10)
    expect(n.coins).toBe(2) // 每 1% 一枚
    expect(n.covered).toBeCloseTo(0.07, 12)
  })

  it('flat: tower stays at 100, nothing sold away, covered = premium', () => {
    const n = ccNow(0)
    expect(n.kept).toBe(100)
    expect(n.full).toBe(100)
    expect(n.covered).toBeCloseTo(0.02, 12)
  })

  it('fall −20%: tower at 80 (same as plain), covered −18%', () => {
    const n = ccNow(-20)
    expect(n.kept).toBeCloseTo(80, 10)
    expect(n.full).toBeCloseTo(80, 10)
    expect(n.covered).toBeCloseTo(-0.18, 12)
  })

  it('clamps and rounds the slider value', () => {
    expect(ccNow(99).movePct).toBe(20)
    expect(ccNow(-99).movePct).toBe(-20)
    expect(ccNow(3.4).movePct).toBe(3)
    expect(ccNow(Number.NaN).movePct).toBe(0)
  })

  it('🌤 sunnyTree only on a rise (gate ≥ 1%); fixed params', () => {
    expect(CC_RISE_MIN).toBe(1)
    expect(ccSunny()).toEqual(ccSunny())
    expect(ccSunny().kind).toBe('sunnyTree')
  })
})

describe('x-pay NAV bars and payout coins (navPayoutLayout)', () => {
  const f = checkupOf('JFZN3')
  const L = navPayoutLayout(f)
  it('draws 13 month-end bars from a floor 2 below the lowest NAV: floor(72.50) − 2 = 70', () => {
    expect(L.floor).toBe(70)
    expect(L.bars).toHaveLength(13) // 起點 2025-09-30 ＋ 12 個月底
    expect(L.bars[0]).toMatchObject({ date: '2025-09-30', nav: 74.99 })
    expect(L.bars[0]!.h).toBeCloseTo((74.99 - 70) * NP_LAYOUT.unit, 10)
    // 平均排開，中間那根在廣場中心：x = (i − 6) × spacing
    expect(L.bars[0]!.x).toBeCloseTo(-6 * NP_LAYOUT.spacing, 10)
    expect(L.bars[12]!.x).toBeCloseTo(6 * NP_LAYOUT.spacing, 10)
  })
  it('puts each payout in front of the bar of its record month, split into income (bottom) and capital (top) at the same per-dollar scale', () => {
    expect(L.coins).toHaveLength(12)
    expect(L.coins[0]).toMatchObject({ recordDate: '2025-10-09', capitalPct: 0 })
    expect(L.coins[0]!.x).toBe(L.bars[1]!.x) // 2025-10-09 → 2025-10-31 那根
    expect(L.coins[0]!.capitalH).toBe(0)
    // 2026-02-09：0.693，本金 76%
    expect(L.coins[4]!.x).toBe(L.bars[5]!.x)
    expect(L.coins[4]!.incomeH).toBeCloseTo(0.693 * 0.24 * NP_LAYOUT.unit, 10)
    expect(L.coins[4]!.capitalH).toBeCloseTo(0.693 * 0.76 * NP_LAYOUT.unit, 10)
  })
  it('marks how much shorter the last bar is than the start (74.99 → 72.87, 2.12 × unit)', () => {
    expect(L.startY).toBeCloseTo((74.99 - 70) * NP_LAYOUT.unit, 10)
    expect(L.endY).toBeCloseTo((72.87 - 70) * NP_LAYOUT.unit, 10)
    expect(L.startY - L.endY).toBeCloseTo(2.12 * NP_LAYOUT.unit, 10)
  })
})

describe('checkup tower (checkupBasket): the asset mix as a fund tower', () => {
  const f = checkupOf('JFZN3')
  const b = checkupBasket(f)
  it('one layer per asset item, stocks at the bottom, then bonds and preferreds, cash on top; big to small inside a group', () => {
    expect(b.holdings.map((h) => h.group)).toEqual(['stock', 'stock', 'stock', 'stock', 'bond', 'bond', 'bond', 'bond', 'bond', 'bond', 'bond', 'cash'])
    expect(b.holdings.slice(0, 4).map((h) => h.pct)).toEqual([29.0, 9.6, 6.6, 4.5])
    expect(b.holdings[4]).toMatchObject({ kind: 'highYield', pct: 27.3 })
  })
  it('builds a tiny universe the Basket can draw: weights add to 99.9 (within the 0.5 tolerance) and every holding exists', () => {
    const p = b.universe.get(b.productId)!
    expect(p.type).toBe('fund')
    expect(p.holdings!.reduce((s, h) => s + h.weightPct, 0)).toBeCloseTo(99.9, 9)
    for (const h of p.holdings!) expect(b.universe.has(h.id), h.id).toBe(true)
    // 方塊數嚴格依權重：504 塊（高畫質基金塔）照最大餘數法分
    const vox = basketVoxels(b.universe, b.productId, QUALITY.high.fund)
    expect(vox).toHaveLength(QUALITY.high.fund.total)
  })
  it('colours: stock layers in the stock colour family, covered call its own colour, high yield glass, cash matte green', () => {
    const look = (kind: string) => b.looks[b.holdings.findIndex((h) => h.kind === kind)]!
    expect(b.looks).toHaveLength(b.holdings.length)
    expect(look('equity')).toEqual({ color: ACCENT_COLORS.stock, kind: 'matte' })
    expect(look('coveredCall').color).toBe(CHECKUP_COLORS.coveredCall)
    expect(look('highYield').kind).toBe('glass')
    expect(look('cash')).toEqual({ color: ACCENT_COLORS.cash, kind: 'matte' })
    // 同類的第二層調亮／調暗，分得出每一層
    const eq = b.holdings.map((h, i) => (h.kind === 'equity' ? b.looks[i]!.color : null)).filter(Boolean)
    expect(new Set(eq).size).toBe(eq.length)
  })
  it('the tornado cracks only the high-yield layers, by an illustrative share', () => {
    const d = checkupHyDamage(b)
    expect(Object.keys(d).sort()).toEqual(b.holdings.filter((h) => h.kind === 'highYield').map((h) => h.id).sort())
    for (const v of Object.values(d)) expect(v).toBe(CHECKUP_LAYOUT.hyCrack)
  })
})

describe('x-where region islands (regionTiles)', () => {
  const tiles = regionTiles(checkupOf('JFZN3'))
  it('one island per region; area ∝ share (side = k·√pct); the biggest is the brightest', () => {
    expect(tiles).toHaveLength(8)
    const us = tiles.find((t) => t.zh === '美國')!
    expect(us.side).toBeCloseTo(REGION_LAYOUT.k * Math.sqrt(61.9), 10)
    expect(us.glow).toBe(1)
    const eu = tiles.find((t) => t.name === 'Europe ex-UK')!
    expect(eu.glow).toBeCloseTo(12.8 / 61.9, 10)
    expect(tiles.find((t) => t.name === 'Cash')!.cash).toBe(true)
  })
  it('islands do not overlap each other', () => {
    for (const a of tiles) for (const b of tiles) {
      if (a === b) continue
      const apart = Math.abs(a.x - b.x) >= (a.side + b.side) / 2 || Math.abs(a.z - b.z) >= (a.side + b.side) / 2
      expect(apart, `${a.name} / ${b.name}`).toBe(true)
    }
  })
})

describe('x-perf two towers a year (perfLayout)', () => {
  const L = perfLayout(checkupOf('JFZN3'))
  it('a pair per calendar year: fund on the left, benchmark on the right; up from the zero line when positive, down when negative', () => {
    expect(L.years.map((y) => y.year)).toEqual([2022, 2023, 2024, 2025])
    const y22 = L.years[0]!
    expect(y22.fund.x).toBeLessThan(y22.bench.x)
    // 2022：−11.93 → 往下 11.93 × unit；底在零線下面
    expect(y22.fund.h).toBeCloseTo(11.93 * PERF_LAYOUT.unit, 10)
    expect(y22.fund.y).toBeCloseTo(PERF_LAYOUT.zeroY - (11.93 * PERF_LAYOUT.unit) / 2, 10)
    expect(y22.down).toBe(true)
    const y23 = L.years[1]!
    expect(y23.bench.y).toBeCloseTo(PERF_LAYOUT.zeroY + (16.14 * PERF_LAYOUT.unit) / 2, 10)
    expect(PERF_LAYOUT.zeroY - 13.16 * PERF_LAYOUT.unit).toBeGreaterThan(0) // 最深的柱子也不會穿過地面
  })
  it('the 🌋 quake sits under the worst year, as deep as its fall', () => {
    expect(L.quake).toEqual({ kind: 'quake', depth: 0.1193, at: [L.years[0]!.x, PERF_LAYOUT.pitZ], width: PERF_LAYOUT.pitWidth })
  })
})
