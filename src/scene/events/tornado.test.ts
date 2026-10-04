import { describe, expect, it } from 'vitest'
import {
  BOND_SLOT_X,
  HIT_TIME,
  STORM,
  STORM_COUNTS,
  STORM_DONE,
  STRESSED,
  funnelRadius,
  isHit,
  slotState,
  stormPos,
  timeAtX,
  type BondKey,
} from './tornado'

const KEYS: BondKey[] = ['stock', 'gov', 'corp', 'hy']

describe('storm path', () => {
  it('starts off the left of the plaza and ends at the linger spot behind-right of the high-yield bond', () => {
    expect(stormPos(0)).toEqual({ x: STORM.startX, z: 0 })
    const end = stormPos(Infinity)
    expect(end.x).toBeCloseTo(STORM.lingerX)
    expect(end.z).toBeCloseTo(STORM.lingerZ)
    // 停在高收益債右邊、後面（不擋方塊與標籤）
    expect(end.x).toBeGreaterThan(BOND_SLOT_X.hy + 3)
    expect(end.z).toBeLessThan(-4)
  })

  it('moves left to right monotonically', () => {
    let prev = -Infinity
    for (let t = 0; t <= STORM.sweep + 0.5; t += 0.05) {
      const { x } = stormPos(t)
      expect(x).toBeGreaterThanOrEqual(prev)
      prev = x
    }
  })

  it('goes straight through every block on the row (z = 0 at each slot)', () => {
    for (const k of KEYS) expect(stormPos(HIT_TIME[k]).z).toBeCloseTo(0, 5)
  })

  it('timeAtX inverts stormPos', () => {
    for (const x of [-20, -13, 0, 12.5, 15]) expect(stormPos(timeAtX(x)).x).toBeCloseTo(x, 4)
  })
})

describe('hits: one change at a time', () => {
  it('hits stock, then gov, then corp, then high-yield, with visible gaps', () => {
    expect(HIT_TIME.stock).toBeGreaterThan(1)
    expect(HIT_TIME.gov - HIT_TIME.stock).toBeGreaterThan(STORM.damage)
    expect(HIT_TIME.corp - HIT_TIME.gov).toBeGreaterThan(0.5)
    expect(HIT_TIME.hy - HIT_TIME.corp).toBeGreaterThan(0.5)
    expect(HIT_TIME.hy).toBeLessThan(STORM.sweep)
  })

  it('nothing is damaged before the tornado arrives', () => {
    for (const k of KEYS) {
      const s = slotState(k, HIT_TIME[k] - 0.01)
      expect(isHit(k, HIT_TIME[k] - 0.01)).toBe(false)
      expect(s).toEqual({ scaleY: 1, red: 0, broken: false, tilt: 0, gap: 0, sway: 0 })
    }
  })

  it('stock shrinks only after it is hit, and the high-yield bond is intact until its own hit', () => {
    const mid = HIT_TIME.stock + STORM.damage / 2
    expect(slotState('stock', mid).scaleY).toBeLessThan(1)
    expect(slotState('stock', mid).scaleY).toBeGreaterThan(STRESSED.stock.scaleY)
    expect(slotState('hy', mid).broken).toBe(false)
    expect(slotState('hy', HIT_TIME.hy).broken).toBe(true)
  })

  it('government and corporate bonds sway while hit but are never damaged', () => {
    for (const k of ['gov', 'corp'] as const) {
      let maxSway = 0
      for (let t = 0; t < STORM_DONE + 1; t += 0.02) {
        const s = slotState(k, t)
        expect(s.scaleY).toBe(1)
        expect(s.red).toBe(0)
        expect(s.broken).toBe(false)
        maxSway = Math.max(maxSway, Math.abs(s.sway))
      }
      expect(maxSway).toBeGreaterThan(0.05)
    }
  })
})

describe('end state', () => {
  it('equals the static stressed state for every block', () => {
    for (const k of KEYS) {
      expect(slotState(k, STORM_DONE)).toEqual(STRESSED[k])
      expect(slotState(k, Infinity)).toEqual(STRESSED[k])
    }
  })

  it('matches the numbers the stressed showcase always used (45% stock, cracked high-yield)', () => {
    expect(STRESSED.stock.scaleY).toBe(0.45)
    expect(STRESSED.hy.broken).toBe(true)
    expect(STRESSED.hy.tilt).toBeCloseTo(0.32)
    expect(STRESSED.hy.gap).toBeCloseTo(0.35)
  })
})

describe('funnel shape and quality', () => {
  it('narrows toward the ground', () => {
    expect(funnelRadius(0)).toBeCloseTo(STORM.baseRadius)
    expect(funnelRadius(STORM.height)).toBeCloseTo(STORM.topRadius)
    expect(funnelRadius(2)).toBeLessThan(funnelRadius(6))
  })

  it('uses fewer pieces on low quality', () => {
    expect(STORM_COUNTS.low.rings).toBeLessThan(STORM_COUNTS.high.rings)
    expect(STORM_COUNTS.low.dust).toBeLessThan(STORM_COUNTS.high.dust)
    expect(STORM_COUNTS.low.streaks).toBe(0)
  })
})
