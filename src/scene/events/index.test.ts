import { describe, expect, it } from 'vitest'
import { EVENTS, EVENT_KINDS, bigNumberDelayMs, eventAftermath, eventDuration, eventLingers, type EventSpec } from './index'
import { IMPACT_TIME, STRIKE_END, isStrike, strikeAt } from './lightning'
import { HIT_TIME, STORM_DONE, STRESSED, slotState, tornadoHitAt, tornadoSlotAt } from './tornado'

describe('event registry', () => {
  it('has a timeline for every kind', () => {
    expect([...EVENT_KINDS].sort()).toEqual(['lightning', 'quake', 'tornado'])
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

describe('kind-neutral aftermath (readout, text fallback, city)', () => {
  it('shows the result only once the event has done its damage', () => {
    expect(eventAftermath(undefined)).toBe(false)
    expect(eventAftermath({ kind: 'lightning', phase: 'gather' })).toBe(false)
    expect(eventAftermath({ kind: 'lightning', phase: 'strike' })).toBe(true)
    expect(eventAftermath({ kind: 'tornado' })).toBe(true)
  })

  it('the registry stays light: timelines load no data, baskets or voxels', () => {
    const sources = import.meta.glob(['./index.ts', './lightning.ts', './tornado.ts', './types.ts', './ease.ts', './quake.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    })
    expect(Object.keys(sources)).toHaveLength(6)
    for (const [f, raw] of Object.entries(sources)) {
      const src = String(raw)
      const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
      for (const i of imports) expect(i, `${f} imports ${i}`).toMatch(/^\.\/(lightning|tornado|types|ease|quake)$|^\.\.\/quality$/)
    }
  })
})

describe('EventSpec is checked per kind', () => {
  it('rejects params that belong to another kind', () => {
    // @ts-expect-error tornado has no phase
    const a: EventSpec = { kind: 'tornado', phase: 'strike' }
    // @ts-expect-error lightning needs a phase
    const b: EventSpec = { kind: 'lightning' }
    expect([a.kind, b.kind]).toEqual(['tornado', 'lightning'])
  })
})
