import type { Vec3 } from '../camera'
import type { Quality } from '../quality'
import { hump, ramp } from './ease'
import type { EventTimeline, SpecOf } from './types'

/**
 * 🫧 泡泡（泡沫、太貴）的時間軸與幾何（純 TS）。
 * float：泡泡從目標四周長出來包住它 → 連同目標一起浮起 lift → 停在空中（終點）。
 * pop：從 float 的終點開始；泡泡先撐一下 → 破一次（變成往外飛的小水滴，不閃光）→ 目標掉回地面、彈一下 → 停（終點）。
 * 時間 t 以秒計，從鏡頭停下起算；t = Infinity＝終點。
 *
 * 舞台用法：每幀讀 bubbleAt(spec, clock.t.current)，把 lift 加到目標方塊的 y、squash 乘到高度上。
 * 同一個目標從 float 步驟走到 pop 步驟時，pop 的 t = null（鏡頭還沒停下）就是 float 的終點（泡泡還在空中）。
 */

export const BUBBLE = {
  /** 鏡頭停下後先停一下 */
  delay: 0.3,
  /** 泡泡長出來包住目標的秒數 */
  wrap: 0.9,
  /** 包好之後才開始浮起（一次只變一件事） */
  liftAt: 1.3,
  liftDur: 1.5,
  /** 預設浮起高度（世界單位；泡泡底部至少離地 GROUND_GAP，所以高的目標會浮更高） */
  lift: 2.5,
  /** pop：泡泡先撐大一點（預告），然後在 popAt 破掉 */
  strainAt: 0.25,
  popAt: 0.75,
  strain: 0.07,
  /** 水滴飛散的秒數 */
  burst: 0.6,
  /** 掉下來的重力加速度、落地後彈起的高度、落地瞬間壓扁的比例與秒數 */
  gravity: 30,
  bounce: 0.35,
  squash: 0.12,
  squashDur: 0.18,
} as const

/** 泡泡比目標大多少：橢球半徑＝半邊長 × √3（方塊的八個角一定在泡泡裡）＋ 邊距 */
const PAD = Math.sqrt(3)
const MARGIN = 0.3
/** 浮起後泡泡底部離地至少這麼高 */
const GROUND_GAP = 0.4

/** 包住 size（寬、高、深）的目標的泡泡半徑（x、y、z） */
export function bubbleRadii(size: Vec3): Vec3 {
  return [(size[0] / 2) * PAD + MARGIN, (size[1] / 2) * PAD + MARGIN, (size[2] / 2) * PAD + MARGIN]
}

/** 浮起高度：spec.lift（預設 BUBBLE.lift，不小於 0），但至少讓泡泡底部離地 GROUND_GAP */
export function liftOf(spec: SpecOf<'bubble'>): number {
  const ry = bubbleRadii(spec.target.size)[1]
  const clear = ry - spec.target.size[1] / 2 + GROUND_GAP
  return Math.max(0, spec.lift ?? BUBBLE.lift, spec.lift === undefined ? clear : 0)
}

export type BubbleState = {
  /** 泡泡大小 0..1（0＝沒有泡泡） */
  bubble: number
  /** 目標（與泡泡）浮起的高度 */
  lift: number
  /** 泡泡破掉前撐大的倍數（1＝原大） */
  strain: number
  /** 水滴飛散進度 0..1；null＝沒有 */
  burst: number | null
  /** 目標的高度倍數（落地瞬間壓扁一下；1＝原樣） */
  squash: number
}

const GROUND: BubbleState = { bubble: 0, lift: 0, strain: 1, burst: null, squash: 1 }

export const FLOAT_END = BUBBLE.liftAt + BUBBLE.liftDur

/** 掉落：從 h 自由落體到地面的秒數、彈起那一下的秒數 */
const fallTime = (h: number) => Math.sqrt((2 * h) / BUBBLE.gravity)
const bounceV = Math.sqrt(2 * BUBBLE.gravity * BUBBLE.bounce)
const BOUNCE_TIME = (2 * bounceV) / BUBBLE.gravity

/** pop 走完的秒數（依浮起高度）：水滴散完、目標落地彈完、壓扁回彈完 */
export function popEnd(spec: SpecOf<'bubble'>): number {
  const fall = fallTime(liftOf(spec))
  return BUBBLE.popAt + Math.max(BUBBLE.burst, fall + Math.max(BOUNCE_TIME, BUBBLE.squashDur))
}

/** 預設目標（3×8×3 的大樓）的 pop 秒數（測試與文件用） */
export const POP_END = popEnd({ kind: 'bubble', phase: 'pop', target: { at: [0, 0, 0], size: [3, 8, 3] } })

/** 泡泡破了沒（只在 pop、只一次） */
export const isPopped = (spec: SpecOf<'bubble'>, t: number | null): boolean => spec.phase === 'pop' && t !== null && t >= BUBBLE.popAt

/** 終點：float＝在空中；pop＝回到地面、沒有泡泡 */
export const bubbleFinal = (spec: SpecOf<'bubble'>): BubbleState =>
  spec.phase === 'float' ? { ...GROUND, bubble: 1, lift: liftOf(spec) } : GROUND

/** 時間 t 的畫面狀態；t 為 null＝還沒開始（float：在地面、沒泡泡；pop：還在空中） */
export function bubbleAt(spec: SpecOf<'bubble'>, t: number | null): BubbleState {
  const lift = liftOf(spec)
  if (spec.phase === 'float') {
    if (t === null) return GROUND
    return { ...GROUND, bubble: ramp(t, BUBBLE.delay, BUBBLE.wrap), lift: lift * ramp(t, BUBBLE.liftAt, BUBBLE.liftDur) }
  }
  if (t === null || t < BUBBLE.popAt) {
    const strain = t === null ? 1 : 1 + BUBBLE.strain * hump(t, BUBBLE.strainAt, (BUBBLE.popAt - BUBBLE.strainAt) * 2)
    return { ...GROUND, bubble: 1, lift, strain }
  }
  if (t >= popEnd(spec)) return GROUND
  const u = t - BUBBLE.popAt
  const fall = fallTime(lift)
  let y = 0
  let squash = 1
  if (u < fall) y = lift - 0.5 * BUBBLE.gravity * u * u
  else {
    const v = u - fall
    if (v < BOUNCE_TIME) y = bounceV * v - 0.5 * BUBBLE.gravity * v * v
    squash = 1 - BUBBLE.squash * hump(v, 0, BUBBLE.squashDur)
  }
  const b = u / BUBBLE.burst
  return { bubble: 0, lift: Math.max(0, y), strain: 1, burst: b < 1 ? b : null, squash }
}

/** 時間軸：float、pop 都跑一次就停；pop 的大數字等泡泡破了才數；只有 pop 有後果（價格落回） */
export const BUBBLE_TIMELINE: EventTimeline<SpecOf<'bubble'>> = {
  duration: (spec) => (spec.phase === 'float' ? FLOAT_END : popEnd(spec)),
  lingers: () => false,
  numberDelay: (spec) => (spec.phase === 'pop' ? BUBBLE.popAt : 0),
  aftermath: (spec) => spec.phase === 'pop',
}

/** 各畫質：泡泡的分段數、飛散的水滴數 */
export const BUBBLE_DETAIL: Record<Quality, { segments: number; droplets: number }> = {
  high: { segments: 40, droplets: 40 },
  low: { segments: 20, droplets: 18 },
}

/** 水滴飛出去的方向（球面上大致均勻的單位向量；黃金角螺旋） */
export function dropletDirs(n: number): Vec3[] {
  const out: Vec3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2
    const r = Math.sqrt(1 - y * y)
    const a = i * golden
    out.push([Math.cos(a) * r, y, Math.sin(a) * r])
  }
  return out
}
