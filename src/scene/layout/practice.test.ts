import { describe, expect, it } from 'vitest'
import { navPayoutLayout, NP_LAYOUT, CC_RISE_MIN, ccNow, ccSunny } from './practice'
import { checkupOf } from '../../data/fundCheckup'

describe('x-cc covered-call tower (ceiling +5%, premium 2%; ≈)', () => {
  it('big rise +20%: tower kept at 105, the plain tower would reach 120 (15 sold away), coin 2', () => {
    const n = ccNow(20)
    expect(n.kept).toBeCloseTo(105, 10)
    expect(n.full).toBeCloseTo(120, 10)
    expect(n.full - n.kept).toBeCloseTo(100 * n.cut, 10)
    expect(n.ceiling).toBeCloseTo(105, 10)
    expect(n.coin).toBeCloseTo(2, 10)
    expect(n.coins).toBe(2) // 每 1% 一枚
    expect(n.covered).toBeCloseTo(0.07, 12)
  })

  it('flat: tower stays at 100, nothing sold away, covered = premium', () => {
    const n = ccNow(0)
    expect(n.kept).toBe(100)
    expect(n.full).toBe(100)
    expect(n.covered).toBeCloseTo(0.02, 12)
  })

  it('fall −20%: tower at 80 (same as plain), covered −18%', () => {
    const n = ccNow(-20)
    expect(n.kept).toBeCloseTo(80, 10)
    expect(n.full).toBeCloseTo(80, 10)
    expect(n.covered).toBeCloseTo(-0.18, 12)
  })

  it('clamps and rounds the slider value', () => {
    expect(ccNow(99).movePct).toBe(20)
    expect(ccNow(-99).movePct).toBe(-20)
    expect(ccNow(3.4).movePct).toBe(3)
    expect(ccNow(Number.NaN).movePct).toBe(0)
  })

  it('🌤 sunnyTree only on a rise (gate ≥ 1%); fixed params', () => {
    expect(CC_RISE_MIN).toBe(1)
    expect(ccSunny()).toEqual(ccSunny())
    expect(ccSunny().kind).toBe('sunnyTree')
  })
})

describe('x-pay NAV bars and payout coins (navPayoutLayout)', () => {
  const f = checkupOf('JFZN3')
  const L = navPayoutLayout(f)
  it('draws 13 month-end bars from a floor 2 below the lowest NAV: floor(72.50) − 2 = 70', () => {
    expect(L.floor).toBe(70)
    expect(L.bars).toHaveLength(13) // 起點 2025-09-30 ＋ 12 個月底
    expect(L.bars[0]).toMatchObject({ date: '2025-09-30', nav: 74.99 })
    expect(L.bars[0]!.h).toBeCloseTo((74.99 - 70) * NP_LAYOUT.unit, 10)
    // 平均排開，中間那根在廣場中心：x = (i − 6) × spacing
    expect(L.bars[0]!.x).toBeCloseTo(-6 * NP_LAYOUT.spacing, 10)
    expect(L.bars[12]!.x).toBeCloseTo(6 * NP_LAYOUT.spacing, 10)
  })
  it('puts each payout in front of the bar of its record month, split into income (bottom) and capital (top) at the same per-dollar scale', () => {
    expect(L.coins).toHaveLength(12)
    expect(L.coins[0]).toMatchObject({ recordDate: '2025-10-09', capitalPct: 0 })
    expect(L.coins[0]!.x).toBe(L.bars[1]!.x) // 2025-10-09 → 2025-10-31 那根
    expect(L.coins[0]!.capitalH).toBe(0)
    // 2026-02-09：0.693，本金 76%
    expect(L.coins[4]!.x).toBe(L.bars[5]!.x)
    expect(L.coins[4]!.incomeH).toBeCloseTo(0.693 * 0.24 * NP_LAYOUT.unit, 10)
    expect(L.coins[4]!.capitalH).toBeCloseTo(0.693 * 0.76 * NP_LAYOUT.unit, 10)
  })
  it('marks how much shorter the last bar is than the start (74.99 → 72.87, 2.12 × unit)', () => {
    expect(L.startY).toBeCloseTo((74.99 - 70) * NP_LAYOUT.unit, 10)
    expect(L.endY).toBeCloseTo((72.87 - 70) * NP_LAYOUT.unit, 10)
    expect(L.startY - L.endY).toBeCloseTo(2.12 * NP_LAYOUT.unit, 10)
  })
})
