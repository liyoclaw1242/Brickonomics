import { describe, it, expect } from 'vitest'
import { DAY_TRADE_RESEARCH, researchVerified } from './research'

describe('DAY_TRADE_RESEARCH (Task 3: only findings a primary source states)', () => {
  const all = Object.values(DAY_TRADE_RESEARCH)

  it('holds the two verified findings: < 1% reliably profitable (2014) and 97% likely to lose (2020)', () => {
    expect(Object.keys(DAY_TRADE_RESEARCH)).toEqual(['reliablyProfitable', 'likelyToLose'])
    expect(DAY_TRADE_RESEARCH.reliablyProfitable).toMatchObject({ value: 0.01, bound: 'lessThan', year: 2014, sample: '1992–2006', verified: true })
    expect(DAY_TRADE_RESEARCH.likelyToLose).toMatchObject({ value: 0.97, bound: 'exact', year: 2020, verified: true })
  })

  it('every finding has a citation with its year, a DOI link, the verbatim quote and the check date', () => {
    for (const f of all) {
      expect(f.citation, f.shortCite).toContain(`(${f.year})`)
      expect(f.doi.startsWith('https://doi.org/10.'), f.shortCite).toBe(true)
      expect(f.shortCite, f.shortCite).toContain(String(f.year))
      expect(f.checked).toBe('2026-10-05')
      expect(f.quote.length).toBeGreaterThan(20)
    }
  })

  it('the number on screen is the number in the quote (value × 100 appears as N%)', () => {
    for (const f of all) expect(f.quote, f.shortCite).toContain(`${Math.round(f.value * 100)}%`)
    expect(DAY_TRADE_RESEARCH.reliablyProfitable.quote).toContain('Less than 1%')
    expect(DAY_TRADE_RESEARCH.reliablyProfitable.quote).toContain('reliably') // 「穩定地」：不是「當年有賺的人」
    expect(DAY_TRADE_RESEARCH.likelyToLose.quote).toContain('likely to lose') // 「可能賠錢」：不是「已經賠錢」
  })

  it('the 2020 sample period is not in the journal abstract, so it is flagged unverified', () => {
    expect(DAY_TRADE_RESEARCH.reliablyProfitable.sampleVerified).toBe(true)
    expect(DAY_TRADE_RESEARCH.likelyToLose.sampleVerified).toBe(false)
  })

  it('researchVerified reads the flag (the step shows ？ when it is false)', () => {
    expect(researchVerified('reliablyProfitable')).toBe(true)
    expect(researchVerified('likelyToLose')).toBe(true)
    expect(researchVerified('likelyToLose', { ...DAY_TRADE_RESEARCH, likelyToLose: { ...DAY_TRADE_RESEARCH.likelyToLose, verified: false } })).toBe(false)
  })
})
