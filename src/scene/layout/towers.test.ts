import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { feeRaceRows } from '../../sim/feeRace'
import { T } from '../../ui/strings'
import { feeTowerSpecs, towerTexts } from './towers'

const specs = (years: number, fl = 0.015) => feeTowerSpecs(feeRaceRows(universe, years, fl, false))

describe('feeTowerSpecs (f-6 進門費、出門費, user test r3)', () => {
  it('names the two towers 前收／後收 with 進門先付／出門才付', () => {
    const [front, back] = specs(0)
    expect(front!.name).toBe('前收')
    expect(front!.label).toBe('進門先付')
    expect(back!.name).toBe('後收')
    expect(back!.label).toBe('出門才付')
    expect(specs(0)).toHaveLength(2)
  })

  it('uses one vocabulary on the 3D labels: 進門費, 出門費, 每年費用（一直在扣）', () => {
    const [front, back] = specs(0)
    expect(front!.door).toEqual({ amount: expect.closeTo(1.5, 9), label: '進門費 1.5 萬' })
    expect(back!.door).toEqual({ amount: expect.closeTo(3, 9), label: '出門費 3 萬' })
    for (const t of specs(5)) expect(t.lostLabel).toBe('每年費用（一直在扣）')
    expect(T.towers.held).toBe('每年費用（一直在扣）')
  })

  it('the back-load tower never reads as free: no 0% or 免費, and the yearly fee stays labelled', () => {
    for (let y = 0; y <= 10; y += 0.5) {
      for (const t of specs(y)) {
        for (const text of towerTexts(t)) {
          expect(text, `year ${y}`).not.toMatch(/(^|[^\d.])0%|免費/)
          expect(text, `year ${y}`).not.toMatch(/前收型|後收型|入口|出口/)
        }
      }
    }
    const back = specs(4)[1]!
    expect(back.door!.label).toBe('出門費 0 萬')
    expect(back.lostLabel).toBe('每年費用（一直在扣）')
    expect(back.lost! - back.door!.amount).toBeGreaterThan(0) // 每年費用還在扣
  })

  it('tower tops show only the name (mid-r2: too many numbers; the total fee is the big number), values stay in the readout', () => {
    const [front, back] = specs(10)
    expect(towerTexts(front!)).toContain('前收')
    expect(towerTexts(back!)).toContain('後收')
    for (const t of [front!, back!]) for (const text of towerTexts(t)) expect(text).not.toMatch(/8[45]\.\d 萬/)
    expect(front!.value).toBeCloseTo(85.72, 2) // 98.5 × 0.9862^10 = 98.5 × 0.870261
    expect(back!.value).toBeCloseTo(84.44, 2) // 100 × 0.9862^10 × 0.99^3 = 0.870261 × 0.970299
  })
})
