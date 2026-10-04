import type { Universe } from '../data/universe'
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
  return out
}
