export type Mark = 'illustrative' | 'assumption' | 'unverified'

/** 費用比一比的一列該標哪些圖示：前收費用是假設值（✎），有待驗證的拆項再加 ？ */
export function feeRowMarks(id: 'front' | 'back' | 'etf', unverifiedParts: number): Mark[] {
  return [...(id === 'front' ? (['assumption'] as const) : []), ...(unverifiedParts > 0 ? (['unverified'] as const) : [])]
}
