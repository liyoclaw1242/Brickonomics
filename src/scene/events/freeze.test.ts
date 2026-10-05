import { describe, expect, it } from 'vitest'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import { FREEZE, FREEZE_DETAIL, FREEZE_END, frostLevel, frostOf, frostProgress, frostWeights, freezeTint, icicleCount, windLevel } from './freeze'
import type { SpecOf } from './types'

const board = (len: number, z: number) => ({ at: [0, 0, z] as [number, number, number], size: [len, 1.2, 1.2] as [number, number, number] })
const spec: SpecOf<'freeze'> = { kind: 'freeze', amount: 0.8, targets: [board(3, 4), board(7, 0), board(12, -4)] }

describe('freeze timeline', () => {
  it('end = the final state: wind gone, every target frosted to amount × its weight', () => {
    for (const t of [FREEZE_END, Infinity]) {
      expect(windLevel(t)).toBe(0)
      expect(frostProgress(t)).toBe(1)
      spec.targets.forEach((_, i) => expect(frostLevel(spec, i, t)).toBe(frostOf(spec, i)))
    }
    expect(frostOf(spec, 2)).toBeCloseTo(0.8)
    expect(frostOf(spec, 0)).toBeCloseTo(0.8 * (3 / 12))
  })

  it('before the clock starts: no frost, no wind', () => {
    expect(frostLevel(spec, 2, null)).toBe(0)
    expect(windLevel(-1)).toBe(0)
    expect(frostProgress(0)).toBe(0)
  })

  it('longer targets get thicker frost; amount is clamped to 0..1', () => {
    expect(frostWeights(spec.targets)).toEqual([3 / 12, 7 / 12, 1])
    expect(frostOf(spec, 0)).toBeLessThan(frostOf(spec, 1))
    expect(frostOf(spec, 1)).toBeLessThan(frostOf(spec, 2))
    expect(frostOf({ ...spec, amount: 3 }, 2)).toBe(1)
    expect(frostOf({ ...spec, amount: -1 }, 2)).toBe(0)
    // length 可以覆蓋 size[0]（例如年期）
    const byYears: SpecOf<'freeze'> = { kind: 'freeze', amount: 1, targets: [{ ...board(5, 0), length: 30 }, { ...board(5, 2), length: 2 }] }
    expect(frostOf(byYears, 1)).toBeCloseTo(2 / 30)
  })

  it('one gust of wind (a single plateau, no flash); frost only grows', () => {
    let humps = 0
    let prev = 0
    let rising = false
    let frost = 0
    for (let t = 0; t <= FREEZE_END + 1; t += 0.005) {
      const w = windLevel(t)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
      if (w > prev) rising = true
      if (w < prev && rising) {
        humps += 1
        rising = false
      }
      prev = w
      expect(frostProgress(t)).toBeGreaterThanOrEqual(frost)
      frost = frostProgress(t)
    }
    expect(humps).toBe(1)
  })

  it('tint toward ice blue follows the frost level', () => {
    expect(freezeTint(spec, 2, Infinity)).toBeCloseTo(FREEZE.tint * frostOf(spec, 2))
    expect(freezeTint(spec, 2, null)).toBe(0)
  })

  it('timeline registry: runs once, does not linger, leaves an aftermath', () => {
    expect(eventDuration(spec)).toBe(FREEZE_END)
    expect(eventLingers(spec)).toBe(false)
    expect(eventAftermath(spec)).toBe(true)
    expect(bigNumberDelayMs(spec, false)).toBe(FREEZE.frostAt * 1000)
    expect(bigNumberDelayMs(spec, true)).toBe(0)
  })
})

describe('freeze detail', () => {
  it('icicles along the length (more on longer targets), fewer on low quality', () => {
    expect(icicleCount(12, 'high')).toBeGreaterThan(icicleCount(3, 'high'))
    expect(icicleCount(12, 'low')).toBeLessThan(icicleCount(12, 'high'))
    expect(FREEZE_DETAIL.low.streaks).toBeLessThan(FREEZE_DETAIL.high.streaks)
  })
})
