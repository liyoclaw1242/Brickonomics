import { describe, it, expect } from 'vitest'
import { acquire, isContinuous } from './continuous'

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
