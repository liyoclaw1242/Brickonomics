import { stripMarkup } from '../ui/emphasis'

/** 一詞一義：每個概念只用 term；forbidden 是不可使用的同義詞。 */
export const GLOSSARY = [
  { term: '配息', means: '股票、基金、ETF 付給你的錢', forbidden: ['股息', '股利', '派息', '分紅'] },
  { term: '利息', means: '債券付給你的錢', forbidden: [] },
  { term: '內扣費用', means: '每年從基金或 ETF 資產扣掉的費用', forbidden: ['管理費', '費用率'] },
  { term: '總報酬', means: '方塊價值＋金幣，合起來算', forbidden: ['總和'] },
  { term: '漲', means: '價格變高', forbidden: ['上升', '上揚', '走高'] },
  { term: '跌', means: '價格變低', forbidden: ['下滑', '走低', '下挫'] },
] as const

/** 專有名稱，檢查禁用詞前先移除。 */
export const PROPER_NAMES = ['高股息'] as const

/** 有 until 的步驟，line 必須用這些動作詞開頭。 */
export const ACTION_VERBS = ['拖', '點', '切', '按', '選', '看'] as const

export const LINE_SENTENCES_MAX = 2
export const LINE_SENTENCE_MAX = 16
export const MORE_SENTENCES_MAX = 4
export const MORE_SENTENCE_MAX = 25

/** 用 。！？ 分句，去掉 ** 與空白句。 */
export function sentences(text: string): string[] {
  return stripMarkup(text)
    .split(/[。！？]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function forbiddenWordsIn(text: string): string[] {
  let t = text
  for (const n of PROPER_NAMES) t = t.replaceAll(n, '')
  return GLOSSARY.flatMap((g) => g.forbidden.filter((w) => t.includes(w)))
}
