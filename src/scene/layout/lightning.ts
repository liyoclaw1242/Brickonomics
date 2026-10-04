import { universe } from '../../data'
import { shockImpact } from '../../sim/scenario'
import { SHOCK_2330 } from '../../tour/context'
import type { Vec3 } from '../camera'
import { QUALITY, type Quality } from '../quality'
import { basketVoxels } from './basket'
import { damageFromShocks } from './stages'
import { damagedVoxels, voxelPosition } from './voxels'

/**
 * c-1／c-2「假設台積電跌 30%」的閃電（純 TS）：烏雲位置、閃電的路徑（只分岔到有台積電的地方）、時間。
 * 座標都相對廣場中心（呼叫端再加 atPlaza）。時間 t 以秒計，從 c-2 鏡頭停下起算；t = Infinity＝終點（＝原本靜態的 active 畫面）。
 */

export type ShockKey = 'stock' | '0050' | 'SPY'
export const SHOCK_SUBJECTS: readonly { key: ShockKey; x: number }[] = [
  { key: 'stock', x: -14 },
  { key: '0050', x: 0 },
  { key: 'SPY', x: 14 },
]

/** 只買台積電那一柱：2×2×40 顆，被打中後剩 (1 − 30%) */
export const STOCK_BLOCKS = 40
export const STOCK_W = 2
export const SHOCK_DAMAGE = damageFromShocks(SHOCK_2330)
export const stockBlocksAfter = Math.round(STOCK_BLOCKS * (1 - SHOCK_DAMAGE['2330']!))

/** 籃子在這個舞台一律用低畫質尺寸（與 ShockStage 的 Basket quality="low" 相同） */
const ETF = QUALITY.low.etf

/** 各組合裡台積電佔多少（只買台積電＝1，0050 約 0.56，SPY＝0）：閃電的粗細 */
export function tsmcExposure(key: ShockKey): number {
  if (key === 'stock') return 1
  return Math.max(0, shockImpact(universe, key, { ...SHOCK_2330 }) / SHOCK_2330['2330']!)
}

/** 烏雲：中心、拉寬、大小（蓋住三組） */
export const CLOUD = { center: [0, 13.6, 2] as Vec3, spread: [3.4, 0.9] as [number, number], size: 1.3 }

/** 0050 裡被打掉（紅色）那幾顆方塊的中心，落在正面（z＝前表面）：閃電從前面打進那一層 */
export function etfHitPoint(): Vec3 {
  const voxels = basketVoxels(universe, '0050', ETF)
  const hit = damagedVoxels(voxels, SHOCK_DAMAGE)
  let x = 0
  let y = 0
  for (const v of hit) {
    const p = voxelPosition(v, ETF.w, ETF.d)
    x += p[0]
    y += p[1]
  }
  const n = Math.max(1, hit.size)
  return [SHOCK_SUBJECTS[1]!.x + x / n, y / n, ETF.d / 2 + 0.15]
}

/** 每組被打中的點；SPY 沒有台積電 → null（不分岔過去） */
export function strikeTarget(key: ShockKey): Vec3 | null {
  if (tsmcExposure(key) <= 0) return null
  if (key === 'stock') return [SHOCK_SUBJECTS[0]!.x, stockBlocksAfter / (STOCK_W * STOCK_W), 0]
  return etfHitPoint()
}

/** 閃電從雲底出來、往下一段後分岔 */
export const BOLT_ORIGIN: Vec3 = [-7, 12.2, 2.5]
export const BOLT_FORK: Vec3 = [-7.6, 10.2, 2.8]
/** 「假設：台積電被打中」標在烏雲上（閃電退掉後仍指得到東西） */
export const CLOUD_LABEL_ANCHOR: Vec3 = [-7, 14.6, 2.5]

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

/** 0..1 的固定偽亂數 */
const rand = (i: number, k: number) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** from → to 的鋸齒路徑：兩端精確，中間往旁邊抖（兩端抖得少） */
export function jagged(from: Vec3, to: Vec3, segments: number, jitter: number, seed: number): Vec3[] {
  const pts: Vec3[] = [from]
  for (let i = 1; i < segments; i++) {
    const u = i / segments
    const amp = jitter * Math.sin(Math.PI * u)
    pts.push([
      from[0] + (to[0] - from[0]) * u + (rand(i, seed) - 0.5) * 2 * amp,
      from[1] + (to[1] - from[1]) * u + (rand(i, seed + 1) - 0.5) * amp * 0.5,
      from[2] + (to[2] - from[2]) * u + (rand(i, seed + 2) - 0.5) * amp,
    ])
  }
  pts.push(to)
  return pts
}

/** 一段閃電：起點、終點、粗細（0..1）、出現的時間比例（0..1，配合 boltReveal） */
export type BoltSegment = { a: Vec3; b: Vec3; width: number; appear: number }
export type BoltBranch = { target: ShockKey | null; width: number; points: Vec3[] }

/** 各畫質：每條分支的段數、要不要小分岔（低畫質更簡單） */
export const BOLT_DETAIL: Record<Quality, { segments: number; twigs: boolean; glow: boolean }> = {
  high: { segments: 12, twigs: true, glow: true },
  low: { segments: 6, twigs: false, glow: false },
}

/**
 * 分岔先沿著雲底橫走到目標正上方，再直直劈下來（從高視角看，斜斜一條會像橫線、看不出「從天上打下來」）。
 * 回傳路線的轉折點（不含鋸齒）。
 */
export function branchWaypoints(key: ShockKey): Vec3[] | null {
  const to = strikeTarget(key)
  if (!to) return null
  const above: Vec3 = key === 'stock' ? [to[0] + 0.6, BOLT_FORK[1] - 0.6, to[2] + 1] : [to[0] - 0.8, BOLT_FORK[1] - 1, to[2]]
  return [BOLT_FORK, above, to]
}

/** 沿著幾個轉折點的鋸齒路徑：段數依每段長度分配，所有轉折點都精確經過 */
export function jaggedPath(way: readonly Vec3[], segments: number, jitter: number, seed: number): Vec3[] {
  const lens = way.slice(1).map((b, i) => Math.hypot(b[0] - way[i]![0], b[1] - way[i]![1], b[2] - way[i]![2]))
  const total = lens.reduce((a, b) => a + b, 0) || 1
  const out: Vec3[] = [way[0]!]
  lens.forEach((len, i) => {
    const n = Math.max(2, Math.round((segments * len) / total))
    out.push(...jagged(way[i]!, way[i + 1]!, n, jitter * Math.min(1, len / 4), seed + i * 13).slice(1))
  })
  return out
}

/** 主幹＋打到台積電的分岔（越多台積電越粗）＋（高畫質）兩條打不到地面的小分岔 */
export function boltBranches(quality: Quality): BoltBranch[] {
  const { segments, twigs } = BOLT_DETAIL[quality]
  const out: BoltBranch[] = [{ target: null, width: 1, points: jagged(BOLT_ORIGIN, BOLT_FORK, Math.max(2, Math.round(segments / 3)), 0.5, 3) }]
  SHOCK_SUBJECTS.forEach((s, i) => {
    const way = branchWaypoints(s.key)
    if (way) out.push({ target: s.key, width: tsmcExposure(s.key), points: jaggedPath(way, segments, 0.9, 11 + i * 7) })
  })
  if (twigs) {
    for (const [k, dir] of [[1, 1], [2, -1]] as const) {
      const p = out[k]?.points
      if (!p) continue
      const from = p[Math.floor(p.length / 2)]!
      out.push({ target: null, width: 0.3, points: jagged(from, [from[0] + dir * 1.6, from[1] - 1.8, from[2] + 0.4], 3, 0.4, 40 + k) })
    }
  }
  return out
}

/** 攤平成一段一段（依出現時間排序：主幹先、分岔後；InstancedMesh 只要調 count 就能逐段長出來） */
export function boltSegments(quality: Quality): BoltSegment[] {
  const branches = boltBranches(quality)
  const segs: BoltSegment[] = []
  branches.forEach((br, bi) => {
    // 主幹佔前 40%，分岔佔後 60%；小分岔從它掛的地方開始
    const [s0, s1] = bi === 0 ? [0, 0.4] : br.target ? [0.4, 1] : [0.6, 1]
    const n = br.points.length - 1
    for (let i = 0; i < n; i++) segs.push({ a: br.points[i]!, b: br.points[i + 1]!, width: br.width, appear: s0 + ((s1 - s0) * i) / n })
  })
  return segs.sort((p, q) => p.appear - q.appear)
}

/** 目前該顯示幾段（reveal 0 → 0 段；1 → 全部） */
export function visibleSegments(segs: readonly BoltSegment[], reveal: number): number {
  if (!(reveal > 0)) return 0
  if (reveal >= 1) return segs.length
  let n = 0
  while (n < segs.length && segs[n]!.appear < reveal) n++
  return n
}
