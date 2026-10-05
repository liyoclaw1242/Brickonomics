import { Color } from 'three'
import { THEMES } from '../theme'
import { describe, expect, it } from 'vitest'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import { HEAT, HEAT_DETAIL, HEAT_END, HEAT_SUN, coinScaleAt, heatLevel, meltAt, meltOf, shimmerOffset } from './heatwave'
import type { SpecOf } from './types'

const spec: SpecOf<'heatwave'> = { kind: 'heatwave', melt: 0.3, coins: [[0, 0, 0]] }

describe('heatwave timeline', () => {
  it('end = the final state: full heat, coins melted by exactly melt (0.3 → 70% left)', () => {
    for (const t of [HEAT_END, Infinity]) {
      expect(heatLevel(t)).toBe(1)
      expect(meltAt(spec, t)).toBeCloseTo(0.3)
      expect(coinScaleAt(spec, t)).toBeCloseTo(0.7)
    }
  })

  it('before the clock starts: no heat, coins whole', () => {
    expect(meltAt(spec, null)).toBe(0)
    expect(coinScaleAt(spec, null)).toBe(1)
    expect(heatLevel(0)).toBe(0)
  })

  it('melt param is clamped to 0..1', () => {
    expect(meltOf({ kind: 'heatwave', melt: 2 })).toBe(1)
    expect(meltOf({ kind: 'heatwave', melt: -1 })).toBe(0)
    expect(coinScaleAt({ kind: 'heatwave', melt: 2 }, Infinity)).toBe(0)
  })

  it('heat builds first, then the coins melt slowly; both only go one way; no flash', () => {
    let heat = 0
    let scale = 1
    for (let t = 0; t <= HEAT_END + 1; t += 0.01) {
      const h = heatLevel(t)
      const c = coinScaleAt(spec, t)
      expect(h).toBeGreaterThanOrEqual(heat)
      expect(c).toBeLessThanOrEqual(scale)
      if (c < 1) expect(h).toBeGreaterThan(0.5)
      heat = h
      scale = c
    }
    expect(HEAT.melt).toBeGreaterThanOrEqual(2)
  })

  it('shimmer is a gentle sideways wave (bounded)', () => {
    for (let y = 0; y < 8; y += 0.5) expect(Math.abs(shimmerOffset(y, 1.3, 2))).toBeLessThanOrEqual(HEAT.shimmerAmp)
  })

  it('timeline registry: runs once, does not linger, leaves an aftermath', () => {
    expect(eventDuration(spec)).toBe(HEAT_END)
    expect(eventLingers(spec)).toBe(false)
    expect(eventAftermath(spec)).toBe(true)
    expect(bigNumberDelayMs(spec, false)).toBe(HEAT.meltAt * 1000)
    expect(bigNumberDelayMs(spec, true)).toBe(0)
  })

  it('low quality is simpler', () => {
    expect(HEAT_DETAIL.low.lines).toBeLessThan(HEAT_DETAIL.high.lines)
    expect(HEAT_DETAIL.low.segments).toBeLessThan(HEAT_DETAIL.high.segments)
  })
})

describe('the heatwave sun is not the sunnyTree sun (mid-r2: one phenomenon, one meaning)', () => {
  it('no rays, and a red-orange core unlike the sunny sun in both themes', () => {
    expect(HEAT_SUN.rays).toBe(0)
    for (const th of Object.values(THEMES)) {
      expect(th.heat.sun).not.toBe(th.sunny.sun)
      const c = new Color(th.heat.sun)
      expect(c.r).toBeGreaterThan(0.9)
      expect(c.g).toBeLessThan(0.45) // 紅橘，不是黃白
    }
  })
})
