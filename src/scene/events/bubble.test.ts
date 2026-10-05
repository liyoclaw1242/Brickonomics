import { describe, expect, it } from 'vitest'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import { BUBBLE, BUBBLE_DETAIL, FLOAT_END, POP_END, bubbleAt, bubbleFinal, bubbleRadii, dropletDirs, isPopped, liftOf } from './bubble'
import type { SpecOf } from './types'

const target = { at: [3, 0, 0] as [number, number, number], size: [3, 8, 3] as [number, number, number] }
const float: SpecOf<'bubble'> = { kind: 'bubble', phase: 'float', target }
const pop: SpecOf<'bubble'> = { kind: 'bubble', phase: 'pop', target }

describe('bubble float', () => {
  it('end = the final state: wrapped in the bubble, floating at lift', () => {
    expect(bubbleAt(float, Infinity)).toEqual(bubbleFinal(float))
    expect(bubbleAt(float, FLOAT_END)).toEqual(bubbleFinal(float))
    expect(bubbleFinal(float)).toEqual({ bubble: 1, lift: liftOf(float), strain: 1, burst: null, squash: 1 })
    // 浮起後泡泡底部離地（高的目標浮更高）
    expect(liftOf(float)).toBeGreaterThanOrEqual(BUBBLE.lift)
    expect(liftOf(float) + target.size[1] / 2 - bubbleRadii(target.size)[1]).toBeGreaterThan(0)
  })

  it('before the clock starts: no bubble, on the ground', () => {
    expect(bubbleAt(float, null)).toMatchObject({ bubble: 0, lift: 0, burst: null })
  })

  it('wraps first, then lifts (one thing at a time); both only go up', () => {
    let b = 0
    let l = 0
    for (let t = 0; t <= FLOAT_END + 0.5; t += 0.01) {
      const s = bubbleAt(float, t)
      expect(s.bubble).toBeGreaterThanOrEqual(b)
      expect(s.lift).toBeGreaterThanOrEqual(l)
      if (s.lift > 0) expect(s.bubble).toBeGreaterThan(0.9)
      b = s.bubble
      l = s.lift
    }
  })

  it('lift param (clamped)', () => {
    expect(liftOf({ ...float, lift: 4 })).toBe(4)
    expect(liftOf({ ...float, lift: -1 })).toBe(0)
    expect(bubbleFinal({ ...float, lift: 4 }).lift).toBe(4)
  })
})

describe('bubble pop', () => {
  it('starts from the float end state (the bubble is already up there)', () => {
    expect(bubbleAt(pop, null)).toEqual(bubbleFinal(float))
    expect(bubbleAt(pop, 0)).toMatchObject({ bubble: 1, lift: liftOf(pop) })
  })

  it('end = the final state: no bubble, back on the ground, nothing flying', () => {
    expect(bubbleAt(pop, Infinity)).toEqual(bubbleFinal(pop))
    expect(bubbleAt(pop, POP_END)).toEqual(bubbleFinal(pop))
    expect(bubbleFinal(pop)).toEqual({ bubble: 0, lift: 0, strain: 1, burst: null, squash: 1 })
  })

  it('pops exactly once (the bubble never comes back) and there is no flash', () => {
    let switches = 0
    let prev = false
    for (let t = 0; t <= POP_END + 1; t += 0.005) {
      const p = isPopped(pop, t)
      if (p !== prev) switches += 1
      prev = p
      const s = bubbleAt(pop, t)
      if (p) expect(s.bubble).toBe(0)
      else expect(s.bubble).toBe(1)
    }
    expect(switches).toBe(1)
    expect(isPopped(float, Infinity)).toBe(false)
  })

  it('the target falls back down and never goes above where it floated', () => {
    for (let t = BUBBLE.popAt; t <= POP_END; t += 0.01) {
      const s = bubbleAt(pop, t)
      expect(s.lift).toBeGreaterThanOrEqual(0)
      expect(s.lift).toBeLessThanOrEqual(liftOf(pop))
    }
    expect(bubbleAt(pop, BUBBLE.popAt + 0.2).lift).toBeLessThan(liftOf(pop))
  })

  it('timeline registry: both phases run once and stop; only pop leaves an aftermath', () => {
    expect(eventDuration(float)).toBe(FLOAT_END)
    expect(eventDuration(pop)).toBe(POP_END)
    expect(eventLingers(float)).toBe(false)
    expect(eventLingers(pop)).toBe(false)
    expect(eventAftermath(float)).toBe(false)
    expect(eventAftermath(pop)).toBe(true)
    expect(bigNumberDelayMs(pop, false)).toBe(BUBBLE.popAt * 1000)
    expect(bigNumberDelayMs(pop, true)).toBe(0)
  })
})

describe('bubble geometry', () => {
  it('the bubble encloses the target with a margin', () => {
    const [rx, ry, rz] = bubbleRadii(target.size)
    expect(rx).toBeGreaterThan(target.size[0] / 2)
    expect(ry).toBeGreaterThan(target.size[1] / 2)
    expect(rz).toBeGreaterThan(target.size[2] / 2)
    // 方塊的角也在泡泡裡（橢球方程 ≤ 1）
    const corner = (target.size[0] / 2 / rx) ** 2 + (target.size[1] / 2 / ry) ** 2 + (target.size[2] / 2 / rz) ** 2
    expect(corner).toBeLessThanOrEqual(1)
  })

  it('droplets fly out in all directions (unit vectors); fewer on low quality', () => {
    const dirs = dropletDirs(BUBBLE_DETAIL.high.droplets)
    expect(dirs).toHaveLength(BUBBLE_DETAIL.high.droplets)
    for (const d of dirs) expect(Math.hypot(...d)).toBeCloseTo(1)
    expect(BUBBLE_DETAIL.low.droplets).toBeLessThan(BUBBLE_DETAIL.high.droplets)
  })
})
