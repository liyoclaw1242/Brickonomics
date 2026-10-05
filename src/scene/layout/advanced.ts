import { STORM, stressTest, type StressResult } from '../../sim/portfolio'
import { STORM as TORNADO, timeAtX } from '../events/tornado'
import { clamp01, ramp, smooth } from '../events/ease'
import { IMPACT_TIME } from '../events/lightning'
import type { SpecOf } from '../events/types'
import { PAIRS, combine, volatility } from '../../sim/correlation'
import { DAY_TRADE, dayTradeDrain } from '../../sim/dayTrade'

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
