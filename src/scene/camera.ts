import type { CameraPresetId } from '../tour/types'

export type Vec3 = [number, number, number]

/** 鏡頭預設位置；PLAZA（前方廣場）中心在 z ≈ 30 */
export const CAMERA_PRESETS: Record<CameraPresetId, { position: Vec3; target: Vec3 }> = {
  sky: { position: [0, 140, 160], target: [0, 0, 0] },
  overview: { position: [10, 36, 58], target: [0, 5, 12] },
  tw: { position: [-12, 22, 34], target: [-16, 6, 0] },
  us: { position: [20, 22, 34], target: [16, 6, 0] },
  exchange: { position: [6, 18, 40], target: [0, 6, 14] },
  exchangeWide: { position: [10, 30, 48], target: [0, 10, 14] },
  exchangeSide: { position: [34, 14, 20], target: [0, 7, 14] },
  plazaNear: { position: [0, 18, 52], target: [0, 2, 30] },
  underground: { position: [0, -9, 98], target: [0, -9, 24] },
  plaza: { position: [0, 26, 66], target: [0, 4, 30] },
}

const SNAP = 0.05

/** 指數趨近；距離小於 SNAP 時直接到位 */
export function approachVec(cur: Vec3, target: Vec3, dt: number, rate = 3): { next: Vec3; done: boolean } {
  const k = 1 - Math.exp(-rate * dt)
  const next = cur.map((c, i) => c + (target[i]! - c) * k) as Vec3
  const dist = Math.hypot(next[0] - target[0], next[1] - target[1], next[2] - target[2])
  return dist < SNAP ? { next: [...target], done: true } : { next, done: false }
}
