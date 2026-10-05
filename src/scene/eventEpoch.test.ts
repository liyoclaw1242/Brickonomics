import { describe, expect, it } from 'vitest'
import { clockMode, eventEpoch } from './eventEpoch'
import { activeEvent, controlRange, DEFAULT_VALUES } from '../tour/engine'
import { STEP_POOL } from '../tour/courses'
import type { Step, TourValues } from '../tour/types'

const V = (patch: Partial<TourValues> = {}): TourValues => ({ ...DEFAULT_VALUES, slice: 0, explode: 0, ...patch })

describe('event clock restarts only when the event itself changes (Task 1 review)', () => {
  const step: Pick<Step, 'scene'> = {
    scene: { camera: 'plaza', event: { kind: 'quake', depth: 0.4 }, eventWhen: { control: 'phase', min: 0.5 } },
  }

  it('eventWhen switches the whole event on and off; the spec is the same object once on', () => {
    expect(activeEvent(step, V({ phase: 0.49 }))).toBeUndefined()
    const on = activeEvent(step, V({ phase: 0.5 }))
    expect(on).toBe(step.scene.event)
    expect(activeEvent(step, V({ phase: 1 }))).toBe(on)
    // 沒有 eventWhen：一直有
    expect(activeEvent({ scene: { camera: 'plaza', event: { kind: 'tornado' } } }, V())).toEqual({ kind: 'tornado' })
  })

  it('a level (slider) change after the gate keeps the same epoch, so the shake or gust does not replay', () => {
    const at = (phase: number) => eventEpoch('x', activeEvent(step, V({ phase })), false, true)
    expect(at(0.6)).toBe(at(0.5))
    expect(at(1)).toBe(at(0.5))
    expect(at(0.2)).not.toBe(at(0.5)) // 拉回谷底之前＝沒有事件（坑收起來）
  })

  it('a different level in the spec itself would restart it (why params must stay fixed per step)', () => {
    expect(eventEpoch('x', { kind: 'quake', depth: 0.4 }, false, true)).not.toBe(eventEpoch('x', { kind: 'quake', depth: 0.5 }, false, true))
  })

  it('every step in the pool: the active spec never depends on the slider beyond on/off', () => {
    for (const s of STEP_POOL.values()) {
      const w = s.scene.eventWhen
      if (!w) continue
      expect(s.scene.event, s.id).toBeDefined()
      expect(s.controls ?? [], s.id).toContain(w.control)
      const [lo, hi] = controlRange(s, w.control)
      const epochs = new Set<string>()
      for (let i = 0; i <= 20; i++) {
        const x = lo + ((hi - lo) * i) / 20
        if (x < w.min) continue
        epochs.add(eventEpoch(s.id, activeEvent(s, V({ ...s.scene.values, [w.control]: x })), false, true))
      }
      expect(epochs.size, s.id).toBe(1)
    }
  })
})

describe('gate-triggered events start right away (Tasks 2–4 review)', () => {
  const quake = { kind: 'quake', depth: 0.4 } as const

  it('the camera wait (revealInstant) depends on the step having an event, not on the gate being crossed', () => {
    const before = clockMode(quake, undefined, false)
    const after = clockMode(quake, quake, false)
    expect(before.revealInstant).toBe(false)
    expect(after.revealInstant).toBe(before.revealInstant) // 過門檻不會重新等鏡頭
    expect(before.instant).toBe(true) // 門檻之前：沒有事件
    expect(after.instant).toBe(false) // 門檻之後：事件要跑
    // 沒有事件的步驟、減少動態、靜態事件：照舊直接到終點
    expect(clockMode(undefined, undefined, false)).toEqual({ revealInstant: true, instant: true })
    expect(clockMode(quake, quake, true)).toEqual({ revealInstant: true, instant: true })
    expect(clockMode({ kind: 'lightning', phase: 'gather' }, { kind: 'lightning', phase: 'gather' }, false)).toEqual({ revealInstant: true, instant: true })
  })

  it('every eventWhen step in the pool keeps the same revealInstant on both sides of the gate', () => {
    for (const s of STEP_POOL.values()) {
      if (!s.scene.eventWhen) continue
      const { control, min } = s.scene.eventWhen
      const [lo] = controlRange(s, control)
      const off = activeEvent(s, V({ ...s.scene.values, [control]: lo }))
      const on = activeEvent(s, V({ ...s.scene.values, [control]: min }))
      expect(off, s.id).toBeUndefined()
      expect(on, s.id).toBeDefined()
      expect(clockMode(s.scene.event, off, false).revealInstant, s.id).toBe(clockMode(s.scene.event, on, false).revealInstant)
    }
  })

  it('revealed toggling (camera settles) changes the epoch: the event restarts once the camera stops, not before', () => {
    expect(eventEpoch('x', quake, false, false)).not.toBe(eventEpoch('x', quake, false, true))
    // 過門檻的那一刻 revealed 已經是 true：epoch 只因為 spec 出現而變一次
    expect(eventEpoch('x', undefined, true, true)).not.toBe(eventEpoch('x', quake, false, true))
  })
})
