import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { feeRace, feeRaceLeader, feeRaceProfiles } from './feeRace'

const row = (years: number, id: 'front' | 'back' | 'etf', fl = 0.015) => feeRace(universe, years, fl).find((r) => r.id === id)!

describe('feeRace', () => {
  it('selling within the first year: front pays its load, back pays the year-1 CDSC', () => {
    expect(row(0, 'front').value).toBeCloseTo(98.5, 3) // 100 × (1 − 0.015)
    expect(row(0, 'back').value).toBeCloseTo(97, 3) // 100 × (1 − 0.03)
    // ETF：買 0.1425%，賣 1 − (1 − 0.001425)(1 − 0.001)
    expect(row(0, 'etf').value).toBeCloseTo(99.6155, 3)
  })

  it('after 3 years: back-load has paid 3 years of distribution fee but no CDSC', () => {
    expect(row(3, 'front').value).toBeCloseTo(95.2851, 3) // 98.5 × 0.989^3
    expect(row(3, 'back').value).toBeCloseTo(93.863, 2) // 0.989^3 × 0.99^3
    expect(row(3, 'front').lost).toBeCloseTo(100 - 95.2851, 3)
  })

  it('a higher assumed front load flips the comparison', () => {
    expect(row(1, 'front', 0.03).value).toBeLessThan(row(1, 'back', 0.03).value) // 97 × 0.989 = 95.93 < 95.95
    expect(row(1, 'front', 0.015).value).toBeGreaterThan(row(1, 'back', 0.015).value)
  })

  it('marks the assumed front load and unverified parts', () => {
    // 前收手續費是使用者的假設，不是待驗證的資料；只有經理費（資料）待驗證
    expect(row(1, 'front').unverified).toEqual(['expenseRatio'])
    expect(row(1, 'back').unverified).toContain('expenseRatio') // U 級別經理費待驗證
    expect(row(1, 'back').unverified).not.toContain('cdsc')
  })

  it('picks the leader by remaining value', () => {
    expect(feeRaceLeader(feeRace(universe, 3, 0.015))).toBe('etf')
  })

  it('builds the profiles from data', () => {
    const p = feeRaceProfiles(universe, 0.02)
    expect(p.front.entry).toBeCloseTo(0.02)
    expect(p.back.exitByYear).toHaveLength(3)
    ;[0.03, 0.02, 0.01].forEach((c, i) => expect(p.back.exitByYear[i]).toBeCloseTo(c))
  })
})
