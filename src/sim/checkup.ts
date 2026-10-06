import type { AssetKind, FundCheckup } from '../data/fundCheckup'

/**
 * 基金體檢（實戰課）的純函式：每個顯示的數字都從快照（data/fundCheckup）算出來。
 * 「所載各項的和或差」（docs/data-sources.md 的規則）：加總後四捨五入到資料的位數，免得浮點數的尾巴（1.4500000000000002）。
 */

const round = (x: number, digits: number): number => Number(x.toFixed(digits))
const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0)
const need = <T>(v: T | null, what: string): T => {
  if (v === null) throw new Error(`checkup: no ${what}`)
  return v
}

/** 每年的費用（%／年）。parts＝經理費＋保管費（上限）；ongoing＝KID 的每年持續費用；交易成本另外算 */
export function feeSummary(f: FundCheckup) {
  const b = f.basics
  const management = need(b.managementFee.value, 'managementFee')
  const custody = need(b.custodyAdminFee.value, 'custodyAdminFee')
  return {
    management,
    custody,
    parts: round(management + custody, 2),
    ongoing: need(b.ongoingCharges.value, 'ongoingCharges'),
    transaction: need(b.transactionCosts.value, 'transactionCosts'),
    maxSales: need(b.maxSalesCharge.value, 'maxSalesCharge'),
  }
}

export type AssetGroup = 'stock' | 'bond' | 'cash'

/**
 * 三大類的分法（明確寫在這裡，課文照這個分法說）：股票（含掩護性買權）│借據與特別股│現金。
 * 特別股放在借據這邊：它照固定比率給錢、不跟著公司長大，比較像借據；分法會影響「一半以上不是股票」成不成立，課文要說出來。
 */
export const ASSET_GROUP_OF: Readonly<Record<AssetKind, AssetGroup>> = { equity: 'stock', coveredCall: 'stock', highYield: 'bond', bond: 'bond', preferred: 'bond', cash: 'cash' }

/** 資產大類（%，原始項目照大小排） */
export function sortedAssets(f: FundCheckup) {
  return [...need(f.assetAllocation.value, 'assetAllocation').items].sort((a, b) => b.pct - a.pct)
}

/** 區域配置（%，大到小） */
export function sortedRegions(f: FundCheckup) {
  return [...need(f.regionAllocation.value, 'regionAllocation').items].sort((a, b) => b.pct - a.pct)
}

/** 三大類的合計（各項之和，四捨五入到 0.1）；nonStockMajority＝不是股票的部分超過所列合計的一半 */
export function assetGroups(f: FundCheckup) {
  const items = need(f.assetAllocation.value, 'assetAllocation').items
  const of = (pred: (k: AssetKind) => boolean) => round(sum(items.filter((i) => pred(i.kind)).map((i) => i.pct)), 1)
  const stock = of((k) => ASSET_GROUP_OF[k] === 'stock')
  const bond = of((k) => ASSET_GROUP_OF[k] === 'bond')
  const cash = of((k) => ASSET_GROUP_OF[k] === 'cash')
  const total = round(stock + bond + cash, 1)
  const nonStock = round(bond + cash, 1)
  const preferred = of((k) => k === 'preferred')
  const groups = ([['stock', stock], ['bond', bond], ['cash', cash]] as const)
    .map(([group, pct]) => ({ group, pct, items: items.filter((i) => ASSET_GROUP_OF[i.kind] === group) }))
    .sort((a, b) => b.pct - a.pct)
  return {
    stock,
    bond,
    cash,
    total,
    nonStock,
    nonStockMajority: nonStock > total / 2,
    highYield: of((k) => k === 'highYield'),
    coveredCall: of((k) => k === 'coveredCall'),
    preferred,
    /** 特別股若算成股票的話 */
    stockWithPreferred: round(stock + preferred, 1),
    groups,
  }
}

/** 一年（12 次）配息合計（每單位，原幣） */
export function payoutTotal(f: FundCheckup): number {
  return round(sum(need(f.dividends.value, 'dividends').items.map((d) => d.amount)), 3)
}

/** 同期淨值變化：起點（第一次配息前的月底）→ 最後一個月底 */
export function navChange(f: FundCheckup) {
  const nav = need(f.navMonthEnd.value, 'navMonthEnd')
  const to = nav.items.at(-1)!
  return { from: nav.baseline, to, change: round(to.nav - nav.baseline.nav, 2) }
}

/** 'YYYY-MM' 的下一個月 */
const nextMonth = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number) as [number, number]
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

/**
 * 每次配息的組成（收益／本金），對到配息紀錄：台灣的表把每次配息標在基準日的前一個月，
 * 所以標 2026-08 的那一列＝基準日在 2026-09 的那次配息；金額必須一樣（不一樣就丟錯，不硬配）。
 */
export function payoutSources(f: FundCheckup) {
  const pays = need(f.dividends.value, 'dividends').items
  const comp = need(f.dividendComposition.value, 'dividendComposition').items
  return comp.map((c) => {
    const month = nextMonth(c.twMonthLabel)
    const p = pays.find((d) => d.recordDate.startsWith(month))
    if (!p || Math.abs(p.amount - c.amount) > 1e-9) throw new Error(`checkup: composition ${c.twMonthLabel} (${c.amount}) has no payout of the same amount in ${month}`)
    return { recordDate: p.recordDate, amount: p.amount, incomePct: c.incomePct, capitalPct: c.capitalPct, income: (p.amount * c.incomePct) / 100, capital: (p.amount * c.capitalPct) / 100 }
  })
}

/**
 * 本金那一段：開頭連續幾次全是收益，之後從哪一次起有本金、本金佔幾 % 到幾 %。
 * 不算整年平均（這一年跨過財務年度，平均會誤導；研究筆記）。
 */
export function capitalRun(f: FundCheckup) {
  const p = payoutSources(f)
  const incomeOnly = p.findIndex((x) => x.capitalPct > 0)
  const n = incomeOnly < 0 ? p.length : incomeOnly
  const rest = p.slice(n).map((x) => x.capitalPct)
  return {
    incomeOnly: n,
    firstIncomeOnly: n > 0 ? p[0]!.recordDate : null,
    lastIncomeOnly: n > 0 ? p[n - 1]!.recordDate : null,
    since: n < p.length ? p[n]!.recordDate : null,
    min: rest.length ? Math.min(...rest) : 0,
    max: rest.length ? Math.max(...rest) : 0,
  }
}

/** 連乘：每年報酬（%）→ 合起來的報酬（小數）＝ Π(1 + r) − 1 */
export function compound(pcts: readonly number[]): number {
  return pcts.reduce((v, p) => v * (1 + p / 100), 1) - 1
}

/** 曆年報酬 vs 基金自己的指標：每年一對、差多少、幾年比指標高（ahead）幾年低（behind）、跌的年份 */
export function annualReturns(f: FundCheckup) {
  const fund = need(f.calendarYearReturns.value, 'calendarYearReturns').items
  const bench = need(f.benchmarkCalendarYearReturns.value, 'benchmarkCalendarYearReturns').items
  const rows = fund.map((x) => {
    const b = bench.find((y) => y.year === x.year)
    if (!b) throw new Error(`checkup: no benchmark return for ${x.year}`)
    return { year: x.year, fund: x.pct, bench: b.pct, diff: round(x.pct - b.pct, 2) }
  })
  const worst = rows.reduce((w, r) => (r.fund < w.fund ? r : w), rows[0]!)
  return {
    rows,
    ahead: rows.filter((r) => r.diff > 0).length,
    behind: rows.filter((r) => r.diff < 0).length,
    worst: { year: worst.year, pct: worst.fund },
    down: rows.filter((r) => r.fund < 0).map((r) => r.year),
    fundTotal: compound(rows.map((r) => r.fund)),
    benchTotal: compound(rows.map((r) => r.bench)),
  }
}
