import { describe, expect, it } from 'vitest'
import { eventEpoch } from './eventEpoch'
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
