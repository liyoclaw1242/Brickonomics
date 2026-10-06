import { describe, it, expect } from 'vitest'
import raw from '../data/snapshot/practice/JFZN3.json'
import { checkupOf, parseFundCheckup } from '../data/fundCheckup'
import { annualReturns, ASSET_GROUP_OF, assetGroups, capitalRun, compound, feeSummary, navChange, payoutSources, payoutTotal, sortedAssets, sortedRegions } from './checkup'

const f = checkupOf('JFZN3')
const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(raw)) as Record<string, unknown>

describe('feeSummary', () => {
  it('management 1.25% + custody/admin 0.20% = 1.45%, the KID ongoing charge; transaction costs 0.22% stay separate; max sales charge 5%', () => {
    const s = feeSummary(f)
    expect(s.management).toBe(1.25)
    expect(s.custody).toBe(0.2)
    expect(s.parts).toBe(1.45) // 1.25 + 0.20（四捨五入到 0.01，免得 1.4500000000000002）
    expect(s.ongoing).toBe(1.45) // KID：每年持續費用
    expect(s.parts).toBe(s.ongoing)
    expect(s.transaction).toBe(0.22) // 另外算，不加進每年先扣
    expect(s.maxSales).toBe(5)
  })
})

describe('asset groups (grouping: stocks incl. covered call │ bonds and preferreds │ cash)', () => {
  it('maps every asset kind to exactly one group', () => {
    expect(ASSET_GROUP_OF).toEqual({ equity: 'stock', coveredCall: 'stock', highYield: 'bond', bond: 'bond', preferred: 'bond', cash: 'cash' })
  })

  it('sums the stated items: stock 49.7, bond 44.4, cash 5.8 (total 99.9); non-stock 50.2 is more than half', () => {
    const g = assetGroups(f)
    // stock = 29.0 環球 + 9.6 掩護性買權 + 6.6 歐洲 + 4.5 新興 = 49.7
    expect(g.stock).toBe(49.7)
    // bond = 27.3 美國高收益 + 4.9 特別股 + 4.5 新興債 + 4.3 非機構 + 2.2 歐洲高收益 + 1.0 投資等級 + 0.2 短期 = 44.4
    expect(g.bond).toBe(44.4)
    expect(g.cash).toBe(5.8)
    expect(g.total).toBe(99.9) // 四捨五入，不是 100
    expect(g.nonStock).toBe(50.2) // 44.4 + 5.8
    expect(g.nonStockMajority).toBe(true) // 50.2 > 99.9 ÷ 2 = 49.95
    expect(g.highYield).toBe(29.5) // 27.3 + 2.2
    expect(g.coveredCall).toBe(9.6)
    expect(g.preferred).toBe(4.9)
    // 特別股若算成股票：49.7 + 4.9 = 54.6，就不是「一半以上不是股票」了（課文要說用哪種分法）
    expect(g.stockWithPreferred).toBe(54.6)
    expect(g.stockWithPreferred > g.total / 2).toBe(true)
    expect(g.groups.map((x) => x.group)).toEqual(['stock', 'bond', 'cash']) // 大到小
  })

  it('flips nonStockMajority when stocks are the larger part', () => {
    const c = clone()
    const items = (c.assetAllocation as { value: { items: { name: string; pct: number }[] } }).value.items
    items.find((i) => i.name === 'Global Equity')!.pct = 33.0 // +4.0
    items.find((i) => i.name === 'US High Yield')!.pct = 23.3 // −4.0
    const g = assetGroups(parseFundCheckup(c))
    expect(g.stock).toBe(53.7) // 49.7 + 4
    expect(g.nonStockMajority).toBe(false)
  })

  it('sorts the items and the regions from big to small (US first)', () => {
    expect(sortedAssets(f).map((i) => i.pct).slice(0, 3)).toEqual([29.0, 27.3, 9.6])
    const r = sortedRegions(f)
    expect(r[0]).toMatchObject({ zh: '美國', pct: 61.9 })
    expect(r.map((x) => x.pct)).toEqual([...r.map((x) => x.pct)].sort((a, b) => b - a))
  })
})

describe('the last 12 months: payouts vs the NAV', () => {
  it('12 payouts add up to 8.254 per unit', () => {
    // 0.691 + 0.684 + 0.687 + 0.691 + 0.693 + 0.680 + 0.672 + 0.696 + 0.690 + 0.693 + 0.692 + 0.685 = 8.254
    expect(payoutTotal(f)).toBe(8.254)
  })

  it('NAV went from 74.99 (2025-09-30) to 72.87 (2026-09-30): −2.12', () => {
    expect(navChange(f)).toEqual({ from: { date: '2025-09-30', nav: 74.99 }, to: { date: '2026-09-30', nav: 72.87 }, change: -2.12 }) // 72.87 − 74.99
  })

  it('aligns each composition row to the payout one month later (the TW table labels a payout one month before its record date) and checks the amount', () => {
    const p = payoutSources(f)
    expect(p).toHaveLength(12)
    expect(p[0]).toMatchObject({ recordDate: '2025-10-09', amount: 0.691, incomePct: 100, capitalPct: 0, income: 0.691, capital: 0 }) // 標 2025-09
    // 標 2026-01 的 0.693 ＝ 基準日 2026-02-09；本金 76%：0.693 × 0.76 = 0.52668
    expect(p[4]).toMatchObject({ recordDate: '2026-02-09', amount: 0.693, capitalPct: 76 })
    expect(p[4]!.capital).toBeCloseTo(0.52668, 10)
    expect(p[4]!.income + p[4]!.capital).toBeCloseTo(0.693, 12)
    expect(p.at(-1)).toMatchObject({ recordDate: '2026-09-08', amount: 0.685, capitalPct: 68 }) // 標 2026-08
  })

  it('throws when a composition amount does not match the payout it is aligned with', () => {
    const c = clone()
    ;(c.dividendComposition as { value: { items: { amount: number }[] } }).value.items[3]!.amount = 0.7
    expect(() => payoutSources(parseFundCheckup(c))).toThrow(/2025-12/)
  })

  it('capital run: the first 4 payouts were all income; from 2026-02-09 every payout had 56–76% from capital', () => {
    expect(capitalRun(f)).toEqual({ incomeOnly: 4, firstIncomeOnly: '2025-10-09', lastIncomeOnly: '2026-01-07', since: '2026-02-09', min: 56, max: 76 })
  })
})

describe('calendar-year returns vs the fund’s own benchmark', () => {
  it('pairs the years and counts which side was higher: 1 year ahead (2022), 3 behind', () => {
    const r = annualReturns(f)
    expect(r.rows.map((x) => [x.year, x.fund, x.bench, x.diff])).toEqual([
      [2022, -11.93, -13.16, 1.23], // −11.93 − (−13.16)
      [2023, 8.35, 16.14, -7.79],
      [2024, 8.16, 11.89, -3.73],
      [2025, 10.9, 11.89, -0.99],
    ])
    expect(r.ahead).toBe(1)
    expect(r.behind).toBe(3)
    expect(r.worst).toEqual({ year: 2022, pct: -11.93 })
    expect(r.down).toEqual([2022])
  })

  it('compounds the years: fund (1 − .1193)(1.0835)(1.0816)(1.109) − 1 ≈ +14.5%, benchmark (1 − .1316)(1.1614)(1.1189)² − 1 ≈ +26.3%', () => {
    expect(compound([-11.93, 8.35, 8.16, 10.9])).toBeCloseTo(0.8807 * 1.0835 * 1.0816 * 1.109 - 1, 12)
    expect(compound([-11.93, 8.35, 8.16, 10.9])).toBeCloseTo(0.1446, 4)
    expect(compound([-13.16, 16.14, 11.89, 11.89])).toBeCloseTo(0.8684 * 1.1614 * 1.1189 * 1.1189 - 1, 12)
    expect(compound([-13.16, 16.14, 11.89, 11.89])).toBeCloseTo(0.2627, 4)
    const r = annualReturns(f)
    expect(r.fundTotal).toBeCloseTo(0.1446, 4)
    expect(r.benchTotal).toBeCloseTo(0.2627, 4)
  })

  it('throws when the benchmark lacks a year the fund has', () => {
    const c = clone()
    ;(c.benchmarkCalendarYearReturns as { value: { items: unknown[] } }).value.items.pop()
    expect(() => annualReturns(parseFundCheckup(c))).toThrow(/2025/)
  })
})
