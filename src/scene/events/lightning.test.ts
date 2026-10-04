import { describe, expect, it } from 'vitest'
import {
  BOLT_FORK,
  BOLT_ORIGIN,
  IMPACT_TIME,
  LIGHTNING,
  STRIKE_END,
  boltBranches,
  boltGlow,
  boltReveal,
  boltSegments,
  branchWaypoints,
  etfHitPoint,
  flashLevel,
  isStruck,
  jagged,
  stockBlocksAfter,
  strikeTarget,
  tsmcExposure,
  visibleSegments,
} from './lightning'
import { bigNumberDelayMs } from './index'

describe('who gets hit', () => {
  it('only TSMC holders: stock and 0050 get a branch, SPY gets none', () => {
    const targets = boltBranches('high').map((b) => b.target).filter((t) => t !== null)
    expect(targets.sort()).toEqual(['0050', 'stock'])
    expect(strikeTarget('SPY')).toBeNull()
    expect(tsmcExposure('SPY')).toBe(0)
  })

  it('more TSMC → thicker branch (stock 1, 0050 ≈ 0.563)', () => {
    const w = Object.fromEntries(boltBranches('high').filter((b) => b.target).map((b) => [b.target, b.width]))
    expect(w.stock).toBe(1)
    // 0050 跌 16.893% ÷ 30% = 0.5631（＝台積電權重 56.31%）
    expect(w['0050']).toBeCloseTo(0.5631, 3)
    expect(w.stock).toBeGreaterThan(w['0050']!)
  })

  it('stock branch lands on the top of the column that remains (28 blocks / 4 per layer = 7)', () => {
    expect(stockBlocksAfter).toBe(28)
    expect(strikeTarget('stock')).toEqual([-14, 7, 0])
  })

  it('0050 branch lands on the front face of the red (lost) TSMC blocks', () => {
    const [x, y, z] = etfHitPoint()
    expect(Math.abs(x)).toBeLessThan(3.5)
    expect(y).toBeGreaterThan(0)
    expect(y).toBeLessThan(7)
    expect(z).toBeGreaterThan(3.5)
  })
})

describe('bolt geometry', () => {
  it('jagged paths keep their exact endpoints', () => {
    const p = jagged([0, 10, 0], [5, 0, 2], 8, 1, 1)
    expect(p).toHaveLength(9)
    expect(p[0]).toEqual([0, 10, 0])
    expect(p[8]).toEqual([5, 0, 2])
  })

  it('branches connect: trunk from the cloud to the fork, each branch from the fork to its target', () => {
    const [trunk, ...rest] = boltBranches('high')
    expect(trunk!.points[0]).toEqual(BOLT_ORIGIN)
    expect(trunk!.points.at(-1)).toEqual(BOLT_FORK)
    for (const b of rest.filter((r) => r.target)) {
      expect(b.points[0]).toEqual(BOLT_FORK)
      expect(b.points.at(-1)).toEqual(strikeTarget(b.target!))
    }
  })

  it('low quality is simpler (fewer segments, no twigs)', () => {
    expect(boltSegments('low').length).toBeLessThan(boltSegments('high').length)
    expect(boltBranches('low')).toHaveLength(3)
  })

  it('reveals the trunk first, everything at reveal 1, nothing at 0', () => {
    const segs = boltSegments('high')
    expect(visibleSegments(segs, 0)).toBe(0)
    expect(visibleSegments(segs, 1)).toBe(segs.length)
    const early = visibleSegments(segs, 0.3)
    expect(early).toBeGreaterThan(0)
    expect(segs.slice(0, early).every((s) => s.a[1] >= BOLT_FORK[1] - 1e-9)).toBe(true)
  })
})

describe('timing: exactly one strike', () => {
  it('nothing happens before the delay; damage appears at impact', () => {
    expect(boltReveal(LIGHTNING.delay - 0.01)).toBe(0)
    expect(boltGlow(LIGHTNING.delay - 0.01)).toBe(0)
    expect(isStruck(IMPACT_TIME - 0.001)).toBe(false)
    expect(isStruck(IMPACT_TIME)).toBe(true)
    expect(boltReveal(IMPACT_TIME)).toBe(1)
  })

  it('the full-scene flash is a single pulse (one peak, then zero for good)', () => {
    let peaks = 0
    let prev = 0
    let rising = false
    for (let t = 0; t <= STRIKE_END + 2; t += 0.005) {
      const f = flashLevel(t)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
      if (f > prev) rising = true
      if (f < prev && rising) {
        peaks += 1
        rising = false
      }
      prev = f
    }
    expect(peaks).toBe(1)
    expect(flashLevel(STRIKE_END)).toBe(0)
  })

  it('the bolt glow only goes up once and is gone at the end (end = the static active state)', () => {
    let wentDown = false
    let prev = 0
    for (let t = 0; t <= STRIKE_END + 1; t += 0.01) {
      const g = boltGlow(t)
      if (g < prev) wentDown = true
      if (wentDown) expect(g).toBeLessThanOrEqual(prev)
      prev = g
    }
    expect(boltGlow(STRIKE_END)).toBe(0)
    expect(boltGlow(Infinity)).toBe(0)
    expect(isStruck(Infinity)).toBe(true)
    expect(isStruck(-Infinity)).toBe(false)
  })
})

describe('panel big number waits for the strike', () => {
  it('delays the count-up to the impact on the strike step only', () => {
    expect(bigNumberDelayMs({ kind: 'lightning', phase: 'strike' }, false)).toBe(IMPACT_TIME * 1000)
    expect(bigNumberDelayMs({ kind: 'lightning', phase: 'gather' }, false)).toBe(0)
    expect(bigNumberDelayMs({ kind: 'tornado' }, false)).toBe(0)
    expect(bigNumberDelayMs(undefined, false)).toBe(0)
    // 減少動態：閃電是靜止的終點，數字也直接顯示
    expect(bigNumberDelayMs({ kind: 'lightning', phase: 'strike' }, true)).toBe(0)
  })
})

describe('bolt comes down from above', () => {
  it('trunk is near-vertical and forks low, below the cloud and above the targets', () => {
    const dx = Math.abs(BOLT_FORK[0] - BOLT_ORIGIN[0])
    const dy = BOLT_ORIGIN[1] - BOLT_FORK[1]
    expect(dy).toBeGreaterThan(4 * dx)
    expect(BOLT_FORK[1]).toBeGreaterThan(strikeTarget('stock')![1])
  })
  it('every branch only goes down (never climbs back up)', () => {
    for (const b of boltBranches('high').filter((x) => x.target)) {
      const way = branchWaypoints(b.target!)!
      for (let i = 1; i < way.length; i++) expect(way[i]![1]).toBeLessThan(way[i - 1]![1])
    }
  })
})
