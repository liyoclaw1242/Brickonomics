import { describe, expect, it } from 'vitest'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import { FREEZE, FREEZE_DETAIL, FREEZE_END, chillLevel, frostLevel, frostMix, frostOf, frostProgress, frostWeights, freezeTint, icicleCount, icicleSlots, windLevel } from './freeze'
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

describe('freeze review fixes (Plan 7 Task 1 review)', () => {
  it('icicles are shared out per target: every target keeps some, the longest gets the most, the total stays within the cap', () => {
    const many: SpecOf<'freeze'>['targets'] = [board(30, 0), board(30, 2), board(3, 4)]
    for (const q of ['high', 'low'] as const) {
      const n = icicleSlots(many, q)
      expect(n.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(FREEZE_DETAIL[q].maxIcicles)
      for (const k of n) expect(k).toBeGreaterThanOrEqual(1) // 後面的短板子不會被截掉
      expect(n[0]!).toBeGreaterThanOrEqual(n[2]!)
    }
    // 沒超過上限時照原本的數量
    expect(icicleSlots(spec.targets, 'high')).toEqual(spec.targets.map((t) => icicleCount(t.size[0], 'high')))
  })

  it('the cold light uses amount clamped to 0..1 (never negative)', () => {
    expect(chillLevel({ ...spec, amount: -2 }, Infinity)).toBe(0)
    expect(chillLevel({ ...spec, amount: 5 }, Infinity)).toBe(1)
    expect(chillLevel(spec, null)).toBe(0)
  })

  it('frost on gold mixes toward a cool, light ice (not olive): blue ≥ red and lighter than the base', () => {
    const gold: [number, number, number] = [0.79, 0.64, 0.15]
    const ice: [number, number, number] = [0.62, 0.86, 1]
    const out = frostMix(gold, ice, FREEZE.tint)
    expect(out[2]).toBeGreaterThanOrEqual(out[0])
    expect(out[2]).toBeGreaterThan(out[1] - 0.05)
    const lum = (c: readonly number[]) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
    expect(lum(out)).toBeGreaterThan(lum(gold))
    expect(frostMix(gold, ice, 0)).toEqual(gold)
  })
})
