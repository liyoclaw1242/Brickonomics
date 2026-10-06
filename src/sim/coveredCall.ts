import { inRange, rate, returnRate } from './guard'

/**
 * 掩護性買權（covered call）的舉例（≈ 示意，不是任何真實基金的數字）：
 * 持有股票，同時把「漲超過天花板 cap 的部分」賣給別人，換一筆權利金 premium（金幣）。
 * 拉桿「漲幅」從 minMovePct 到 maxMovePct（整數 %，涵蓋下跌、平盤、上漲）。
 */
export const COVERED_CALL = { cap: 0.05, premium: 0.02, minMovePct: -20, maxMovePct: 20, illustrative: true } as const

export type CoveredCallParams = {
  /** 這段期間股票的漲跌（小數，> −1） */
  move: number
  /** 天花板：漲超過這裡的部分賣掉了（小數，≥ 0） */
  cap: number
  /** 賣掉上半截換到的權利金（小數，0 ≤ premium < 1） */
  premium: number
}

/**
 * plain：一般持有的報酬＝move。
 * covered：掩護的報酬＝min(move, cap) + premium（漲超過天花板的部分沒了，另外多一枚金幣）。
 * cut：賣掉的那一截＝max(0, move − cap)；diff＝covered − plain（正的＝掩護多賺）。
 * 一段期間、不計交易成本與權利金再投入。參數不合法時丟 RangeError（訊息以參數名稱開頭）。
 */
export type CoveredCallOutcome = { plain: number; covered: number; cut: number; diff: number }

export function coveredCall({ move, cap, premium }: CoveredCallParams): CoveredCallOutcome {
  returnRate('move', move)
  inRange('cap', cap, 0)
  rate('premium', premium)
  const covered = Math.min(move, cap) + premium
  return { plain: move, covered, cut: Math.max(0, move - cap), diff: covered - move }
}
