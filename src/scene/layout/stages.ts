import { exDividend, simulateDistribution, type PeriodState } from '../../sim/dividend'
import type { Vec3 } from '../camera'
import { explodeOffsetY, stackVoxels, voxelPosition, type Voxel } from './voxels'
import { T } from '../../ui/strings'

export const VALUE_PER_BLOCK = 2

export function blocksFor(value: number, perBlock = VALUE_PER_BLOCK): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`value must be a non-negative number: ${value}`)
  return Math.round(value / perBlock)
}

export function towerVoxels(count: number, w = 5, d = 5): Voxel[] {
  return stackVoxels([{ id: 'tower', count }], w, d)
}

export type ExDivOutcome = 'fill' | 'gap'
export const EXDIV = { price: 100, dividend: 5, gapTo: 92 } // 示意

/** 時間軸 0～1：0.5 配發（除息），之後線性填息到 100 或貼息到 92 */
export function exDivTimeline(phase: number, outcome: ExDivOutcome): { blockValue: number; cash: number } {
  const t = Math.min(1, Math.max(0, phase))
  if (t < 0.5) return { blockValue: EXDIV.price, cash: 0 }
  const after = exDividend(EXDIV.price, EXDIV.dividend)
  const end = outcome === 'fill' ? EXDIV.price : EXDIV.gapTo
  const s = (t - 0.5) / 0.5
  return { blockValue: after.price + (end - after.price) * s, cash: after.cash }
}

export type Band = [number, number] | null

/**
 * 方塊少掉的部分（畫在方塊上方，單位＝價值）：
 * gold＝變成金幣的那一段（配發後、方塊還沒長回去的部分）；red＝金幣以外、真的少掉的部分（沒長回來）。
 */
export function exDivBands(blockValue: number, cash: number): { gold: Band; red: Band } {
  if (cash <= 0) return { gold: null, red: null }
  const after = EXDIV.price - cash
  const goldLo = Math.max(blockValue, after)
  return {
    gold: goldLo < EXDIV.price ? [goldLo, EXDIV.price] : null,
    red: blockValue < after ? [blockValue, after] : null,
  }
}

/**
 * 除息舞台的 3D 標籤。fill（s-5）：方塊、金幣各帶數字（100＋0 → 95＋5）。
 * gap（s-6）：只有一個數字——紅色那段「少了 3」；方塊、金幣只寫名字（r3：97、92、5、3 四個數字要他自己算）。
 */
export function exDivLabels(outcome: ExDivOutcome, phase: number): { block: string; coins: string; lost?: string } {
  const st = exDivTimeline(phase, outcome)
  const { block, coins, lost } = T.stage.exdiv
  if (outcome === 'fill') return { block: `${block} ${st.blockValue.toFixed(0)}`, coins: `${coins} ${st.cash.toFixed(0)}` }
  const red = exDivBands(st.blockValue, st.cash).red
  const gone = red ? Math.round(red[1] - red[0]) : 0
  return { block, coins, ...(gone > 0 ? { lost: lost(gone) } : {}) }
}

/** 示意：本金 100、每年產出 4%、價格每年 +3%、配息型每年配 4% */
export const ACCUMULATE_DEMO = { initialValue: 100, incomeYield: 0.04, priceReturn: 0.03, payoutRate: 0.04 } as const

export function accumulateVsPayout(periods: number): { accumulate: PeriodState; payout: PeriodState } {
  const acc = simulateDistribution({ ...ACCUMULATE_DEMO, periods, mode: 'accumulate' })
  const pay = simulateDistribution({ ...ACCUMULATE_DEMO, periods, mode: 'payout' })
  return { accumulate: acc[acc.length - 1]!, payout: pay[pay.length - 1]! }
}

/** 示意高配息基金：產出 3%、價格不變、每年配 6%（不代表任何真實商品） */
export const TRAP_DEMO = { initialValue: 100, incomeYield: 0.03, priceReturn: 0, payoutRate: 0.06 } as const

export function principalTrap(periods: number): PeriodState {
  const s = simulateDistribution({ ...TRAP_DEMO, periods, mode: 'payout' })
  return s[s.length - 1]!
}

/** 示意價格跳動：固定種子的隨機漫步（mulberry32），只用於畫面 */
export function illustrativeTicks(seed: number, n: number, start = 100, vol = 0.004): number[] {
  let a = seed >>> 0
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [start]
  for (let i = 1; i < n; i++) out.push(out[i - 1]! * (1 + (rand() - 0.5) * 2 * vol))
  return out
}

/** 某一組方塊的中心（籃子的相對座標，含拆開位移） */
export function layerCentroid(voxels: Voxel[], group: number, w: number, d: number, t: number, groups: number): Vec3 | null {
  let n = 0
  const sum: Vec3 = [0, 0, 0]
  for (const v of voxels) {
    if (v.group !== group) continue
    const [x, y, z] = voxelPosition(v, w, d)
    sum[0] += x
    sum[1] += y + explodeOffsetY(group, t, groups)
    sum[2] += z
    n++
  }
  return n === 0 ? null : [sum[0] / n, sum[1] / n, sum[2] / n]
}

/** 假設情境的跌幅 → 方塊打掉比例（只取下跌，最多 1） */
export function damageFromShocks(shocks: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, s] of Object.entries(shocks)) if (s < 0) out[id] = Math.min(1, -s)
  return out
}
