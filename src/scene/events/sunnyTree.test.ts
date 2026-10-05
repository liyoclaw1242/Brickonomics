import { describe, expect, it } from 'vitest'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import { SUNNY, SUNNY_DETAIL, SUNNY_END, crownPuffs, sunnyAt, sunnyFinal, treeGrowAt, warmthOf } from './sunnyTree'
import type { SpecOf } from './types'

const spec: SpecOf<'sunnyTree'> = { kind: 'sunnyTree' }

describe('sunnyTree timeline', () => {
  it('end = the final state: clouds gone, sun up, full warmth, tree fully grown', () => {
    expect(sunnyAt(spec, Infinity)).toEqual(sunnyFinal(spec))
    expect(sunnyAt(spec, SUNNY_END)).toEqual(sunnyFinal(spec))
    expect(sunnyFinal(spec)).toEqual({ clear: 1, sun: 1, warm: 1 })
    expect(treeGrowAt(Infinity)).toBe(1)
    expect(treeGrowAt(SUNNY_END)).toBe(1)
  })

  it('before the clock starts: overcast, no warmth, tree not grown', () => {
    expect(sunnyAt(spec, null)).toEqual({ clear: 0, sun: 0, warm: 0 })
    expect(treeGrowAt(null)).toBe(0)
  })

  it('warmth param scales the warm light (clamped 0..1)', () => {
    expect(warmthOf(spec)).toBe(1)
    expect(sunnyFinal({ kind: 'sunnyTree', warmth: 0.5 }).warm).toBe(0.5)
    expect(warmthOf({ kind: 'sunnyTree', warmth: 4 })).toBe(1)
    expect(warmthOf({ kind: 'sunnyTree', warmth: -1 })).toBe(0)
  })

  it('weather first, then growth (one thing at a time); everything only goes up, no flash', () => {
    let prev = { clear: 0, sun: 0, warm: 0 }
    let grow = 0
    for (let t = 0; t <= SUNNY_END + 1; t += 0.01) {
      const s = sunnyAt(spec, t)
      expect(s.clear).toBeGreaterThanOrEqual(prev.clear)
      expect(s.sun).toBeGreaterThanOrEqual(prev.sun)
      expect(s.warm).toBeGreaterThanOrEqual(prev.warm)
      expect(treeGrowAt(t)).toBeGreaterThanOrEqual(grow)
      if (treeGrowAt(t) > 0) expect(s.clear).toBeGreaterThan(0.5)
      prev = s
      grow = treeGrowAt(t)
    }
  })

  it('timeline registry: runs until the tree has grown, does not linger, leaves an aftermath', () => {
    expect(eventDuration(spec)).toBe(SUNNY_END)
    expect(eventLingers(spec)).toBe(false)
    expect(eventAftermath(spec)).toBe(true)
    expect(bigNumberDelayMs(spec, false)).toBe(SUNNY.growAt * 1000)
    expect(bigNumberDelayMs(spec, true)).toBe(0)
  })
})

describe('tree crown', () => {
  it('puffs sit around the top, fewer on low quality', () => {
    const hi = crownPuffs(SUNNY_DETAIL.high.crown)
    expect(hi).toHaveLength(SUNNY_DETAIL.high.crown)
    expect(SUNNY_DETAIL.low.crown).toBeLessThan(SUNNY_DETAIL.high.crown)
    for (const p of hi) {
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(1)
      expect(p.delay).toBeGreaterThanOrEqual(0)
      expect(p.delay).toBeLessThan(1)
    }
  })
})
