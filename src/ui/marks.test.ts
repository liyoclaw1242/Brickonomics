import { describe, it, expect } from 'vitest'
import { T } from './strings'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { isVerified } from '../data/verified'
import { feeRowMarks, markPlacement, stepMarks } from './marks'

describe('mark words (user test r2: 示意／假設／待查 were not understood)', () => {
  it('uses plain words on the pills', () => {
    expect(T.marks.illustrative.word).toBe('舉例')
    expect(T.marks.assumption.word).toBe('假設的數字')
    expect(T.marks.unverified.word).toBe('資料待更新') // r3：「你自己都沒查證，那是在教我什麼？」
    expect(T.marks.unverified.icon).toBe('？')
    expect(T.marks.unverified.label).toBe('資料待更新：這個數字來自公開資料，還在等最新一期核對')
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
