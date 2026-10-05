import { STORM, stressTest, type StressResult } from '../../sim/portfolio'
import { STORM as TORNADO, timeAtX } from '../events/tornado'
import { clamp01, ramp, smooth } from '../events/ease'
import { IMPACT_TIME } from '../events/lightning'
import type { SpecOf } from '../events/types'
import { PAIRS, combine, volatility } from '../../sim/correlation'
import { DAY_TRADE, dayTradeDrain } from '../../sim/dayTrade'
import { DURATION, priceChange } from '../../sim/duration'
import { FEE_DRAG, grow } from '../../sim/feeDrag'
import { LEVERAGE, leverageTowers } from '../../sim/leverage'
import type { HedgeExample, HedgeRow } from '../../sim/hedge'
import { REBALANCE, drift, rebalance } from '../../sim/rebalance'
import type { Vec3 } from '../camera'

/**
 * 高階步驟（Plan 8）的舞台幾何與拉桿 → 數值（純 TS；課文 levels.ts、3D 舞台、讀數共用同一份）。
 * 數值一律從 src/sim 的函式與它們的舉例常數算出來；座標相對廣場中心。
 */

// ───────────── a-port 自己蓋組合塔（🌪 龍捲風） ─────────────

/** 債券比例最多 80%：再多，這場示意風暴裡塔反而變高，「少掉」不成立 */
export const PORT_MAX_BOND = 80

/** 一座塔在廣場中間：寬 w；100 萬＝height 高 */
export const PORT_LAYOUT = { x: 0, w: 5, height: 12 } as const

export type PortNow = { bondPct: number; stockPct: number; before: { stock: number; bond: number }; after: StressResult }

/** 拉桿值 → 債券比例（取到 10 的倍數、限制在 0..PORT_MAX_BOND）與風暴前後各一截多少（投入 100） */
export function portNow(bondPct: number): PortNow {
  const b = Math.min(PORT_MAX_BOND, Math.max(0, Math.round((Number.isFinite(bondPct) ? bondPct : 0) / 10) * 10))
  const stockPct = 100 - b
  return { bondPct: b, stockPct, before: { stock: stockPct, bond: b }, after: stressTest({ stockPct, scenario: STORM }) }
}

/** 龍捲風掃到塔的進度 0..1（t＝事件時間；null＝還沒來） */
export function portDamageAt(t: number | null): number {
  if (t === null) return 0
  if (t === Infinity) return 1
  return smooth(clamp01((t - timeAtX(PORT_LAYOUT.x)) / TORNADO.damage))
}

/** 塔的兩截高度（世界單位）：damage 0＝風暴前、1＝風暴後，中間線性內插；top＝塔頂 */
export function portTower(bondPct: number, damage: number): { stock: number; bond: number; top: number } {
  const n = portNow(bondPct)
  const k = PORT_LAYOUT.height / 100
  const stock = (n.before.stock + (n.after.stock - n.before.stock) * damage) * k
  const bond = (n.before.bond + (n.after.bond - n.before.bond) * damage) * k
  return { stock, bond, top: stock + bond }
}

// ───────────── a-corr 一起跌或抵消（⚡ 閃電） ─────────────

/** ⚡ 打下的那一天＝舉例路徑 PAIRS 的第幾期（a 跌 8% 的那期） */
export const CORR_DAY = 1

/**
 * 兩組，各兩顆方塊用彈簧連著：左邊「一起動」（a＋same）、右邊「一上一下」（a＋opposite）。
 * pairs＝每組中心的 x；每組裡 A 在中心 − half、夥伴在中心 + half；方塊寬 w、100＝height 高。
 */
export const CORR_LAYOUT = { pairs: { together: -9, opposite: 9 }, half: 2.6, w: 2.8, height: 9 } as const

export type CorrNow = {
  /** ⚡ 那天各自漲跌多少（比例） */
  a: number
  together: number
  opposite: number
  /** 各放一半，合起來漲跌多少 */
  mixTogether: number
  mixOpposite: number
  /** 整段舉例裡平常晃多大（各期報酬率的標準差） */
  swing: { alone: number; together: number; opposite: number }
}

/** ⚡ 那天的漲跌與整段的晃動，全部從 sim/correlation 算 */
export function corrNow(): CorrNow {
  const mixT = combine(PAIRS.a, PAIRS.same, 0.5)
  const mixO = combine(PAIRS.a, PAIRS.opposite, 0.5)
  return {
    a: PAIRS.a[CORR_DAY]!,
    together: PAIRS.same[CORR_DAY]!,
    opposite: PAIRS.opposite[CORR_DAY]!,
    mixTogether: mixT[CORR_DAY]!,
    mixOpposite: mixO[CORR_DAY]!,
    swing: { alone: volatility(PAIRS.a), together: volatility(mixT), opposite: volatility(mixO) },
  }
}

/** 閃電打兩組裡的 A（同一家公司）：落點在 A 的頂面（還沒跌之前的高度） */
export const corrLightning = (): SpecOf<'lightning'> => ({
  kind: 'lightning',
  phase: 'strike',
  targets: [
    [CORR_LAYOUT.pairs.together - CORR_LAYOUT.half, CORR_LAYOUT.height, 0],
    [CORR_LAYOUT.pairs.opposite - CORR_LAYOUT.half, CORR_LAYOUT.height, 0],
  ],
})

/** 打中之後，方塊花多久變到新的高度（秒） */
const CORR_SETTLE = 0.5

/** 打中之後的進度 0..1（t＝事件時間；null＝還沒開始） */
export function corrDropAt(t: number | null): number {
  if (t === null) return 0
  if (t === Infinity) return 1
  return ramp(t, IMPACT_TIME, CORR_SETTLE)
}

export type CorrBlock = { id: 'togetherA' | 'togetherB' | 'oppositeA' | 'oppositeB'; x: number; move: number; h: number }

/** 四顆方塊的位置與高度（drop＝corrDropAt；高度＝height × (1 + 漲跌 × drop)） */
export function corrBlocks(drop: number): CorrBlock[] {
  const n = corrNow()
  const { pairs, half, height } = CORR_LAYOUT
  const b = (id: CorrBlock['id'], x: number, move: number): CorrBlock => ({ id, x, move, h: height * (1 + move * drop) })
  return [
    b('togetherA', pairs.together - half, n.a),
    b('togetherB', pairs.together + half, n.together),
    b('oppositeA', pairs.opposite - half, n.a),
    b('oppositeB', pairs.opposite + half, n.opposite),
  ]
}

// ───────────── a-dt 當沖的成本 ─────────────

/** 左邊一座塔＝本金（100 萬＝height 高）；右邊一堆紅色＝一路付掉的交易成本；前面一排小圓片＝賺、賠各一半 */
export const DT_LAYOUT = { towerX: -3.6, pileX: 3.6, w: 4, height: 10, chipsZ: 4.2, chips: 10, chipR: 0.5, chipGap: 1.3 } as const

export type DtNow = { n: number; capital: number; costPaid: number; costPerTrade: number }

/** 拉桿值 → 進出幾次（10 的倍數、0..DAY_TRADE.trades）與期望的本金、付掉的成本（起點 100） */
export function dtNow(trades: number): DtNow {
  const n = Math.min(DAY_TRADE.trades, Math.max(0, Math.round((Number.isFinite(trades) ? trades : 0) / 10) * 10))
  const r = dayTradeDrain({ ...DAY_TRADE, trades: n })
  return { n, capital: r.capitalAfter, costPaid: r.costPaid, costPerTrade: DAY_TRADE.costPerTrade }
}

/** 塔高與紅色那堆的高度（世界單位）：兩個加起來永遠＝原本的高度 */
export function dtTower(trades: number): { capital: number; cost: number } {
  const d = dtNow(trades)
  const k = DT_LAYOUT.height / 100
  return { capital: d.capital * k, cost: d.costPaid * k }
}

// ───────────── a-dur 長短借據（❄️ 寒流） ─────────────

/**
 * 兩個翹翹板並排：左邊短板（2 年借據）、右邊長板（20 年借據）。左端一樣高的藍柱＝市場利率，右端坐借據。
 * half＝板子半長；tilt＝價格每少 100% 斜多少（弧度；放大看得出來，示意）；x、z＝支點的位置。
 */
export const DUR_LAYOUT = {
  pivotY: 2.4,
  thick: 0.35,
  width: 2.4,
  tilt: 2,
  half: { short: 3.2, long: 9.5 },
  x: { short: -10.5, long: 6 },
  z: { short: 0, long: 0 },
  bond: [2.6, 1.4, 2] as Vec3,
  rateW: 1.6,
  rateH: 60,
} as const

export type DurKey = 'short' | 'long'

/** 拉桿值 → 市場利率（限制在 DURATION.rateFrom..rateTo）與兩張借據的價格變動（比例） */
export function durNow(rate: number): { rate: number; short: number; long: number } {
  const r = Math.min(DURATION.rateTo, Math.max(DURATION.rateFrom, Number.isFinite(rate) ? rate : DURATION.rateFrom))
  return { rate: r, short: priceChange(DURATION.short, DURATION.rateFrom, r), long: priceChange(DURATION.long, DURATION.rateFrom, r) }
}

/** 某個翹翹板在利率 rate 時的樣子：theta > 0＝右端（借據）往下；left、right＝兩端板子中線的 x、y（相對它自己的支點） */
export function durPose(k: DurKey, rate: number): { theta: number; left: [number, number]; right: [number, number] } {
  const change = durNow(rate)[k]
  const theta = -change * DUR_LAYOUT.tilt || 0 // 不要 −0
  const half = DUR_LAYOUT.half[k]
  const c = Math.cos(theta) * half
  const s = Math.sin(theta) * half
  return { theta, left: [-c, DUR_LAYOUT.pivotY + s], right: [c, DUR_LAYOUT.pivotY - s] }
}

/** 寒流：兩張借據在 3% 時坐的位置；length＝年期（20 年那張霜更厚）。參數固定，拉到 3% 才打開（scene.eventWhen） */
export function durFreeze(): SpecOf<'freeze'> {
  const target = (k: DurKey) => {
    const [x, y] = durPose(k, DURATION.rateTo).right
    return { at: [DUR_LAYOUT.x[k] + x, y + DUR_LAYOUT.thick / 2, DUR_LAYOUT.z[k]] as Vec3, size: DUR_LAYOUT.bond, length: DURATION[k] }
  }
  return { kind: 'freeze', amount: 0.9, targets: [target('short'), target('long')] }
}

// ───────────── a-fee30 主動 vs 被動 30 年（🌤 晴天大樹） ─────────────

/** 兩座塔像兩棵樹：左邊主動（怪手挑的基金）、右邊被動（照藍圖的 0050）；unit＝每 1 萬多高；紅色帽子＝費用吃掉的 */
export const FEE_TREES = { x: { active: -5, passive: 5 }, w: 3.2, unit: 0.02, crown: 2.2 } as const

export type FeeTree = { fee: number; value: number; lost: number }
export type FeeTreesNow = { years: number; active: FeeTree; passive: FeeTree; noFee: number; gap: number }

/**
 * 拉桿值 → 經過幾年（整數、0..FEE_DRAG.years）與兩棵樹的價值（投入 100 萬，扣費前每年一樣 FEE_DRAG.grossReturn）。
 * fees＝兩檔每年的內扣費用（從資料讀；呼叫端傳進來，這裡不載入資料）。value＋lost＝完全沒有費用時的價值。
 */
export function feeTreesNow(years: number, fees: { active: number; passive: number }): FeeTreesNow {
  const y = Math.min(FEE_DRAG.years, Math.max(0, Math.round(Number.isFinite(years) ? years : 0)))
  const noFee = grow(FEE_DRAG.principal, FEE_DRAG.grossReturn, 0, y)
  const tree = (fee: number): FeeTree => {
    const value = grow(FEE_DRAG.principal, FEE_DRAG.grossReturn, fee, y)
    return { fee, value, lost: noFee - value }
  }
  const active = tree(fees.active)
  const passive = tree(fees.passive)
  return { years: y, active, passive, noFee, gap: passive.value - active.value }
}

/** 晴天：太陽在兩棵樹中間的後上方（手機上也不會被切掉）；一進來就放晴，樹跟著年數拉桿長 */
export const feeSunny = (): SpecOf<'sunnyTree'> => ({ kind: 'sunnyTree', sun: [0, 9, -20] })

// ───────────── a-lev 槓桿的耗損（🌊 大浪） ─────────────

/** 三座塔站在水裡：大盤、2 倍塔、反向塔（通用名稱）；100＝unit × 100 高；water＝水面寬、深 */
export const LEV_LAYOUT = { x: [-6.5, 0, 6.5] as readonly number[], w: 3, unit: 0.07, water: [24, 9] as [number, number] } as const

export type LevNow = {
  plain: number[]
  double: number[]
  inverse: number[]
  /** 跌一次再漲一次（一道浪）之後各少掉多少（比例） */
  round: { plain: number; double: number; inverse: number }
}

/** 三座塔每一步的高度（sim/leverage 的 leverageTowers），以及一道浪各磨掉多少 */
export function levNow(): LevNow {
  const t = leverageTowers(LEVERAGE)
  const r = (p: number[]) => 1 - p[2]! / p[0]!
  return { ...t, round: { plain: r(t.plain), double: r(t.double), inverse: r(t.inverse) } }
}

/** 大浪：一道浪＝一次跌再漲（LEVERAGE.rounds 道），浪頭打到三座塔時噴浪花；塔高由舞台沿 levNow 的路徑取 */
export function levWave(): SpecOf<'wave'> {
  const h = 100 * LEV_LAYOUT.unit
  return {
    kind: 'wave',
    waves: LEVERAGE.rounds,
    size: LEV_LAYOUT.water,
    targets: LEV_LAYOUT.x.map((x) => ({ at: [x, 0, 0] as Vec3, size: [LEV_LAYOUT.w, h, LEV_LAYOUT.w] as Vec3 })),
  }
}

// ───────────── a-hedge 反向來對沖（⚡ 閃電） ─────────────

/** 拉桿的三種情境（照順序）：平穩一年、慢慢漲一年、⚡ 打下那天 */
export const HEDGE_CASES = ['flat', 'rising', 'strike'] as const
export type HedgeCase = (typeof HEDGE_CASES)[number]

/** 三座塔：全押 0050、0050＋反向、少買 0050＋現金；100 萬＝unit × 100 高 */
export const HEDGE_LAYOUT = { x: [-7, 0, 7] as readonly number[], w: 3.4, unit: 0.08 } as const

export type HedgeTower = { id: HedgeRow['id']; base: number; inverse: number; cash: number; total: number }

/** 拉桿值 → 第幾種情境（0..2） */
export const hedgeCaseIndex = (v: number): number => Math.min(HEDGE_CASES.length - 1, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)))

/**
 * 三座塔在某個情境的三截（萬）：0050 那截＝買的比例 × 大盤漲跌（含費用；＝全押那座 ÷ 100），現金不動，反向那截＝其餘。
 * drop（0..1）＝⚡ 打中之後的進度：⚡ 情境在打中之前畫起點（100 的分法），其他情境 drop 不影響。
 */
export function hedgeTowers(ex: HedgeExample, caseIdx: number, drop: number): HedgeTower[] {
  const c = HEDGE_CASES[hedgeCaseIndex(caseIdx)]!
  const k = c === 'strike' ? drop : 1
  return ex.rows.map((r) => {
    const factor = ex.rows.find((x) => x.id === 'plain')![c] / 100
    const end = { base: r.basePct * factor, cash: r.cashPct, total: r[c] }
    const endInverse = end.total - end.base - end.cash
    const lerp = (a: number, b: number) => a + (b - a) * k
    const base = lerp(r.basePct, end.base)
    const inverse = lerp(r.inversePct, endInverse)
    return { id: r.id, base, inverse, cash: r.cashPct, total: base + inverse + r.cashPct }
  })
}

/** 閃電打三座塔的塔頂（三座都有 0050）；拉到 ⚡ 情境才打（scene.eventWhen） */
export const hedgeLightning = (): SpecOf<'lightning'> => ({
  kind: 'lightning',
  phase: 'strike',
  targets: HEDGE_LAYOUT.x.map((x): Vec3 => [x, 100 * HEDGE_LAYOUT.unit, 0]),
})

/** ⚡ 打中之後的進度 0..1（和 a-corr 一樣） */
export const hedgeDropAt = corrDropAt

// ───────────── a-rebal 剪高補低（再平衡） ─────────────

/** 一座組合塔（股票在下、債券在上）；unit＝每 1 萬多高；一條目標線在股票該到的高度 */
export const REBAL_LAYOUT = { x: 0, w: 5.5, unit: 0.1 } as const

export type RebalNow = { stage: number; stock: number; bond: number; total: number; stockPct: number; moved: number }

/** 拉桿值 → 第幾步（0 一開始、1 股票漲了一年、2 剪高補低）與兩截各多少（sim/rebalance） */
export function rebalNow(v: number): RebalNow {
  const stage = Math.min(2, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)))
  const t = REBALANCE.targetStockPct
  if (stage === 0) return { stage, stock: t, bond: 100 - t, total: 100, stockPct: t, moved: 0 }
  const d = drift(REBALANCE)
  if (stage === 1) return { stage, stock: d.stock, bond: d.bond, total: d.total, stockPct: d.stockPct, moved: 0 }
  const r = rebalance(d, t)
  return { stage, stock: r.stock, bond: r.bond, total: r.total, stockPct: r.stockPct, moved: r.moved }
}

/** 塔的兩截高度與目標線的高度（世界單位） */
export function rebalTower(v: number): { stock: number; bond: number; target: number } {
  const n = rebalNow(v)
  const k = REBAL_LAYOUT.unit
  return { stock: n.stock * k, bond: n.bond * k, target: ((n.total * REBALANCE.targetStockPct) / 100) * k }
}
