/**
 * 當沖研究數據（高階 a-dt 的研究數據卡）。查證紀錄見 docs/data-sources.md 與 .superpowers/sdd/p8-daytrade-research.md。
 * 只收一手出處（期刊版摘要）明寫的數字；verified false 時畫面標 ？（資料待更新）。
 * 論文的「net of fees／after-fee」含交易稅；本專案不談稅，畫面一律寫「扣掉交易成本後」。
 * quote＝出處原文（逐字）；value 是畫面上的比例（0–1），bound 'lessThan'＝原文寫「不到」。
 */
export type ResearchFinding = {
  value: number
  bound: 'lessThan' | 'exact'
  /** 作者＋年份（畫面上的短出處） */
  shortCite: string
  citation: string
  doi: string
  year: number
  /** 樣本期間；sampleVerified false＝期刊版沒寫，只在工作論文看到 */
  sample: string
  sampleVerified: boolean
  quote: string
  verified: boolean
  /** 查證日 */
  checked: string
}

export const DAY_TRADE_RESEARCH = {
  /** 能「可預期、穩定地」在扣掉成本後賺錢的當沖客不到 1%（不是「當年有賺的人」） */
  reliablyProfitable: {
    value: 0.01,
    bound: 'lessThan',
    shortCite: 'Barber et al. 2014',
    citation: 'Barber, B. M., Lee, Y.-T., Liu, Y.-J., & Odean, T. (2014). The cross-section of speculator skill: Evidence from day trading. Journal of Financial Markets, 18, 1–24.',
    doi: 'https://doi.org/10.1016/j.finmar.2013.05.006',
    year: 2014,
    sample: '1992–2006',
    sampleVerified: true,
    quote: 'Less than 1% of the day trader population is able to predictably and reliably earn positive abnormal returns net of fees.',
    verified: true,
    checked: '2026-10-05',
  },
  /** 97% 的當沖客未來可能賠錢（「可能」：不是「已經賠了」） */
  likelyToLose: {
    value: 0.97,
    bound: 'exact',
    shortCite: 'Barber et al. 2020',
    citation: 'Barber, B. M., Lee, Y.-T., Liu, Y.-J., Odean, T., & Zhang, K. (2020). Learning, fast or slow. The Review of Asset Pricing Studies, 10(1), 61–93.',
    doi: 'https://doi.org/10.1093/rapstu/raz006',
    year: 2020,
    // 期刊版摘要只寫「day traders in Taiwan」；1992–2006 來自工作論文
    sample: '1992–2006',
    sampleVerified: false,
    quote: '97% of day traders are likely to lose money in future day trading.',
    verified: true,
    checked: '2026-10-05',
  },
} as const satisfies Record<string, ResearchFinding>

export type ResearchId = keyof typeof DAY_TRADE_RESEARCH

/** 這個研究數字查證過了沒（沒有 → 畫面標 ？）；r 讓測試能換一份資料 */
export function researchVerified(id: ResearchId, r: Record<ResearchId, ResearchFinding> = DAY_TRADE_RESEARCH): boolean {
  return r[id].verified
}
