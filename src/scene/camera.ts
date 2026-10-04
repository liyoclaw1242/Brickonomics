import type { CameraPresetId } from '../tour/types'

export type Vec3 = [number, number, number]

/** 鏡頭預設位置；PLAZA（前方廣場）中心在 z ≈ 30 */
export const CAMERA_PRESETS: Record<CameraPresetId, { position: Vec3; target: Vec3 }> = {
  sky: { position: [0, 140, 160], target: [0, 0, 0] },
  overview: { position: [10, 36, 58], target: [0, 5, 12] },
  tw: { position: [-12, 22, 34], target: [-16, 6, 0] },
  // 美國大樓高（18–19 層）：鏡頭拉遠、看高一點，樓頂才不會被畫面上緣切掉
  us: { position: [22, 26, 46], target: [16, 9, 0] },
  // 往下看多一點：後面美國大樓的樓頂不會被切一半、壓在工具列底下（使用者測試 r2，f-1）
  exchange: { position: [2, 20, 50], target: [2, 8, 12] },
  exchangeWide: { position: [10, 30, 48], target: [0, 10, 14] },
  // 雷射刀（沿 x 切）：從斜前方看。正對 x 軸時切掉的是靠近鏡頭那一面，剩下的看起來一模一樣（使用者測試 r2）
  exchangeSide: { position: [26, 15, 38], target: [0, 6, 14] },
  // 往下看多一點：後面城市的樓頂不會被畫面上緣切一半、也不會壓在工具列底下（使用者測試 r2）
  plazaNear: { position: [0, 20, 42], target: [0, 1.5, 30] },
  underground: { position: [0, -1, 98], target: [0, -9, 24] },
  plaza: { position: [0, 26, 66], target: [0, 4, 30] },
}

/** OrbitControls 的限制；預設鏡頭位置必須落在這些限制之內，否則鏡頭永遠到不了 */
export const MAX_POLAR = Math.PI * 0.48
export const MIN_DISTANCE = 8
export const MAX_DISTANCE = 90

/** 鏡頭 rig 的時間步長：首幀用固定 1/60；之後上限 0.25s（慢機器也能在數幀內到位）；非有限或負值退回 1/60 */
export function rigDt(rawDt: number, firstFrame: boolean): number {
  if (firstFrame || !Number.isFinite(rawDt) || rawDt < 0) return 1 / 60
  return Math.min(rawDt, 0.25)
}

const SNAP = 0.05

/** 指數趨近；距離小於 SNAP 時直接到位 */
export function approachVec(cur: Vec3, target: Vec3, dt: number, rate = 3): { next: Vec3; done: boolean } {
  const k = 1 - Math.exp(-rate * dt)
  const next = cur.map((c, i) => c + (target[i]! - c) * k) as Vec3
  const dist = Math.hypot(next[0] - target[0], next[1] - target[1], next[2] - target[2])
  return dist < SNAP ? { next: [...target], done: true } : { next, done: false }
}
