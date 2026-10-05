import { describe, expect, it } from 'vitest'
import { maxDrawdown } from '../../sim/drawdown'
import { QUAKE, pitDepthOf } from '../events/quake'
import { DD_DEMO, DD_LAYOUT, ddBarX, ddHeight, ddNow, ddQuake, PE_DEMO, PE_LAYOUT, peBubble, peSlabs, peYears } from './intermediate'
import { yearsToPayBack } from '../../sim/valuation'
import { bubbleRadii } from '../events/bubble'

describe('s-dd drawdown layout', () => {
  it('the example path falls 40% from its peak (140 → 84)', () => {
    const d = maxDrawdown(DD_DEMO.path)
    expect(DD_DEMO.path[d.peakIndex]).toBe(140)
    expect(DD_DEMO.path[d.troughIndex]).toBe(84)
    expect(d.pct).toBeCloseTo(0.4, 12) // (140 − 84) ÷ 140
  })

  it('bars: the peak bar is QUAKE.maxDepth tall, so the red drop on the trough bar is exactly as deep as the pit', () => {
    const d = maxDrawdown(DD_DEMO.path)
    expect(ddHeight(140)).toBeCloseTo(QUAKE.maxDepth, 12)
    const drop = ddHeight(140) - ddHeight(84)
    expect(drop).toBeCloseTo(pitDepthOf(ddQuake()), 12) // 6 × 0.4 = 2.4
    expect(ddQuake().depth).toBeCloseTo(d.pct, 12)
  })

  it('the quake pit sits in front of the trough bar', () => {
    const d = maxDrawdown(DD_DEMO.path)
    expect(ddQuake().at![0]).toBeCloseTo(ddBarX(d.troughIndex), 12)
    expect(ddQuake().at![1]).toBeGreaterThan(DD_LAYOUT.barZ)
  })

  it('ddNow: running peak, current drop and the biggest drop so far, at every tick', () => {
    expect(ddNow(0)).toMatchObject({ price: 100, peak: 100, drop: 0, worst: 0 })
    expect(ddNow(4)).toMatchObject({ price: 112, peak: 140 })
    expect(ddNow(4).drop).toBeCloseTo((140 - 112) / 140, 12) // 20%
    expect(ddNow(5).worst).toBeCloseTo(0.4, 12)
    expect(ddNow(7).drop).toBeCloseTo((140 - 120) / 140, 12) // 長回 120：現在少 14%
    expect(ddNow(7).worst).toBeCloseTo(0.4, 12) // 最多曾經少掉的，不會因為長回來而變小
    for (let i = 0; i < DD_DEMO.path.length; i++) expect(ddNow(i).worst).toBeCloseTo(maxDrawdown(DD_DEMO.path.slice(0, i + 1)).pct, 12)
    // 拉桿值不是整數或超出範圍：取整、限制在路徑內
    expect(ddNow(4.6).price).toBe(DD_DEMO.path[5])
    expect(ddNow(99).price).toBe(DD_DEMO.path.at(-1))
  })
})

describe('s-pe P/E layout', () => {
  it('same price, different yearly earnings: 600 ÷ 40 = 15 years, 600 ÷ 10 = 60 years', () => {
    expect(peYears('cheap')).toBe(yearsToPayBack(PE_DEMO.price, PE_DEMO.earnings.cheap))
    expect(peYears('cheap')).toBe(15)
    expect(peYears('pricey')).toBe(60)
  })
  it('one slab per year; the slabs reach exactly the building height when paid back', () => {
    for (const k of ['cheap', 'pricey'] as const) {
      const full = peSlabs(k, 999)
      expect(full.count).toBe(peYears(k))
      expect(full.count * full.pitch).toBeCloseTo(PE_LAYOUT.height, 12)
      expect(peSlabs(k, 0).count).toBe(0)
      expect(peSlabs(k, 10.6).count).toBe(Math.min(10, peYears(k)))
    }
    expect(peSlabs('cheap', 30).count).toBe(15) // 15 年就疊滿，不再長
    expect(peSlabs('pricey', 30).count).toBe(30)
  })
  it('the bubble wraps the pricey building and clears its profit stack', () => {
    const b = peBubble()
    expect(b).toMatchObject({ kind: 'bubble', phase: 'float' })
    expect(b.target.at[0]).toBe(PE_LAYOUT.x.pricey)
    expect(b.target.size[1]).toBe(PE_LAYOUT.height)
    const rx = bubbleRadii(b.target.size)[0]
    expect(Math.abs(PE_LAYOUT.slabX.pricey - PE_LAYOUT.x.pricey) - PE_LAYOUT.slabW / 2).toBeGreaterThan(rx)
  })
})
