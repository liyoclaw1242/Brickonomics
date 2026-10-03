import type { Vec3 } from '../camera'

/** 前方廣場：教學舞台都擺在這裡 */
export const PLAZA: Vec3 = [0, 0, 30]
export const PLAZA_SIZE: [number, number] = [46, 18]

export const atPlaza = (dx: number, dy = 0, dz = 0): Vec3 => [PLAZA[0] + dx, PLAZA[1] + dy, PLAZA[2] + dz]

/** 交易所櫃台的位置（從 Scene.tsx 移過來，避免舞台元件與 Scene 互相 import） */
export const EXCHANGE_POSITION: Vec3 = [0, 0, 14]
