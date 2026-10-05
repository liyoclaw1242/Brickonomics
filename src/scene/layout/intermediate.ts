import { maxDrawdown } from '../../sim/drawdown'
import { yearsToPayBack } from '../../sim/valuation'
import { bondPrice, FACE } from '../../sim/bondPrice'
import { dca, type DcaResult } from '../../sim/dca'
import type { Vec3 } from '../camera'
import { QUAKE } from '../events/quake'
import type { SpecOf } from '../events/types'

/**
 * 中階新步驟（Plan 7）的舉例參數與舞台幾何（純 TS；課文 levels.ts、3D 舞台、讀數共用同一份）。
 * 每個觀念一個常數物件；畫面上的數字一律從這些參數與 src/sim 的函式算出來。座標相對廣場中心。
 */

// ───────────── s-dd 最大跌幅（🌋 地震） ─────────────

/** 舉例的價格路徑（每年一個點）：漲到 140、跌到 84（少 40%）、再長回 120。示意，不代表任何真實股票 */
export const DD_DEMO = { path: [100, 115, 130, 140, 112, 84, 100, 120] as readonly number[] } as const

const DD_WORST = maxDrawdown(DD_DEMO.path)
const DD_PEAK = DD_DEMO.path[DD_WORST.peakIndex]!

/** 一排柱子（時間線）：柱寬、間距、z；坑在谷底那根柱子前面 */
export const DD_LAYOUT = { barW: 2, gap: 2.8, barZ: -1.5, pitZ: 3, pitWidth: 4.6 } as const

/** 柱高：最高點那根＝QUAKE.maxDepth，所以谷底柱子上「少掉的那一段」剛好和坑一樣深 */
export const ddHeight = (price: number): number => (price / DD_PEAK) * QUAKE.maxDepth

/** 第 i 根柱子的 x（整排置中） */
export const ddBarX = (i: number): number => (i - (DD_DEMO.path.length - 1) / 2) * DD_LAYOUT.gap

/** 拉桿值 → 路徑上的點（四捨五入、限制在路徑內） */
export const ddIndex = (tick: number): number => Math.min(DD_DEMO.path.length - 1, Math.max(0, Math.round(Number.isFinite(tick) ? tick : 0)))

/** 谷底在第幾個點（s-dd 拉到這裡才地震、才能下一步） */
export const DD_TROUGH = DD_WORST.troughIndex

/** 地震：坑深＝最大跌幅（depth 0..1），坑在谷底柱子前面。參數固定（scene.eventWhen 只決定開或關） */
export const ddQuake = (): SpecOf<'quake'> => ({ kind: 'quake', depth: DD_WORST.pct, at: [ddBarX(DD_TROUGH), DD_LAYOUT.pitZ], width: DD_LAYOUT.pitWidth })

export type DdNow = {
  index: number
  price: number
  /** 到目前為止的最高價 */
  peak: number
  peakIndex: number
  /** 現在比最高點少掉的比例 */
  drop: number
  /** 到目前為止最多曾經少掉的比例（最大跌幅） */
  worst: number
}

/** 時間軸走到 tick 時的狀態 */
export function ddNow(tick: number): DdNow {
  const index = ddIndex(tick)
  const seen = DD_DEMO.path.slice(0, index + 1)
  const peak = Math.max(...seen)
  const price = seen[index]!
  return { index, price, peak, peakIndex: seen.indexOf(peak), drop: (peak - price) / peak, worst: maxDrawdown(seen).pct }
}

// ───────────── s-pe 本益比（🫧 泡泡） ─────────────

/** 兩棟舉例大樓：股價一樣，每年每股賺的錢不同。示意，不代表任何真實公司 */
export const PE_DEMO = { price: 600, earnings: { cheap: 40, pricey: 10 } } as const
export type PeKey = keyof typeof PE_DEMO.earnings

/** 大樓高 height（＝股價）；旁邊一疊「每年賺的錢」，一年一片，疊滿＝賺回股價 */
export const PE_LAYOUT = {
  height: 7,
  size: 3,
  x: { cheap: -8.5, pricey: 7.5 },
  slabX: { cheap: -4, pricey: 2.6 },
  slabW: 2.2,
} as const

/** 要賺幾年才賺回股價（本益比） */
export const peYears = (k: PeKey): number => yearsToPayBack(PE_DEMO.price, PE_DEMO.earnings[k])

/** 經過 periods 年時疊了幾片（一年一片，疊滿就停）；pitch＝每片佔的高度（疊滿＝大樓高） */
export function peSlabs(k: PeKey, periods: number): { count: number; pitch: number } {
  const years = peYears(k)
  const n = Math.floor(Number.isFinite(periods) ? Math.max(0, periods) : 0)
  return { count: Math.min(n, years), pitch: PE_LAYOUT.height / years }
}

/** 泡泡包住年數多（太貴）的那棟；參數固定，經過年數數滿時（scene.eventWhen）才浮起 */
export const peBubble = (): SpecOf<'bubble'> => ({
  kind: 'bubble',
  phase: 'float',
  target: { at: [PE_LAYOUT.x.pricey, 0, 0], size: [PE_LAYOUT.size, PE_LAYOUT.height, PE_LAYOUT.size] },
})

// ───────────── b-rate 利率翹翹板（❄️ 寒流） ─────────────

/** 舉例的舊借據：每年利息 2%、還有 10 年到期；市場利率從 2% 漲到 5%。示意 */
export const RATE_DEMO = { coupon: 0.02, years: 10, from: 0.02, to: 0.05 } as const

/** 市場利率 rate 時，舊借據（面額 100）今天值多少 */
export const ratePrice = (rate: number): number => bondPrice({ coupon: RATE_DEMO.coupon, years: RATE_DEMO.years, rate })

/**
 * 翹翹板：支點高 pivotY、板子半長 half、厚 thick；tilt＝價格每少 100% 斜多少（弧度）。
 * 左端坐「市場利率」（高度＝利率 × rateH），右端坐舊借據（bond＝寬高深）。
 */
export const SEESAW = { pivotY: 2.2, half: 9, thick: 0.35, width: 2.8, tilt: 0.9, rateW: 2.8, rateH: 70, bond: [3.6, 1.6, 2.4] as Vec3 } as const

export type SeesawPose = { theta: number; price: number; left: [number, number]; right: [number, number] }

/** 市場利率 rate 時翹翹板的樣子：theta > 0＝右端（價格）往下；left、right＝兩端板子中線的 x、y */
export function seesawPose(rate: number): SeesawPose {
  const price = ratePrice(rate)
  const theta = ((FACE - price) / FACE) * SEESAW.tilt
  const c = Math.cos(theta) * SEESAW.half
  const s = Math.sin(theta) * SEESAW.half
  return { theta, price, left: [-c, SEESAW.pivotY + s], right: [c, SEESAW.pivotY - s] }
}

/** 寒流：目標＝拉到 5% 時舊借據坐的位置（參數固定；scene.eventWhen 拉到 5% 才打開，所以霜一定貼在借據上） */
export function rateFreeze(): SpecOf<'freeze'> {
  const [x, y] = seesawPose(RATE_DEMO.to).right
  return { kind: 'freeze', amount: 0.9, targets: [{ at: [x, y + SEESAW.thick / 2, 0], size: SEESAW.bond }] }
}

// ───────────── e-dca 定期定額（🌤 晴天大樹） ─────────────

/** 舉例：12 個月的價格（先跌後漲回來）、每月固定投入 3000 元。示意，不代表任何真實商品 */
export const DCA_DEMO = { prices: [50, 45, 40, 32, 25, 30, 36, 40, 45, 48, 50, 50] as readonly number[], amount: 3000 } as const

/** 每月一小堆（高度＝買到的單位 × unitH），右邊一座塔（＝累積的單位；12 個月時高 towerH） */
export const DCA_LAYOUT = { pileW: 0.95, gap: 1.3, x0: -12, z: 0, unitH: 0.04, towerX: 7.5, towerW: 2.6, towerH: 9, crown: 2.3 } as const

const DCA_FULL = dca(DCA_DEMO.prices, DCA_DEMO.amount)

/** 拉桿值 → 買了幾個月（1..12） */
export function dcaNow(months: number): { months: number; result: DcaResult } {
  const n = Math.min(DCA_DEMO.prices.length, Math.max(1, Math.round(Number.isFinite(months) ? months : 1)))
  return { months: n, result: dca(DCA_DEMO.prices.slice(0, n), DCA_DEMO.amount) }
}

export const dcaPileX = (i: number): number => DCA_LAYOUT.x0 + i * DCA_LAYOUT.gap
export const dcaPileHeight = (i: number): number => DCA_FULL.units[i]! * DCA_LAYOUT.unitH
/** 塔高：累積單位 ÷ 12 個月的總單位 × towerH */
export const dcaTowerHeight = (months: number): number => (dcaNow(months).result.totalUnits / DCA_FULL.totalUnits) * DCA_LAYOUT.towerH
/** 最便宜的月份（買最多的那一堆） */
export const dcaCheapest = (): number => DCA_DEMO.prices.indexOf(Math.min(...DCA_DEMO.prices))

/** 晴天大樹：太陽放在畫面中間偏左上（手機上也不會被切掉）；天氣一進來就放晴，塔跟著月份拉桿長高 */
export const dcaSunny = (): SpecOf<'sunnyTree'> => ({ kind: 'sunnyTree', sun: [-3, 8, -20] })
