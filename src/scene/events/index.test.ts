import { describe, expect, it } from 'vitest'
import { EVENTS, EVENT_KINDS, bigNumberDelayMs, eventDuration, eventLingers } from './index'
import { IMPACT_TIME, STRIKE_END, isStrike, strikeAt } from './lightning'
import { HIT_TIME, STORM_DONE, STRESSED, slotState, tornadoHitAt, tornadoSlotAt } from './tornado'

describe('event registry', () => {
  it('has a timeline for every kind', () => {
    expect([...EVENT_KINDS].sort()).toEqual(['lightning', 'tornado'])
    for (const k of EVENT_KINDS) expect(EVENTS[k]).toBeDefined()
  })

  it('tornado runs until the last block settles, then keeps spinning beside the plaza', () => {
    expect(eventDuration({ kind: 'tornado' })).toBe(STORM_DONE)
    expect(eventLingers({ kind: 'tornado' })).toBe(true)
  })

  it('lightning: gather is static (cloud only), strike runs once and stops', () => {
    expect(eventDuration({ kind: 'lightning', phase: 'gather' })).toBe(0)
    expect(eventDuration({ kind: 'lightning', phase: 'strike' })).toBe(STRIKE_END)
    expect(eventLingers({ kind: 'lightning', phase: 'strike' })).toBe(false)
  })
})

describe('stage reads the event clock through pure functions', () => {
  it('tornado: nothing hit before the clock starts; each block hit after its time; all hit at the end', () => {
    expect(tornadoHitAt(null, 'stock')).toBe(false)
    expect(tornadoHitAt(HIT_TIME.gov - 0.01, 'gov')).toBe(false)
    expect(tornadoHitAt(HIT_TIME.gov, 'gov')).toBe(true)
    for (const k of ['stock', 'gov', 'corp', 'hy'] as const) {
      expect(tornadoHitAt(Infinity, k)).toBe(true)
      expect(tornadoSlotAt(Infinity, k)).toEqual(STRESSED[k])
      expect(tornadoSlotAt(null, k)).toEqual(slotState(k, -Infinity))
    }
  })

  it('lightning: only the strike phase hits, and only from the impact on', () => {
    const strike = { kind: 'lightning', phase: 'strike' } as const
    const gather = { kind: 'lightning', phase: 'gather' } as const
    expect(isStrike(strike)).toBe(true)
    expect(isStrike(gather)).toBe(false)
    expect(isStrike({ kind: 'tornado' })).toBe(false)
    expect(isStrike(undefined)).toBe(false)
    expect(strikeAt(strike, null)).toBe(false)
    expect(strikeAt(strike, IMPACT_TIME - 0.01)).toBe(false)
    expect(strikeAt(strike, IMPACT_TIME)).toBe(true)
    expect(strikeAt(strike, Infinity)).toBe(true)
    expect(strikeAt(gather, Infinity)).toBe(false)
  })
})

describe('panel big number follows the event', () => {
  it('no event, tornado, or reduced motion: no delay', () => {
    expect(bigNumberDelayMs(undefined, false)).toBe(0)
    expect(bigNumberDelayMs({ kind: 'tornado' }, false)).toBe(0)
    expect(bigNumberDelayMs({ kind: 'lightning', phase: 'strike' }, true)).toBe(0)
  })
})
