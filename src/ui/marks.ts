import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { DEFAULT_VALUES } from '../tour/engine'
import type { Step } from '../tour/types'
import { feeRaceRows } from '../sim/feeRace'

export type Mark = 'illustrative' | 'assumption' | 'unverified'

/** 費用比一比的一列該標哪些圖示：前收費用是假設值（✎），有待驗證的拆項再加 ？ */
export function feeRowMarks(id: 'front' | 'back' | 'etf', unverifiedParts: number): Mark[] {
  return [...(id === 'front' ? (['assumption'] as const) : []), ...(unverifiedParts > 0 ? (['unverified'] as const) : [])]
}

/**
 * 一步的標示（面板標題旁各出現一次；3D 標註上不再重複）：
 * 步驟本身的 ≈／✎，再加上從資料推出來的 ？（這一步畫出來的費用資料有沒有查證過）。
 */
export function stepMarks(step: Step, u: Universe): Mark[] {
  const out: Mark[] = step.mark ? [step.mark] : []
  const st = step.scene.stage
  if (st?.kind === 'feeRace') {
    const v = { ...DEFAULT_VALUES, ...step.scene.values }
    if (feeRaceRows(u, v.years, v.frontLoad, st.etf ?? true).some((r) => r.unverified.length > 0)) out.push('unverified')
  }
  // 計費表用的是這檔基金的內扣費用
  if (st?.kind === 'excavator' && st.meter && step.scene.product) {
    const p = u.get(step.scene.product)
    if (p?.fees?.expenseRatio !== undefined && !isVerified(p, 'fees.expenseRatio')) out.push('unverified')
  }
  // 這一步顯示的比例來自持股資料，持股沒查證就加 ？
  if (step.holdingsFrom?.some((id) => { const a = u.get(id); return !a || !isVerified(a, 'holdings') })) out.push('unverified')
  return [...new Set(out)]
}

/**
 * 一步的標示放在哪裡（每種只出現一次）：≈ 舉例、✎ 假設的數字放在標題旁；
 * ？ 資料待更新放在一句話後面（r3：放在標題下第一眼就看到，讓人不信任整堂課）。
 */
export function markPlacement(marks: readonly Mark[]): { title: Mark[]; afterLine: Mark[] } {
  const uniq = [...new Set(marks)]
  return { title: uniq.filter((m) => m !== 'unverified'), afterLine: uniq.filter((m) => m === 'unverified') }
}
