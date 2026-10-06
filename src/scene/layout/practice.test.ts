import { describe, expect, it } from 'vitest'
import { CC_RISE_MIN, ccNow, ccSunny } from './practice'

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
