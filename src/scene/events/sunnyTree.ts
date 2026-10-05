import type { Vec3 } from '../camera'
import type { Quality } from '../quality'
import { clamp01, ramp, rand } from './ease'
import type { EventTimeline, SpecOf } from './types'

/**
 * 🌤 晴天＋大樹（長期成長、複利）的時間軸（純 TS）。
 * 一次只變一件事：先雲散開、太陽升起、光線變暖（天氣）→ 然後目標像樹一樣長高（treeGrowAt，給舞台用）。終點維持晴天。不閃光。
 * 時間 t 以秒計，從鏡頭停下起算；t = Infinity＝終點。座標相對廣場中心。
 *
 * 舞台用法：塔的高度由舞台決定（例如跟著月份拉桿）；沒有拉桿時可用 treeGrowAt(t)（0..1）當成長進度。
 * 樹冠用 SunnyTree.tsx 匯出的 TreeCrown（grow 0..1）。
 */

export const SUNNY = {
  /** 雲散開 */
  clearAt: 0.2,
  clear: 1.8,
  /** 太陽升起 */
  sunAt: 0.3,
  sun: 1.8,
  /** 光線變暖 */
  warmAt: 0.6,
  warm: 1.8,
  /** 天氣好了之後才開始長 */
  growAt: 1.6,
  grow: 2.6,
} as const

export const SUNNY_END = Math.max(SUNNY.clearAt + SUNNY.clear, SUNNY.sunAt + SUNNY.sun, SUNNY.warmAt + SUNNY.warm, SUNNY.growAt + SUNNY.grow)

/**
 * 太陽、雲在天上的位置（相對廣場中心）：太陽在舞台左後方、低低的（廣場鏡頭往下看約 30°，太高會跑出畫面上緣）。
 * 太陽從 sun 往下 rise 的地方升到 sun；三朵雲（相對太陽）一開始擋在太陽前面，放晴時往左右飄走。
 */
export const SKY = {
  sun: [-12, 7.5, -20] as Vec3,
  rise: 4.5,
  sunRadius: 1.7,
  clouds: [
    { at: [-2.4, 0.2, 2] as Vec3, drift: -10 },
    { at: [2.4, 0.7, 1.5] as Vec3, drift: 10 },
    { at: [0, -0.9, 2.5] as Vec3, drift: -6 },
  ],
} as const

/** 太陽最後的位置 */
export const sunOf = (spec: SpecOf<'sunnyTree'>): Vec3 => spec.sun ?? SKY.sun

export const warmthOf = (spec: SpecOf<'sunnyTree'>): number => clamp01(spec.warmth ?? 1)

export type SunnyState = {
  /** 天空放晴 0..1（雲散開） */
  clear: number
  /** 太陽升起 0..1 */
  sun: number
  /** 暖光強度 0..warmth */
  warm: number
}

/** 時間 t 的天氣；t 為 null＝還沒開始（陰天） */
export function sunnyAt(spec: SpecOf<'sunnyTree'>, t: number | null): SunnyState {
  if (t === null) return { clear: 0, sun: 0, warm: 0 }
  return { clear: ramp(t, SUNNY.clearAt, SUNNY.clear), sun: ramp(t, SUNNY.sunAt, SUNNY.sun), warm: warmthOf(spec) * ramp(t, SUNNY.warmAt, SUNNY.warm) }
}

export const sunnyFinal = (spec: SpecOf<'sunnyTree'>): SunnyState => ({ clear: 1, sun: 1, warm: warmthOf(spec) })

/** 舞台用：天氣好了之後的成長進度 0..1（t 為 null＝還沒開始） */
export const treeGrowAt = (t: number | null): number => (t === null ? 0 : ramp(t, SUNNY.growAt, SUNNY.grow))

/** 時間軸：跑到樹長完就停；大數字等開始長才數；終點有後果（長高了） */
export const SUNNY_TIMELINE: EventTimeline<SpecOf<'sunnyTree'>> = {
  duration: () => SUNNY_END,
  lingers: () => false,
  numberDelay: () => SUNNY.growAt,
  aftermath: () => true,
}

/** 各畫質：每朵雲的雲團數、光芒數、樹冠的葉團數 */
export const SUNNY_DETAIL: Record<Quality, { puffs: number; rays: number; crown: number }> = {
  high: { puffs: 5, rays: 12, crown: 9 },
  low: { puffs: 3, rays: 8, crown: 5 },
}

/** 樹冠的葉團（相對樹冠底部中心，以樹冠半徑為 1）：x、z 在半徑 1 內，y ≥ 0；delay＝依序冒出來的先後 0..1 */
export type CrownPuff = { x: number; y: number; z: number; s: number; delay: number; shade: number }
export function crownPuffs(n: number): CrownPuff[] {
  const out: CrownPuff[] = [{ x: 0, y: 0.75, z: 0, s: 0.75, delay: 0, shade: 0 }]
  for (let i = 1; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 2 + rand(i, 1) * 0.6
    const r = 0.45 + rand(i, 2) * 0.35
    out.push({ x: Math.cos(a) * r, y: 0.25 + rand(i, 3) * 0.6, z: Math.sin(a) * r, s: 0.45 + rand(i, 4) * 0.2, delay: (i / n) * 0.6, shade: i % 2 })
  }
  return out
}
