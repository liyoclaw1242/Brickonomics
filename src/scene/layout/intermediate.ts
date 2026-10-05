import { maxDrawdown } from '../../sim/drawdown'
import { yearsToPayBack } from '../../sim/valuation'
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
