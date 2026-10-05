import type { Quality } from '../quality'
import { clamp01, hump, ramp, rand } from './ease'
import type { EventTimeline, SpecOf } from './types'

/**
 * 🌋 地震＋地裂（股市崩盤、最大跌幅）的時間軸與幾何（純 TS）。
 * 3b1b「一次只變一件事」：地面震一次（短）→ 地面裂開 → 坑往下沉到 depth；終點坑保留（＝最終狀態）。
 * 不閃光。時間 t 以秒計，從鏡頭停下起算；t = Infinity＝終點。座標相對坑中心（元件再加 spec.at 與 atPlaza）。
 *
 * 舞台用法：每幀讀 quakeAt(spec, clock.t.current)，把 shakeX／shakeZ 加到自己方塊的位置上（一起震）；
 * 坑的深度要和舞台的數字對應時用 pitDepthOf(spec)（＝ depth × QUAKE.maxDepth）。
 */

export const QUAKE = {
  /** 鏡頭停下後先停一下再震 */
  delay: 0.2,
  /** 震動的秒數（只一次、短） */
  shake: 0.9,
  /** 最大位移（世界單位）與震動頻率（rad/s） */
  amp: 0.2,
  freq: 44,
  /** 裂開：開始時間、花的秒數 */
  openAt: 0.5,
  open: 0.7,
  /** 坑往下沉：開始時間、花的秒數 */
  sinkAt: 0.8,
  sink: 1.3,
  /** 塵土噴起又落下 */
  dustAt: 0.55,
  dust: 1.5,
  /** 地面一圈波紋（只一圈、淡淡的） */
  rippleAt: 0.25,
  ripple: 0.9,
  /** depth = 1 時坑的深度（世界單位） */
  maxDepth: 6,
  /** 預設坑寬（x 方向；z 方向窄一點，像一道裂縫） */
  width: 8,
  /** 坑在 z 方向相對 x 的比例 */
  aspect: 0.55,
} as const

/** 動畫全部結束：震完、坑沉到底、塵落下 */
export const QUAKE_END = Math.max(QUAKE.delay + QUAKE.shake, QUAKE.sinkAt + QUAKE.sink, QUAKE.dustAt + QUAKE.dust, QUAKE.rippleAt + QUAKE.ripple)

/** 坑的深度（世界單位）＝ depth（限制 0..1）× maxDepth */
export const pitDepthOf = (spec: SpecOf<'quake'>): number => clamp01(spec.depth) * QUAKE.maxDepth

/** 震動強度 0..1：只有一個拱（震一次），之後永遠 0 */
export const shakeLevel = (t: number): number => hump(t, QUAKE.delay, QUAKE.shake)

export type QuakeState = {
  /** 地面（與舞台方塊）此刻的水平位移 */
  shakeX: number
  shakeZ: number
  /** 裂口張開 0..1（坑的寬度比例） */
  open: number
  /** 坑目前的深度（世界單位） */
  depth: number
  /** 塵土 0..1（噴起又落下） */
  dust: number
  /** 地面波紋的進度 0..1；null＝沒有 */
  ripple: number | null
}

const NOTHING: QuakeState = { shakeX: 0, shakeZ: 0, open: 0, depth: 0, dust: 0, ripple: null }

/** 時間 t 的畫面狀態；t 為 null＝還沒開始（沒有坑） */
export function quakeAt(spec: SpecOf<'quake'>, t: number | null): QuakeState {
  if (t === null) return NOTHING
  const e = shakeLevel(t)
  const u = (t - QUAKE.rippleAt) / QUAKE.ripple
  return {
    shakeX: e > 0 ? QUAKE.amp * e * Math.sin(QUAKE.freq * t) : 0,
    shakeZ: e > 0 ? QUAKE.amp * 0.5 * e * Math.sin(QUAKE.freq * 0.73 * t + 1.1) : 0,
    open: ramp(t, QUAKE.openAt, QUAKE.open),
    depth: pitDepthOf(spec) * ramp(t, QUAKE.sinkAt, QUAKE.sink),
    dust: hump(t, QUAKE.dustAt, QUAKE.dust),
    ripple: u >= 0 && u < 1 ? u : null,
  }
}

/** 終點（減少動態時直接畫這個）：坑保留，其餘歸零 */
export const quakeFinal = (spec: SpecOf<'quake'>): QuakeState => ({ ...NOTHING, open: 1, depth: pitDepthOf(spec) })

/** 時間軸：跑一次就停；面板大數字等裂開才數；終點有後果（坑） */
export const QUAKE_TIMELINE: EventTimeline<SpecOf<'quake'>> = {
  duration: () => QUAKE_END,
  lingers: () => false,
  numberDelay: () => QUAKE.openAt,
  aftermath: () => true,
}

/** 各畫質的細節：坑邊的點數、坑邊翹起的地磚、裂痕、塵土 */
export const QUAKE_DETAIL: Record<Quality, { points: number; slabs: number; cracks: number; dust: number }> = {
  high: { points: 16, slabs: 12, cracks: 10, dust: 18 },
  low: { points: 9, slabs: 6, cracks: 5, dust: 8 },
}

/** 坑的輪廓（相對坑中心的 x、z，依角度排序）：鋸齒的橢圓，x 方向半徑 width/2，z 方向乘 QUAKE.aspect */
export function pitOutline(width: number, points: number): [number, number][] {
  const rx = width / 2
  const rz = rx * QUAKE.aspect
  const out: [number, number][] = []
  for (let i = 0; i < points; i++) {
    // 角度從 −π 往上（atan2 的範圍內遞增）；每個點稍微錯開，半徑 0.78..1.12 倍：鋸齒
    const a = -Math.PI + ((i + 0.5 + (rand(i, 1) - 0.5) * 0.5) / points) * Math.PI * 2
    const k = 0.78 + rand(i, 2) * 0.34
    out.push([Math.cos(a) * rx * k, Math.sin(a) * rz * k])
  }
  return out
}

/** 坑邊往外的裂痕：從輪廓上的點往外，中間折一次（x0,z0 → xm,zm → x1,z1），全長 1.4..3.4 */
export type CrackLine = { x0: number; z0: number; xm: number; zm: number; x1: number; z1: number; width: number }
export function crackLines(outline: readonly [number, number][], count: number): CrackLine[] {
  const out: CrackLine[] = []
  for (let i = 0; i < count; i++) {
    const p = outline[Math.floor(((i + rand(i, 3) * 0.6) / count) * outline.length) % outline.length]!
    const r = Math.hypot(p[0], p[1]) || 1
    const len = 1.4 + rand(i, 4) * 2
    const dx = p[0] / r
    const dz = p[1] / r
    // 兩段各往旁邊偏一點（±0.45 rad 內）：仍一直往外走
    const b1 = (rand(i, 5) - 0.5) * 0.9
    const b2 = -b1 * (0.6 + rand(i, 12) * 0.6)
    const turn = (b: number, l: number): [number, number] => [(dx * Math.cos(b) - dz * Math.sin(b)) * l, (dx * Math.sin(b) + dz * Math.cos(b)) * l]
    const [ax, az] = turn(b1, len * 0.5)
    const [bx, bz] = turn(b2, len * 0.5)
    out.push({ x0: p[0], z0: p[1], xm: p[0] + ax, zm: p[1] + az, x1: p[0] + ax + bx, z1: p[1] + az + bz, width: 0.07 + rand(i, 6) * 0.07 })
  }
  return out
}
