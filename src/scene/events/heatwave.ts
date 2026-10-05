import type { Quality } from '../quality'
import { clamp01, ramp } from './ease'
import type { EventTimeline, SpecOf } from './types'

/**
 * ☀️ 熱浪（通膨）的時間軸（純 TS）。
 * 一次只變一件事：先熱起來（烈日升起、暖色的霧、熱氣線）→ 然後金幣慢慢融化變小，最後少掉 melt 那麼多（終點保留）。不閃光。
 * 時間 t 以秒計，從鏡頭停下起算；t = Infinity＝終點。
 *
 * 舞台用法：金幣（堆）的大小乘 coinScaleAt(spec, clock.t.current)；融化的金色水窪由事件畫在 spec.coins 下面。
 */

export const HEAT = {
  /** 熱起來：開始時間、花的秒數 */
  heatAt: 0.2,
  heat: 1.2,
  /** 融化：熱起來之後才開始，慢慢融（夠慢才看得出「慢慢變小」） */
  meltAt: 1.2,
  melt: 2.8,
  /** 熱氣線左右扭動的幅度、往上飄的速度 */
  shimmerAmp: 0.22,
  rise: 0.9,
} as const

export const HEAT_END = Math.max(HEAT.heatAt + HEAT.heat, HEAT.meltAt + HEAT.melt)

/** 熱的程度 0..1（霧、暖光、熱氣線；只增不減） */
export const heatLevel = (t: number): number => ramp(t, HEAT.heatAt, HEAT.heat)

/** 最後融掉的比例（限制 0..1） */
export const meltOf = (spec: SpecOf<'heatwave'>): number => clamp01(spec.melt)

/** 時間 t 已經融掉的比例；t 為 null＝還沒開始 */
export const meltAt = (spec: SpecOf<'heatwave'>, t: number | null): number => (t === null ? 0 : meltOf(spec) * ramp(t, HEAT.meltAt, HEAT.melt))

/** 舞台用：金幣的大小倍數（1＝原樣；終點＝1 − melt） */
export const coinScaleAt = (spec: SpecOf<'heatwave'>, t: number | null): number => 1 - meltAt(spec, t)

/** 熱氣線在高度 y 的左右偏移（time＝秒、phase＝每條線自己的相位） */
export const shimmerOffset = (y: number, time: number, phase: number): number => HEAT.shimmerAmp * Math.sin(y * 1.6 - time * 2.2 + phase)

/** 時間軸：跑一次就停；大數字等開始融化才數；終點有後果（金幣變小） */
export const HEAT_TIMELINE: EventTimeline<SpecOf<'heatwave'>> = {
  duration: () => HEAT_END,
  lingers: () => false,
  numberDelay: () => HEAT.meltAt,
  aftermath: () => true,
}

/** 各畫質：熱氣線條數、每條的段數、光芒數 */
export const HEAT_DETAIL: Record<Quality, { lines: number; segments: number; rays: number }> = {
  high: { lines: 16, segments: 8, rays: 16 },
  low: { lines: 8, segments: 4, rays: 8 },
}

/** 熱氣線出現的範圍（相對廣場中心）：x ±span、z ±depth、從地面往上 height */
export const HEAT_FIELD = { span: 13, depth: 5, height: 6 } as const

/** 烈日的位置（相對廣場中心；右後方、低低的，留在廣場鏡頭的畫面裡）與大小 */
export const HEAT_SUN = { at: [11, 7.5, -20] as [number, number, number], radius: 2.1 } as const

/** 水窪：最大半徑（相對金幣半徑） */
export const PUDDLE_GROW = 0.9
