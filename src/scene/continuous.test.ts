import { describe, it, expect } from 'vitest'
import { acquire, idleEpoch, isContinuous, shouldSample } from './continuous'

describe('continuous demand registry', () => {
  it('is continuous while any holder is active', () => {
    expect(isContinuous()).toBe(false)
    const a = acquire()
    const b = acquire()
    expect(isContinuous()).toBe(true)
    a()
    expect(isContinuous()).toBe(true)
    b()
    expect(isContinuous()).toBe(false)
  })
  it('releasing twice does not underflow', () => {
    const a = acquire()
    a()
    a()
    const b = acquire()
    expect(isContinuous()).toBe(true)
    b()
    expect(isContinuous()).toBe(false)
  })
})

describe('idleEpoch / shouldSample', () => {
  it('bumps only when the count reaches zero', () => {
    const e0 = idleEpoch()
    const a = acquire()
    const b = acquire()
    b()
    expect(idleEpoch()).toBe(e0)
    a()
    expect(idleEpoch()).toBe(e0 + 1)
  })
  it('does not sample a frame that follows a release', () => {
    const a = acquire()
    const mark = { continuous: isContinuous(), epoch: idleEpoch() }
    expect(shouldSample(mark, idleEpoch())).toBe(true)
    a() // 同一幀內被後執行的 useFrame 釋放
    expect(shouldSample(mark, idleEpoch())).toBe(false)
  })
  it('does not sample after an idle frame', () => {
    expect(shouldSample({ continuous: false, epoch: idleEpoch() }, idleEpoch())).toBe(false)
  })
})
