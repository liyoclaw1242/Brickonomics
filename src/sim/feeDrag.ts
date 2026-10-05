import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { inRange, rate } from './guard'
import { profileFromFees, valueAfter } from './fees'

/**
 * 主動 vs 被動 30 年：同樣的毛報酬（舉例 6%／年，≈ 假設），只差每年的內扣費用。
 * 費率一律從資料讀（已查證）：駿利亨德森平衡基金 A2 1.88%、元大台灣50 0.14%。
 */
export const FEE_DRAG = {
  active: 'JH_BALANCED',
  passive: '0050',
  principal: 100,
  grossReturn: 0.06,
  years: 30,
} as const

export type FeeDragParams = { active: string; passive: string; principal: number; grossReturn: number; years: number }

/**
 * 複利 years 年後的價值：每年先長 grossReturn、再扣 fee（與 fees.valueAfter 相同，直接沿用）。
 * ＝ principal × (1 + grossReturn)^years × (1 − fee)^years。
 * principal ≥ 0、grossReturn > −1、fee 在 [0, 1)、years ≥ 0，否則丟 RangeError。
 */
export function grow(principal: number, grossReturn: number, fee: number, years: number): number {
  inRange('principal', principal, 0)
  rate('fee', fee)
  return valueAfter(profileFromFees({ expenseRatio: fee }), years, { amount: principal, grossReturn })
}

export type FeeDragRow = { id: string; fee: number; value: number; /** 和完全沒費用相比少掉的錢 */ lost: number; verified: boolean }
export type FeeDragResult = { active: FeeDragRow; passive: FeeDragRow; /** 完全沒有費用時的價值 */ noFee: number; /** 被動比主動多的錢 */ gap: number }

/** 從資料讀兩檔的 expenseRatio，算 years 年後各剩多少；資產不存在或沒有 expenseRatio 時丟 Error */
export function feeDrag(u: Universe, p: FeeDragParams = FEE_DRAG): FeeDragResult {
  const noFee = grow(p.principal, p.grossReturn, 0, p.years)
  const row = (id: string): FeeDragRow => {
    const a = u.get(id)
    const fee = a?.fees?.expenseRatio
    if (!a || fee === undefined) throw new Error(`no expenseRatio for asset ${id}`)
    const value = grow(p.principal, p.grossReturn, fee, p.years)
    return { id, fee, value, lost: noFee - value, verified: isVerified(a, 'fees.expenseRatio') }
  }
  const active = row(p.active)
  const passive = row(p.passive)
  return { active, passive, noFee, gap: passive.value - active.value }
}
