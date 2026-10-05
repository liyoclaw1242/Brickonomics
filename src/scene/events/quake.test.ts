import { describe, expect, it } from 'vitest'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import { QUAKE, QUAKE_DETAIL, QUAKE_END, crackLines, pitDepthOf, pitOutline, quakeAt, quakeFinal, shakeLevel } from './quake'
import type { SpecOf } from './types'

const spec: SpecOf<'quake'> = { kind: 'quake', depth: 0.4 }

describe('quake timeline', () => {
  it('end = the final state: no shaking, crack fully open, pit at depth × maxDepth, dust settled', () => {
    expect(quakeAt(spec, Infinity)).toEqual(quakeFinal(spec))
    expect(quakeAt(spec, QUAKE_END)).toEqual(quakeFinal(spec))
    expect(quakeFinal(spec)).toMatchObject({ shakeX: 0, shakeZ: 0, open: 1, depth: 0.4 * QUAKE.maxDepth, dust: 0, ripple: null })
  })

  it('before the clock starts nothing has happened (no pit)', () => {
    expect(quakeAt(spec, null)).toEqual({ shakeX: 0, shakeZ: 0, open: 0, depth: 0, dust: 0, ripple: null })
    expect(quakeAt(spec, 0).open).toBe(0)
  })

  it('pit depth = the depth param (clamped to 0..1), 40% drop → 0.4 of the max depth', () => {
    expect(pitDepthOf({ kind: 'quake', depth: 0.4 })).toBeCloseTo(2.4)
    expect(pitDepthOf({ kind: 'quake', depth: 1.7 })).toBe(QUAKE.maxDepth)
    expect(pitDepthOf({ kind: 'quake', depth: -1 })).toBe(0)
  })

  it('the ground shakes once, briefly: a single envelope, zero afterwards (no flash at all)', () => {
    let humps = 0
    let prev = 0
    let rising = false
    for (let t = 0; t <= QUAKE_END + 1; t += 0.005) {
      const e = shakeLevel(t)
      expect(e).toBeGreaterThanOrEqual(0)
      expect(e).toBeLessThanOrEqual(1)
      if (e > prev) rising = true
      if (e < prev && rising) {
        humps += 1
        rising = false
      }
      prev = e
    }
    expect(humps).toBe(1)
    expect(shakeLevel(QUAKE.delay + QUAKE.shake + 0.01)).toBe(0)
    expect(QUAKE.shake).toBeLessThanOrEqual(1.2)
  })

  it('the crack opens and the pit deepens monotonically; one ripple ring only', () => {
    let open = 0
    let depth = 0
    let ripples = 0
    let had = false
    for (let t = 0; t <= QUAKE_END + 0.5; t += 0.01) {
      const s = quakeAt(spec, t)
      expect(s.open).toBeGreaterThanOrEqual(open)
      expect(s.depth).toBeGreaterThanOrEqual(depth)
      open = s.open
      depth = s.depth
      if (s.ripple !== null && !had) ripples += 1
      had = s.ripple !== null
    }
    expect(ripples).toBe(1)
  })

  it('timeline registry: runs once, does not linger, leaves an aftermath', () => {
    expect(eventDuration(spec)).toBe(QUAKE_END)
    expect(eventLingers(spec)).toBe(false)
    expect(eventAftermath(spec)).toBe(true)
    expect(bigNumberDelayMs(spec, false)).toBeGreaterThan(0)
    expect(bigNumberDelayMs(spec, true)).toBe(0)
  })
})

describe('quake geometry', () => {
  it('the pit outline is a simple star-shaped ring around the centre, wider than deep-front-to-back', () => {
    const pts = pitOutline(8, QUAKE_DETAIL.high.points)
    expect(pts).toHaveLength(QUAKE_DETAIL.high.points)
    let prevA = -Infinity
    for (const [x, z] of pts) {
      const a = Math.atan2(z, x)
      expect(a).toBeGreaterThan(prevA)
      prevA = a
      expect(Math.hypot(x, z)).toBeGreaterThan(0.5)
    }
    const xs = pts.map((p) => Math.abs(p[0]))
    const zs = pts.map((p) => Math.abs(p[1]))
    expect(Math.max(...xs)).toBeGreaterThan(Math.max(...zs))
    expect(Math.max(...xs)).toBeLessThanOrEqual(4 * 1.15)
  })

  it('low quality is simpler', () => {
    expect(QUAKE_DETAIL.low.points).toBeLessThan(QUAKE_DETAIL.high.points)
    expect(QUAKE_DETAIL.low.slabs).toBeLessThan(QUAKE_DETAIL.high.slabs)
    expect(crackLines(pitOutline(8, 9), QUAKE_DETAIL.low.cracks)).toHaveLength(QUAKE_DETAIL.low.cracks)
  })

  it('cracks start on the rim and run outwards', () => {
    const pts = pitOutline(8, 14)
    for (const c of crackLines(pts, 8)) {
      expect(Math.hypot(c.xm, c.zm)).toBeGreaterThan(Math.hypot(c.x0, c.z0))
      expect(Math.hypot(c.x1, c.z1)).toBeGreaterThan(Math.hypot(c.xm, c.zm))
    }
  })
})
