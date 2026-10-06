import { COVERED_CALL, coveredCall, type CoveredCallOutcome } from '../../sim/coveredCall'
import type { SpecOf } from '../events/types'
import type { AssetKind, FundCheckup } from '../../data/fundCheckup'
import type { Asset, AssetType } from '../../data/schema'
import type { Universe } from '../../data/universe'
import { annualReturns, ASSET_GROUP_OF, payoutSources, sortedRegions, yearToDate, type AssetGroup } from '../../sim/checkup'
import { ACCENT_COLORS, varyLooks, type BlockLook } from '../palette'

/**
 * 實戰課（Plan 9）的舞台幾何與拉桿 → 數值（純 TS；課文 levels.ts、3D 舞台、讀數共用同一份）。
 * 數值一律從 src/sim 的函式與它們的舉例常數算出來；座標相對廣場中心。
 */

// ───────────── x-cc 掩護性買權（天花板＋權利金金幣；上漲時 🌤） ─────────────

/** 一座塔在廣場中間（起點 100＝unit × 100 高）；權利金金幣疊在塔的右邊（每 1% 一枚，coinT 厚） */
export const CC_LAYOUT = { x: -1.5, w: 4, unit: 0.12, coinX: 3.8, coinR: 1.3, coinT: 0.3 } as const

export type CcNow = CoveredCallOutcome & {
  /** 拉桿值（整數 %，限制在 COVERED_CALL 的範圍） */
  movePct: number
  move: number
  /** 塔留下來的那截頂端（起點 100 的單位）＝100 × (1 + min(move, cap)) */
  kept: number
  /** 一般持有會到的高度＝100 × (1 + move)；比 kept 高的那段＝賣掉的 */
  full: number
  /** 天花板＝100 × (1 + cap) */
  ceiling: number
  /** 權利金（起點 100 的單位）＝100 × premium */
  coin: number
  /** 金幣疊幾枚（每 1% 一枚，四捨五入） */
  coins: number
}

/** 拉桿值（整數 %）→ 這一刻的塔、天花板、金幣（sim/coveredCall） */
export function ccNow(movePct: number): CcNow {
  const { cap, premium, minMovePct, maxMovePct } = COVERED_CALL
  const m = Math.min(maxMovePct, Math.max(minMovePct, Math.round(Number.isFinite(movePct) ? movePct : 0)))
  const move = m / 100
  const r = coveredCall({ move, cap, premium })
  return { ...r, movePct: m, move, kept: 100 * (1 + Math.min(move, cap)), full: 100 * (1 + move), ceiling: 100 * (1 + cap), coin: 100 * premium, coins: Math.round(100 * premium) }
}

/** 上漲時（拉桿 ≥ 1%，scene.eventWhen）放晴：太陽在塔的左後方（不擋住賣掉的空框）；參數固定，不跟著拉桿變 */
export const CC_RISE_MIN = 1
export const ccSunny = (): SpecOf<'sunnyTree'> => ({ kind: 'sunnyTree', sun: [-10, 8, -20] })

// ───────────── x-pay 每月配息 vs 淨值（真資料，不是示意） ─────────────

/**
 * 一排 13 根月底淨值柱（起點＋12 個月），每根前面一疊這個月的配息金幣（下金色＝收益、上紅色＝本金）。
 * 柱子從 floor（最低淨值往下取整再少 2 美元）起畫，所以看得到幾美元的差別；金幣用同一個「每美元多高」（unit），和柱子的落差可以直接比。
 */
export const NP_LAYOUT = { spacing: 2.4, barW: 1.4, unit: 1.2, coinZ: 1.9, coinR: 0.6, floorBelow: 2 } as const

export function navPayoutLayout(f: FundCheckup) {
  const nav = f.navMonthEnd.value
  if (!nav) throw new Error('checkup: no navMonthEnd')
  const months = [nav.baseline, ...nav.items]
  const floor = Math.floor(Math.min(...months.map((m) => m.nav))) - NP_LAYOUT.floorBelow
  const mid = (months.length - 1) / 2
  const hOf = (v: number) => (v - floor) * NP_LAYOUT.unit
  const bars = months.map((m, i) => ({ date: m.date, nav: m.nav, x: (i - mid) * NP_LAYOUT.spacing, h: hOf(m.nav) }))
  const coins = payoutSources(f).map((p) => {
    const bar = bars.find((b) => b.date.slice(0, 7) === p.recordDate.slice(0, 7))
    if (!bar) throw new Error(`checkup: no month-end NAV for the payout on ${p.recordDate}`)
    return { recordDate: p.recordDate, amount: p.amount, capitalPct: p.capitalPct, x: bar.x, incomeH: p.income * NP_LAYOUT.unit, capitalH: p.capital * NP_LAYOUT.unit }
  })
  return { floor, bars, coins, startY: hOf(nav.baseline.nav), endY: hOf(months.at(-1)!.nav) }
}

// ───────────── 體檢塔：x-card、x-mix、x-hy、x-fee、x-fin（真資料的資產大類） ─────────────

/** hyCrack＝龍捲風掃過時高收益債那幾層裂開的比例（≈ 示意）；塔站在交易所台座上（和 f-1、f-2 的基金塔同一個位置） */
export const CHECKUP_LAYOUT = { hyCrack: 0.5 } as const

/** 體檢塔每種內容的顏色（股票沿用組合塔的股票藍；掩護性買權自己一個紫色，x-mix 標得出來；高收益債用玻璃，和 b-2 一樣「容易裂」） */
export const CHECKUP_COLORS = { coveredCall: '#a78bfa', highYield: '#ffb300', bond: '#9fb3c8', preferred: '#d98c7a' } as const

const BASE_LOOK: Record<AssetKind, BlockLook> = {
  equity: { color: ACCENT_COLORS.stock, kind: 'matte' },
  coveredCall: { color: CHECKUP_COLORS.coveredCall, kind: 'matte' },
  highYield: { color: CHECKUP_COLORS.highYield, kind: 'glass' },
  bond: { color: CHECKUP_COLORS.bond, kind: 'metal' },
  preferred: { color: CHECKUP_COLORS.preferred, kind: 'matte' },
  cash: { color: ACCENT_COLORS.cash, kind: 'matte' },
}
/** 只給 Basket 用的資產類型（方塊數與塔的尺寸；顏色另外給） */
const ASSET_TYPE: Record<AssetKind, AssetType> = { equity: 'stock', coveredCall: 'stock', highYield: 'highYieldBond', bond: 'bondMixed', preferred: 'corpBond', cash: 'cash' }
const GROUP_ORDER: readonly AssetGroup[] = ['stock', 'bond', 'cash']
const idOf = (name: string) => `CK_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`

/**
 * 體檢塔的資料轉接：把快照的資產大類變成一座 Basket 畫得出來的基金塔（一個小 universe，只有這座塔和它的每一層）。
 * 一項一層：股票在下、借據與特別股、現金在上（sim/checkup 的三大類分法），同一類裡大到小；方塊數嚴格依權重（Basket 照常分配）。
 */
export function checkupBasket(f: FundCheckup) {
  const alloc = f.assetAllocation.value
  if (!alloc) throw new Error('checkup: no assetAllocation')
  const holdings = GROUP_ORDER.flatMap((g) =>
    alloc.items
      .filter((i) => ASSET_GROUP_OF[i.kind] === g)
      .sort((a, b) => b.pct - a.pct)
      .map((i) => ({ id: idOf(i.name), name: i.name, zh: i.zh, kind: i.kind, group: g, pct: i.pct })),
  )
  const source = [f.assetAllocation.source.url]
  const assets: Asset[] = [
    { id: f.id, name: f.id, type: 'fund', asOf: alloc.asOf, source, holdings: holdings.map((h) => ({ id: h.id, weightPct: h.pct })) },
    ...holdings.map((h): Asset => ({ id: h.id, name: h.zh, type: ASSET_TYPE[h.kind], asOf: alloc.asOf, source, aggregate: true })),
  ]
  const universe: Universe = new Map(assets.map((a) => [a.id, a] as const))
  return { productId: f.id, universe, holdings, looks: varyLooks(holdings.map((h) => BASE_LOOK[h.kind])) }
}

export type CheckupBasket = ReturnType<typeof checkupBasket>

/** 龍捲風掃過時，高收益債那幾層裂開多少（示意的比例；不是預測） */
export function checkupHyDamage(b: CheckupBasket): Record<string, number> {
  return Object.fromEntries(b.holdings.filter((h) => h.kind === 'highYield').map((h) => [h.id, CHECKUP_LAYOUT.hyCrack]))
}

// ───────────── x-where 錢放在哪（區域的島，越大越亮） ─────────────

/**
 * 廣場上一張簡單的地圖：每個區域一座方形島，面積 ∝ 比例（邊長 k·√%），最大的最亮（glow＝比例 ÷ 最大的比例）。
 * 位置只是大概的地理方向（城市本身只有台灣島和美國大陸）；資料多了沒列的區域排在前面一排。
 */
export const REGION_LAYOUT = {
  k: 1.1,
  spots: {
    'United States': [-10, 1],
    Canada: [-18.5, -2.5],
    UK: [-3.5, -3],
    'Europe ex-UK': [2.5, -2.5],
    EM: [3, 3.5],
    Japan: [11, -2.5],
    'Asia ex-Japan': [9.5, 2.5],
    Cash: [16, 3],
  } as Readonly<Record<string, readonly [number, number]>>,
  /** 沒有預設位置的區域：排在前面一排 */
  extraRow: { x0: -4, z: 7.5, step: 3 },
} as const

export function regionTiles(f: FundCheckup) {
  const items = sortedRegions(f)
  const max = Math.max(...items.map((i) => i.pct))
  let extra = 0
  return items.map((i) => {
    const spot = REGION_LAYOUT.spots[i.name] ?? [REGION_LAYOUT.extraRow.x0 + REGION_LAYOUT.extraRow.step * extra++, REGION_LAYOUT.extraRow.z]
    return { name: i.name, zh: i.zh, pct: i.pct, x: spot[0], z: spot[1], side: REGION_LAYOUT.k * Math.sqrt(i.pct), glow: i.pct / max, cash: i.name === 'Cash' }
  })
}

// ───────────── x-perf 每年兩座塔（基金 vs 它自己的藍圖） ─────────────

/** 每年一對柱子（左＝基金、右＝指標），從零線往上（漲）或往下（跌）；最差那年下面 🌋 */
export const PERF_LAYOUT = { yearGap: 6, pairGap: 1.1, barW: 1.6, unit: 0.22, zeroY: 3.4, pitZ: 3.2, pitWidth: 4.5 } as const

export function perfLayout(f: FundCheckup) {
  const r = annualReturns(f)
  // 曆年一年一對，最後多一對「今年到資料日」（不滿一年，畫成半透明）
  const mid = r.rows.length / 2
  const bar = (x: number, pct: number) => {
    const h = Math.abs(pct) * PERF_LAYOUT.unit
    return { x, pct, h, y: pct >= 0 ? PERF_LAYOUT.zeroY + h / 2 : PERF_LAYOUT.zeroY - h / 2 }
  }
  const years = r.rows.map((row, i) => {
    const x = (i - mid) * PERF_LAYOUT.yearGap
    return { year: row.year, x, fund: bar(x - PERF_LAYOUT.pairGap, row.fund), bench: bar(x + PERF_LAYOUT.pairGap, row.bench), down: row.fund < 0 }
  })
  const y = yearToDate(f)
  const yx = (r.rows.length - mid) * PERF_LAYOUT.yearGap
  const ytd = { asOf: y.asOf, x: yx, fund: bar(yx - PERF_LAYOUT.pairGap, y.fund), bench: bar(yx + PERF_LAYOUT.pairGap, y.bench) }
  const worst = years.find((y) => y.year === r.worst.year)!
  const quake: SpecOf<'quake'> = { kind: 'quake', depth: Number((Math.abs(Math.min(0, r.worst.pct)) / 100).toFixed(4)), at: [worst.x, PERF_LAYOUT.pitZ], width: PERF_LAYOUT.pitWidth }
  return { years, ytd, quake, span: r.rows.length * PERF_LAYOUT.yearGap + 2 * (PERF_LAYOUT.pairGap + PERF_LAYOUT.barW) }
}
