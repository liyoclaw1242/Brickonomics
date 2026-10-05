import type { Quality } from '../quality'
import { clamp01, ramp } from './ease'
import type { EventTimeline, FreezeTarget, SpecOf } from './types'

/**
 * ❄️ 寒流（升息）的時間軸（純 TS）。
 * 一陣寒風從左往右吹過（只一陣）→ 目標表面慢慢結霜（冰藍外殼、上面積雪、邊緣掛冰柱）；終點霜保留（＝最終狀態）。不閃光。
 * 霜的厚度＝amount × 這個目標的 length ÷ 最長的 length：同一陣寒流，長的借據結冰更厚（Plan 8 存續期間用）。
 * 時間 t 以秒計，從鏡頭停下起算；t = Infinity＝終點。
 *
 * 舞台用法：目標的顏色往 FROST 冰藍混 freezeTint(spec, i, t)（i＝targets 裡的第幾個）。
 */

export const FREEZE = {
  delay: 0.2,
  /** 一陣風：吹進來、吹著、吹走的秒數 */
  windIn: 0.4,
  windHold: 1.5,
  windOut: 0.6,
  /** 結霜：開始時間、花的秒數 */
  frostAt: 0.6,
  frost: 2.0,
  /** 霜等級 1 時：外殼厚度、冰柱長度（世界單位） */
  thickness: 0.32,
  icicle: 1.5,
  /** 霜等級 1 時目標顏色往冰藍混多少 */
  tint: 0.7,
} as const

const WIND_END = FREEZE.delay + FREEZE.windIn + FREEZE.windHold + FREEZE.windOut
export const FREEZE_END = Math.max(WIND_END, FREEZE.frostAt + FREEZE.frost)

/** 風的強度 0..1：只起伏一次（進來、停留、離開），之後永遠 0 */
export function windLevel(t: number): number {
  const a = FREEZE.delay
  if (!(t > a) || t >= WIND_END) return 0
  const up = ramp(t, a, FREEZE.windIn)
  const down = 1 - ramp(t, WIND_END - FREEZE.windOut, FREEZE.windOut)
  return Math.min(up, down)
}

/** 結霜進度 0..1（只增不減） */
export const frostProgress = (t: number): number => ramp(t, FREEZE.frostAt, FREEZE.frost)

const lengthOf = (tg: FreezeTarget): number => Math.max(0, tg.length ?? tg.size[0])

/** 每個目標的權重：length ÷ 最長的 length（最長的＝1） */
export function frostWeights(targets: readonly FreezeTarget[]): number[] {
  const max = Math.max(0, ...targets.map(lengthOf))
  return targets.map((tg) => (max > 0 ? lengthOf(tg) / max : 0))
}

/** 第 i 個目標最後的霜等級 0..1（＝ amount × 權重） */
export function frostOf(spec: SpecOf<'freeze'>, i: number): number {
  const tg = spec.targets[i]
  if (!tg) return 0
  const max = Math.max(0, ...spec.targets.map(lengthOf))
  return max > 0 ? clamp01(spec.amount) * (lengthOf(tg) / max) : 0
}

/** 第 i 個目標在時間 t 的霜等級；t 為 null＝還沒開始 */
export const frostLevel = (spec: SpecOf<'freeze'>, i: number, t: number | null): number =>
  t === null ? 0 : frostOf(spec, i) * frostProgress(t)

/** 舞台用：第 i 個目標的顏色往冰藍混多少 */
export const freezeTint = (spec: SpecOf<'freeze'>, i: number, t: number | null): number => FREEZE.tint * frostLevel(spec, i, t)

/** 時間軸：跑一次就停；大數字等開始結霜才數；終點有後果（結霜） */
export const FREEZE_TIMELINE: EventTimeline<SpecOf<'freeze'>> = {
  duration: () => FREEZE_END,
  lingers: () => false,
  numberDelay: () => FREEZE.frostAt,
  aftermath: () => true,
}

/** 各畫質：風絲、雪花、冰柱間距、冰柱總數上限 */
export const FREEZE_DETAIL: Record<Quality, { streaks: number; flakes: number; icicleGap: number; maxIcicles: number }> = {
  high: { streaks: 34, flakes: 40, icicleGap: 0.55, maxIcicles: 80 },
  low: { streaks: 12, flakes: 0, icicleGap: 1.1, maxIcicles: 30 },
}

/** 長 len 的目標掛幾根冰柱（沿著長邊等距） */
export const icicleCount = (len: number, quality: Quality): number => Math.max(1, Math.floor(len / FREEZE_DETAIL[quality].icicleGap))

/** 風吹過的範圍（相對廣場中心）：x 從 −span 到 +span，y 0..height，z ±depth */
export const WIND_FIELD = { span: 22, height: 7, depth: 7 } as const
