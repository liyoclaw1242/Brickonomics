import { describe, it, expect } from 'vitest'
import { T } from './strings'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { isVerified } from '../data/verified'
import { feeRowMarks, holdingsSources, markPlacement, stepMarks, titleRowFits } from './marks'

describe('mark words (user test r2: 示意／假設／待查 were not understood)', () => {
  it('uses plain words on the pills', () => {
    expect(T.marks.illustrative.word).toBe('舉例')
    expect(T.marks.assumption.word).toBe('假設的數字')
    expect(T.marks.unverified.word).toBe('資料待更新') // r3：「你自己都沒查證，那是在教我什麼？」
    expect(T.marks.unverified.icon).toBe('？')
    expect(T.marks.unverified.label).toBe('資料待更新：這個數字還沒有和官方最新資料核對過')
  })

  it('each tooltip starts with the word it explains', () => {
    for (const m of Object.values(T.marks)) expect(m.label.startsWith(m.word), m.label).toBe(true)
  })

  it('the readout note uses the same word as the pill', () => {
    expect(T.readout.unverifiedParts('內扣費用').startsWith(T.marks.unverified.word)).toBe(true)
  })

  it('feeRowMarks: the front-load row is an assumption, unverified parts add ？', () => {
    expect(feeRowMarks('front', 0)).toEqual(['assumption'])
    expect(feeRowMarks('back', 2)).toEqual(['unverified'])
  })
})

describe('stepMarks for the fee meter', () => {
  it('adds ？ only when the meter fund\'s expense ratio is unverified', () => {
    const f5 = LEVELS.flatMap((l) => l.steps).find((s) => s.id === 'f-5')!
    const fund = universe.get(f5.scene.product!)!
    expect(stepMarks(f5, universe).includes('unverified')).toBe(!isVerified(fund, 'fees.expenseRatio'))
    const unverifiedCopy = new Map(universe)
    unverifiedCopy.set(fund.id, { ...fund, verified: {} })
    expect(stepMarks(f5, unverifiedCopy)).toContain('unverified')
  })
})

describe('markPlacement (r3: ？ after the line, not the first thing under the title)', () => {
  it('keeps ≈／✎ next to the title and moves ？ after the line, once', () => {
    expect(markPlacement(['assumption', 'unverified'])).toEqual({ title: ['assumption'], afterLine: ['unverified'] })
    expect(markPlacement(['illustrative'])).toEqual({ title: ['illustrative'], afterLine: [] })
    expect(markPlacement(['unverified', 'unverified'])).toEqual({ title: [], afterLine: ['unverified'] })
    expect(markPlacement([])).toEqual({ title: [], afterLine: [] })
  })

  it('every step shows each mark exactly once across the two places', () => {
    for (const s of LEVELS.flatMap((l) => l.steps)) {
      const m = stepMarks(s, universe)
      const p = markPlacement(m)
      expect([...p.title, ...p.afterLine].sort(), s.id).toEqual([...new Set(m)].sort())
    }
  })
})

describe('holdingsSources (r5: derived from the text, no manual holdingsFrom)', () => {
  const byId = (id: string) => LEVELS.flatMap((l) => l.steps).find((s) => s.id === id)!
  it('returns the products whose holdings a step\'s text, callouts and big number read', () => {
    expect(holdingsSources(byId('e-3'), universe)).toEqual(['0050'])
    expect(holdingsSources(byId('f-2'), universe)).toEqual(['JH_BALANCED'])
    expect(holdingsSources(byId('f-4'), universe)).toEqual(['JH_BALANCED', 'ALLIANZ_INCOME_GROWTH'])
    expect(holdingsSources(byId('c-2'), universe)).toEqual(['0050', 'SPY']) // shock 也是從持股算的
    expect(holdingsSources(byId('c-3'), universe)).toEqual(['QQQ', 'SPY'])
    expect(holdingsSources(byId('p-1'), universe)).toEqual([])
    expect(holdingsSources(byId('f-5'), universe)).toEqual([]) // 內扣費用不是持股
  })
})

describe('title + mark pills stay on one row (walkthrough: f-6 ✎ wrapped under the title)', () => {
  const words = (step: { mark?: 'illustrative' | 'assumption' }) => (step.mark ? [T.marks[step.mark].word] : [])
  it('f-6 (7 characters + ✎ 假設的數字) does not fit at the normal size but fits at the snug size', () => {
    const f6 = LEVELS.flatMap((l) => l.steps).find((s) => s.id === 'f-6')!
    expect(titleRowFits(f6.title, words(f6), 'normal')).toBe(false)
    expect(titleRowFits(f6.title, words(f6), 'snug')).toBe(true)
  })
  it('every marked step fits on one row at one of the two sizes', () => {
    for (const s of LEVELS.flatMap((l) => l.steps).filter((x) => x.mark)) {
      expect(titleRowFits(s.title, words(s), 'normal') || titleRowFits(s.title, words(s), 'snug'), s.id).toBe(true)
    }
  })
  it('short titles with ≈ 舉例 keep the normal size', () => {
    expect(titleRowFits('公司變不值錢', [T.marks.illustrative.word], 'normal')).toBe(true)
  })
})
