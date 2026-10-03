import { describe, it, expect } from 'vitest'
import { PressTracker, MOVE_TOLERANCE_PX } from './press'

describe('PressTracker', () => {
  it('can fire after a still press', () => {
    const p = new PressTracker()
    p.start(10, 10)
    p.move(12, 13)
    expect(p.canFire()).toBe(true)
  })

  it('cancels when the finger moves too far or lifts', () => {
    const p = new PressTracker()
    p.start(0, 0)
    p.move(MOVE_TOLERANCE_PX + 1, 0)
    expect(p.canFire()).toBe(false)
    p.start(0, 0)
    p.end()
    expect(p.canFire()).toBe(false)
  })
})
