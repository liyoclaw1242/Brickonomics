import type { Quality } from '../quality'
import { hump, ramp } from './ease'
import type { EventTimeline, SpecOf } from './types'

/**
 * 🌊 大浪（劇烈來回震盪）的時間軸（純 TS）。
 * 一片水圍住目標（塔）的底部；每一道浪＝水面湧起一次再退下（一上一下），次數＝spec.waves。
 * 浪頭打到目標的那一刻（湧到最高）算「跌」一步（槓桿塔被打矮一截），退到最低算「漲」一步：舞台用 waveStepAt 讀走到第幾步，
 * 塔高由舞台自己沿 leveragedPath 算出的路徑取（heightOnPath）。事件參數固定；數值由舞台映射（events/index.ts 的規則）。
 * 不閃光。時間 t 以秒計，從鏡頭停下起算；t = Infinity＝終點（浪退了、水面平靜、走完 2 × waves 步）。
 * 座標相對水面中心（元件再加 spec.at 與 atPlaza）。
 */

export const WAVE = {
  /** 鏡頭停下後水先漲到平時的高度 */
  fillAt: 0,
  fill: 0.35,
  /** 第一道浪開始的時間、每道浪（湧起＋退下）的秒數 */
  delay: 0.4,
  period: 1.15,
  /** 每一步打到之後，塔的高度花多久變到新的高度 */
  settle: 0.3,
  /** 平時的水深、浪湧起時再加多高（世界單位） */
  rest: 0.35,
  lift: 2.4,
  /** 水面的小起伏：平時、浪湧起時的幅度；沿 x 的波數與速度 */
  rippleRest: 0.05,
  ripple: 0.35,
  kx: 0.75,
  speed: 3.2,
  /** 預設水面大小（x 寬、z 深） */
  width: 26,
  depth: 10,
  /** 浪的次數上限 */
  maxWaves: 8,
} as const

/** 浪的次數：限制在 0..WAVE.maxWaves 的整數 */
export const waveCount = (spec: SpecOf<'wave'>): number => Math.min(WAVE.maxWaves, Math.max(0, Math.round(spec.waves)))

/** 總步數（每道浪一跌一漲）＝2 × 浪的次數 */
export const waveSteps = (spec: SpecOf<'wave'>): number => 2 * waveCount(spec)

/** 第 k 道浪（0 起算）打到目標（湧到最高）的時間 */
export const crestTime = (k: number): number => WAVE.delay + (k + 0.5) * WAVE.period
/** 第 k 道浪退到最低的時間 */
export const troughTime = (k: number): number => WAVE.delay + (k + 1) * WAVE.period

/** 第 i 步（0 起算；偶數＝浪頭打到＝跌、奇數＝退下＝漲）發生的時間 */
export const stepTime = (i: number): number => (i % 2 === 0 ? crestTime(i / 2) : troughTime((i - 1) / 2))

/** 動畫全部結束：最後一道浪退下、塔變到最後的高度 */
export const waveEnd = (spec: SpecOf<'wave'>): number =>
  waveCount(spec) === 0 ? WAVE.fillAt + WAVE.fill : troughTime(waveCount(spec) - 1) + WAVE.settle

/**
 * 舞台用：時間 t 走到第幾步（連續值 0..2 × waves；每步打到後在 settle 秒內平滑地 +1）。
 * t 為 null＝還沒開始（0）；Infinity＝走完（2 × waves）。
 */
export function waveStepAt(spec: SpecOf<'wave'>, t: number | null): number {
  if (t === null) return 0
  const n = waveSteps(spec)
  if (t === Infinity) return n
  let s = 0
  for (let i = 0; i < n; i++) s += ramp(t, stepTime(i), WAVE.settle)
  return s
}

/**
 * 沿著路徑取高度：step 為連續值（waveStepAt），在 path[⌊step⌋] 與 path[⌈step⌉] 之間線性內插；超出範圍取兩端。
 * path 是舞台算好的塔高（例如 leveragedPath 的結果乘上比例）。
 */
export function heightOnPath(path: readonly number[], step: number): number {
  if (path.length === 0) return 0
  const s = Math.min(path.length - 1, Math.max(0, step))
  const i = Math.floor(s)
  const f = s - i
  const a = path[i]!
  return f === 0 ? a : a + (path[i + 1]! - a) * f
}

/** 浪湧起的程度 0..1：每道浪一個拱（湧起再退下），浪與浪之間回到 0 */
export function swellAt(spec: SpecOf<'wave'>, t: number): number {
  const n = waveCount(spec)
  if (n === 0 || t < WAVE.delay) return 0
  const k = Math.floor((t - WAVE.delay) / WAVE.period)
  return k < n ? hump(t, WAVE.delay + k * WAVE.period, WAVE.period) : 0
}

export type WaveState = {
  /** 水面平均高度（世界單位；0＝地面） */
  level: number
  /** 浪湧起的程度 0..1 */
  swell: number
  /** 水面小起伏的幅度與相位（surfaceY 用） */
  ripple: number
  phase: number
  /** 浪花噴起的進度 0..1（浪頭打到目標時噴一次）；null＝沒有 */
  spray: number | null
}

const NOTHING: WaveState = { level: 0, swell: 0, ripple: 0, phase: 0, spray: null }
const FINAL: WaveState = { level: WAVE.rest, swell: 0, ripple: WAVE.rippleRest, phase: 0, spray: null }

/** 浪花：浪頭打到後持續的秒數 */
const SPRAY = 0.7

/** 時間 t 的畫面狀態；t 為 null＝還沒開始（沒有水） */
export function waveAt(spec: SpecOf<'wave'>, t: number | null): WaveState {
  if (t === null) return NOTHING
  if (t === Infinity || t >= waveEnd(spec)) return FINAL
  const swell = swellAt(spec, t)
  let spray: number | null = null
  for (let k = 0; k < waveCount(spec); k++) {
    const u = (t - crestTime(k)) / SPRAY
    if (u >= 0 && u < 1) spray = u
  }
  return {
    level: WAVE.rest * ramp(t, WAVE.fillAt, WAVE.fill) + WAVE.lift * swell,
    swell,
    ripple: WAVE.rippleRest + WAVE.ripple * swell,
    phase: t * WAVE.speed,
    spray,
  }
}

/** 終點（減少動態時直接畫這個）：水面平靜在平時的高度 */
export const waveFinal = (): WaveState => FINAL

/** 水面在 x、z 的高度（相對地面）：平均高度＋沿 x 往右走的小起伏（z 方向稍微錯開） */
export const surfaceY = (s: WaveState, x: number, z: number): number => s.level + s.ripple * Math.sin(WAVE.kx * x - s.phase + 0.35 * z)

/** 時間軸：跑一次就停；大數字等第一道浪打到才數；終點有後果（塔高變了） */
export const WAVE_TIMELINE: EventTimeline<SpecOf<'wave'>> = {
  duration: (spec) => waveEnd(spec),
  lingers: () => false,
  numberDelay: (spec) => (waveCount(spec) > 0 ? crestTime(0) : 0),
  aftermath: (spec) => waveCount(spec) > 0,
}

/** 各畫質：水面沿 x、z 的分段數、浪頭的泡沫數、每個目標的浪花數 */
export const WAVE_DETAIL: Record<Quality, { segX: number; segZ: number; foam: number; spray: number }> = {
  high: { segX: 56, segZ: 10, foam: 36, spray: 10 },
  low: { segX: 20, segZ: 4, foam: 12, spray: 4 },
}
