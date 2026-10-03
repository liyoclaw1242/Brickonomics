import { describe, expect, it } from 'vitest'
import { FpsSampler } from './fps'

function feed(s: FpsSampler, dt: number, n: number): boolean[] {
  return Array.from({ length: n }, () => s.push(dt))
}

describe('FpsSampler', () => {
  it('steady 60 fps for 2 s never degrades', () => {
    const s = new FpsSampler()
    expect(feed(s, 1 / 60, 120).some(Boolean)).toBe(false)
  })
  it('steady 20 fps degrades exactly when the run reaches 1.5 s (30 frames)', () => {
    const s = new FpsSampler()
    const r = feed(s, 0.05, 30)
    expect(r.indexOf(true)).toBe(29)
    expect(r.filter(Boolean)).toHaveLength(1)
  })
  it('idle gap followed by 2 frames is not a slow run', () => {
    const s = new FpsSampler()
    expect([s.push(2.0), s.push(0.016), s.push(0.016)]).toEqual([false, false, false])
  })
  it('bursts separated by gaps never accumulate', () => {
    const s = new FpsSampler()
    let any = false
    for (let i = 0; i < 20; i++) {
      any = s.push(3.0) || any
      for (let j = 0; j < 10; j++) any = s.push(0.05) || any // 0.5 s per burst
    }
    expect(any).toBe(false)
  })
  it('ignores invalid dt', () => {
    const s = new FpsSampler()
    expect([s.push(0), s.push(-1), s.push(NaN)]).toEqual([false, false, false])
    const r = feed(s, 0.05, 30)
    expect(r.indexOf(true)).toBe(29)
  })
  it('a continuously slow device (≈6.7 fps) still degrades', () => {
    // dt 0.15 < maxGap 0.25：不是閒置空檔；10 幀 = 1.5 s、fps = 10/1.5 ≈ 6.7 < 30 → 第 10 幀觸發
    const s = new FpsSampler()
    const hits = Array.from({ length: 10 }, () => s.push(0.15))
    expect(hits.slice(0, 9).every((h) => !h)).toBe(true)
    expect(hits[9]).toBe(true)
  })
})
