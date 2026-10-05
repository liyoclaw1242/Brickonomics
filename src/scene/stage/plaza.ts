import type { Stage } from '../../tour/types'
import type { Vec3 } from '../camera'
import { T } from '../../ui/strings'

/** 前方廣場：教學舞台都擺在這裡 */
export const PLAZA: Vec3 = [0, 0, 30]
export const PLAZA_SIZE: [number, number] = [46, 18]

export const atPlaza = (dx: number, dy = 0, dz = 0): Vec3 => [PLAZA[0] + dx, PLAZA[1] + dy, PLAZA[2] + dz]

/** 交易所櫃台的位置（從 Scene.tsx 移過來，避免舞台元件與 Scene 互相 import） */
export const EXCHANGE_POSITION: Vec3 = [0, 0, 14]

/** 交易所櫃台台座的高度：籃子放在台座上面 */
export const PEDESTAL_HEIGHT = 0.6

/** 擺在廣場上的舞台 */
export const ON_PLAZA: ReadonlySet<Stage['kind']> = new Set<Stage['kind']>(['held', 'exdiv', 'bonds', 'feeRace', 'accumulate', 'principalTrap', 'shock', 'overlap', 'drawdown', 'pe', 'seesaw', 'dca', 'inflation', 'portfolio'])

/**
 * 廣場舞台時城市只是背景：大樓與島的名稱小字一律收起（少字；也避免遠處名稱擠到工具列底下、和舞台標註互撞）。
 * shock 也一樣：主角是廣場上的三組，跌幅寫在它們的標註上。
 */
export function cityNamesOnPlaza(kind: Stage['kind']): boolean {
  return !ON_PLAZA.has(kind)
}

/** 交易所台座：上面有東西（籃子）或在自由玩時才顯示（r3：空著的黑板子像壞掉、沒收乾淨） */
export function showPedestal(mode: 'tour' | 'sandbox', productId: string | null): boolean {
  return mode === 'sandbox' || productId !== null
}

/**
 * 借據標籤下面那一行：b-2（ranks）寫「穩不穩、利息多少」；其他時候（b-1、b-3）寫「借給誰」。
 * 股票方塊不是借據，不寫。
 */
export function bondSub(key: 'stock' | 'gov' | 'corp' | 'hy', ranks: boolean): string | undefined {
  if (key === 'stock') return undefined
  return ranks ? T.stage.bondRanks[key] : T.stage.bondWho[key]
}
