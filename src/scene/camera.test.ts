import { describe, it, expect } from 'vitest'
import { approachVec, CAMERA_PRESETS } from './camera'

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
    expect(Object.keys(CAMERA_PRESETS).sort()).toEqual(['exchange', 'overview', 'plaza', 'sky', 'tw', 'us'])
  })
})
