/** 事件時間軸共用的小工具（純 TS）：限制範圍、平滑、區間進度、固定偽亂數 */

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** smoothstep：0..1 頭尾放慢 */
export const smooth = (v: number): number => {
  const u = clamp01(v)
  return u * u * (3 - 2 * u)
}

/** t 在 [start, start + span] 之間的平滑進度 0..1（之前 0、之後 1；t = Infinity → 1） */
export const ramp = (t: number, start: number, span: number): number => smooth((t - start) / span)

/** 只起伏一次的包絡：t 在 [start, start + span] 外為 0，中間是一個 sin 的拱 */
export function hump(t: number, start: number, span: number): number {
  const u = (t - start) / span
  return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0
}

/** 0..1 的固定偽亂數（不每幀配置、每次重整都一樣） */
export const rand = (i: number, k: number): number => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return v - Math.floor(v)
}
