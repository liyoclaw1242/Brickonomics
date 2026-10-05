import { describe, expect, it } from 'vitest'
import { maxDrawdown } from '../../sim/drawdown'
import { QUAKE, pitDepthOf } from '../events/quake'
import { DD_DEMO, DD_LAYOUT, ddBarX, ddHeight, ddNow, ddQuake, PE_DEMO, PE_LAYOUT, peBubble, peSlabs, peYears } from './intermediate'
import { yearsToPayBack } from '../../sim/valuation'
import { bondPrice } from '../../sim/bondPrice'
import { RATE_DEMO, SEESAW, rateFreeze, ratePrice, seesawPose } from './intermediate'
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

describe('b-rate seesaw layout', () => {
  it('the old bond (2% a year, 10 years) is worth 100 at 2% and about 76.83 at 5%', () => {
    expect(ratePrice(RATE_DEMO.from)).toBeCloseTo(100, 9)
    expect(ratePrice(RATE_DEMO.to)).toBeCloseTo(bondPrice({ coupon: 0.02, years: 10, rate: 0.05 }), 12)
    expect(ratePrice(RATE_DEMO.to)).toBeCloseTo(2 * ((1 - 1.05 ** -10) / 0.05) + 100 / 1.05 ** 10, 9) // ≈ 76.83
  })
  it('level at the coupon rate; the rate end goes up and the price end goes down as the rate rises', () => {
    expect(seesawPose(RATE_DEMO.from).theta).toBeCloseTo(0, 9)
    let prev = seesawPose(RATE_DEMO.from)
    for (let r = RATE_DEMO.from + 0.005; r <= RATE_DEMO.to + 1e-9; r += 0.005) {
      const p = seesawPose(r)
      expect(p.left[1]).toBeGreaterThan(prev.left[1])
      expect(p.right[1]).toBeLessThan(prev.right[1])
      prev = p
    }
    // 最斜的時候板子末端還在地面以上（板子下緣 ≥ 0）
    expect(seesawPose(RATE_DEMO.to).right[1] - SEESAW.thick / 2).toBeGreaterThanOrEqual(-1e-9)
  })
  it('the freeze target is the old bond where it sits at the gate (5%), so the frost lines up with it', () => {
    const f = rateFreeze()
    expect(f.targets).toHaveLength(1)
    const end = seesawPose(RATE_DEMO.to).right
    expect(f.targets[0]!.at[0]).toBeCloseTo(end[0], 12)
    expect(f.targets[0]!.at[1]).toBeCloseTo(end[1] + SEESAW.thick / 2, 12)
    expect(f.targets[0]!.size).toEqual(SEESAW.bond)
  })
})
