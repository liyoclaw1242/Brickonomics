import { describe, it, expect } from 'vitest'
import { approachVec, CAMERA_PRESETS, MAX_DISTANCE, MAX_POLAR, MIN_DISTANCE, rigDt, type Vec3 } from './camera'

describe('approachVec', () => {
  it('moves part of the way and snaps when close', () => {
    const a = approachVec([0, 0, 0], [10, 0, 0], 0.1)
    expect(a.next[0]).toBeGreaterThan(0)
    expect(a.next[0]).toBeLessThan(10)
    expect(a.done).toBe(false)
    const b = approachVec([9.99, 0, 0], [10, 0, 0], 0.016)
    expect(b).toEqual({ next: [10, 0, 0], done: true })
  })
})

describe('CAMERA_PRESETS', () => {
  it('defines every preset', () => {
    expect(Object.keys(CAMERA_PRESETS).sort()).toEqual(['exchange', 'exchangeSide', 'exchangeWide', 'overview', 'plaza', 'plazaNear', 'sky', 'tw', 'underground', 'us'])
  })
})

describe('presets vs OrbitControls limits', () => {
  it('every preset (except start-only sky) is reachable', () => {
    for (const [id, p] of Object.entries(CAMERA_PRESETS)) {
      if (id === 'sky') continue
      const d = p.position.map((v, i) => v - p.target[i]!) as Vec3
      const dist = Math.hypot(...d)
      expect(dist, id).toBeGreaterThanOrEqual(MIN_DISTANCE)
      expect(dist, id).toBeLessThanOrEqual(MAX_DISTANCE)
      expect(Math.acos(d[1] / dist), id).toBeLessThanOrEqual(MAX_POLAR - 0.01)
    }
  })
})

describe('rigDt', () => {
  it('uses 1/60 on the first frame and for bad input, caps at 0.25', () => {
    expect(rigDt(0.5, true)).toBe(1 / 60)
    expect(rigDt(NaN, false)).toBe(1 / 60)
    expect(rigDt(-1, false)).toBe(1 / 60)
    expect(rigDt(0.01, false)).toBe(0.01)
    expect(rigDt(2, false)).toBe(0.25)
  })
})
