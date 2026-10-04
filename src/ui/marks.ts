import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { DEFAULT_VALUES } from '../tour/engine'
import { makeTextContext } from '../tour/context'
import type { Step, TextContext } from '../tour/types'
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
  // 這一步顯示的比例來自持股資料，持股沒查證就加 ？（用到哪些產品，從文字實際讀的資料推出來）
  if (holdingsSources(step, u).some((id) => { const a = u.get(id); return !a || !isVerified(a, 'holdings') })) out.push('unverified')
  return [...new Set(out)]
}

const contexts = new WeakMap<Universe, TextContext>()
const sources = new WeakMap<Universe, WeakMap<Step, string[]>>()

/**
 * 一步的文字（一句話、多說一點、文字版、標註、大數字）實際讀了哪些產品的持股，照第一次讀到的順序。
 * 用一個會記帳的 TextContext 把文字跑一遍，不必在步驟上手動宣告（r5：手動宣告漏了 e-3）。
 * 從持股算出來的查詢：weightPct、assetClassPct、sectorPct、shock（第一個參數＝產品），overlapShared（兩個都是）。
 * 大數字用進入這一步時的拉桿值。
 */
export function holdingsSources(step: Step, u: Universe): string[] {
  let byStep = sources.get(u)
  if (!byStep) sources.set(u, (byStep = new WeakMap()))
  const hit = byStep.get(step)
  if (hit) return hit
  let c = contexts.get(u)
  if (!c) contexts.set(u, (c = makeTextContext(u)))
  const seen = new Set<string>()
  const base = c
  const rec: TextContext = {
    ...base,
    weightPct: (p, h) => (seen.add(p), base.weightPct(p, h)),
    assetClassPct: (p, k) => (seen.add(p), base.assetClassPct(p, k)),
    sectorPct: (p, sec) => (seen.add(p), base.sectorPct(p, sec)),
    shock: (p) => (seen.add(p), base.shock(p)),
    overlapShared: (a, b) => (seen.add(a), seen.add(b), base.overlapShared(a, b)),
  }
  const run = (f: () => unknown) => {
    // 資料缺了（例如持股裡找不到某家）會丟錯：讀到的產品已經記下，照樣標 ？
    try { f() } catch { /* 已記下 */ }
  }
  const texts = [step.line, step.more, step.fallbackLine, step.fallbackMore, ...(step.callouts ?? []).flatMap((x) => [x.title, x.sub])]
  for (const t of texts) if (typeof t === 'function') run(() => t(rec))
  if (step.bigNumber) {
    const big = step.bigNumber
    run(() => big(rec, { ...DEFAULT_VALUES, ...step.scene.values }))
  }
  const out = [...seen]
  byStep.set(step, out)
  return out
}

/**
 * 一步的標示放在哪裡（每種只出現一次）：≈ 舉例、✎ 假設的數字放在標題旁；
 * ？ 資料待更新放在一句話後面（r3：放在標題下第一眼就看到，讓人不信任整堂課）。
 */
export function markPlacement(marks: readonly Mark[]): { title: Mark[]; afterLine: Mark[] } {
  const uniq = [...new Set(marks)]
  return { title: uniq.filter((m) => m !== 'unverified'), afterLine: uniq.filter((m) => m === 'unverified') }
}

/** 桌機面板內容寬（面板 312 − 左右 padding 16×2 − 邊框 2）；手機面板全寬，一定放得下 */
const TITLE_ROW_PX = 278
/** 標題字級：平常 26px；放不下時縮成 22px（＝手機的標題字級） */
const TITLE_PX = { normal: 26, snug: 22 } as const
const TITLE_SPACING = 1.02 // letter-spacing 0.02em
const PILL_FONT = 14
/** 小膠囊：邊框 2＋左右 padding 20＋圖示 1 字＋圖示與字的間距 4 */
const PILL_CHROME = 2 + 20 + PILL_FONT + 4
const TITLE_GAP = 8
const PILL_GAP = 6

/** 中日韓字與全形標點佔 1em，其他（數字、英文）約 0.6em */
const ems = (s: string) => [...s].reduce((n, ch) => n + (/[⺀-￯]/.test(ch) ? 1 : 0.6), 0)

/**
 * 標題＋標題旁的標示小膠囊能不能排在同一行（桌機面板）。words＝各個小膠囊上的字。
 * 平常字級放不下時，面板改用 snug（小一號的標題），不讓膠囊自己掉到下一行（Plan 6 walkthrough：f-6）。
 */
export function titleRowFits(title: string, words: readonly string[], size: keyof typeof TITLE_PX): boolean {
  const titlePx = ems(title) * TITLE_PX[size] * TITLE_SPACING
  const pillsPx = words.reduce((n, w, i) => n + (i > 0 ? PILL_GAP : 0) + PILL_CHROME + ems(w) * PILL_FONT, 0)
  return titlePx + (words.length > 0 ? TITLE_GAP + pillsPx : 0) <= TITLE_ROW_PX
}
