import type { EventSpec, EventTimeline, SpecOf } from './types'

/**
 * c-1／c-2「假設台積電跌 30%」的閃電：時間軸（純 TS、只有數字，不載入資料或方塊）。
 * 時間 t 以秒計，從 c-2 鏡頭停下起算；t = Infinity＝終點（＝原本靜態的 active 畫面）。
 * 烏雲位置、閃電路徑、誰被打中等幾何在 ./lightningBolt.ts。
 */

export const LIGHTNING = {
  /** 鏡頭停下後先看雲一下，再打 */
  delay: 0.6,
  /** 閃電從雲長到地面的秒數 */
  grow: 0.2,
  /** 打中後亮著的秒數 */
  hold: 0.3,
  /** 光慢慢退掉的秒數 */
  fade: 0.8,
  /** 整個畫面變亮一次：上升、衰減秒數 */
  flashRise: 0.05,
  flashDecay: 0.3,
} as const

/** 打中的那一刻（損傷、跌幅標籤在這時出現） */
export const IMPACT_TIME = LIGHTNING.delay + LIGHTNING.grow
/** 動畫結束（之後不再要求重繪） */
export const STRIKE_END = IMPACT_TIME + LIGHTNING.hold + LIGHTNING.fade

export const isStruck = (t: number): boolean => t >= IMPACT_TIME

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** 閃電長出來的比例 0..1 */
export const boltReveal = (t: number): number => clamp01((t - LIGHTNING.delay) / LIGHTNING.grow)

/** 閃電亮度 0..1：長出來時全亮，停一下，然後線性退到 0（只有一次） */
export function boltGlow(t: number): number {
  if (!(t >= LIGHTNING.delay)) return 0
  if (t <= IMPACT_TIME + LIGHTNING.hold) return 1
  return clamp01(1 - (t - IMPACT_TIME - LIGHTNING.hold) / LIGHTNING.fade)
}

/** 整個畫面的閃光 0..1：打中那一刻一個脈衝，之後歸零（不閃爍） */
export function flashLevel(t: number): number {
  const u = t - IMPACT_TIME
  if (u < -LIGHTNING.flashRise || u > LIGHTNING.flashDecay) return 0
  if (u <= 0) return 1 + u / LIGHTNING.flashRise
  return 1 - u / LIGHTNING.flashDecay
}

/** 事件時間軸：gather（c-1）只有烏雲、靜態；strike（c-2）打一次，光退掉就停止持續繪製；面板大數字等打中才數 */
export const LIGHTNING_TIMELINE: EventTimeline<SpecOf<'lightning'>> = {
  duration: (spec) => (spec.phase === 'strike' ? STRIKE_END : 0),
  lingers: () => false,
  numberDelay: (spec) => (spec.phase === 'strike' ? IMPACT_TIME : 0),
  aftermath: (spec) => spec.phase === 'strike',
}

/** 這個事件會不會打下來（c-2）；也給沒有 3D 的地方（城市縮小、讀數）判斷用 */
export const isStrike = (spec: EventSpec | undefined): boolean => spec?.kind === 'lightning' && spec.phase === 'strike'

/** 舞台讀事件時鐘用：t（null＝還沒開始）時是否已經打中 */
export const strikeAt = (spec: EventSpec | undefined, t: number | null): boolean => isStrike(spec) && t !== null && isStruck(t)
