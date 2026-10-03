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
  it('a paused tab (dt above the 2 s maxGap) followed by 2 frames is not a slow run', () => {
    const s = new FpsSampler()
    expect([s.push(3.0), s.push(0.016), s.push(0.016)]).toEqual([false, false, false])
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
  it('a continuously slow device (4 fps) still degrades', () => {
    // dt 0.25 < maxGap 2：不是暫停；6 幀 = 1.5 s、fps = 6 / 1.5 = 4 < 30 → 第 6 幀觸發
    const s = new FpsSampler()
    const hits = Array.from({ length: 6 }, () => s.push(0.25))
    expect(hits.slice(0, 5).every((h) => !h)).toBe(true)
    expect(hits[5]).toBe(true)
  })
  it('a 1.9 s frame is still counted (below maxGap 2)', () => {
    // 1.9 s ≥ window 1.5 → 一幀即結算，fps = 1 / 1.9 ≈ 0.53 < 30
    expect(new FpsSampler().push(1.9)).toBe(true)
  })
  it('reset() discards a partial run', () => {
    const s = new FpsSampler()
    feed(s, 0.05, 29) // 1.45 s，差一幀
    s.reset()
    expect(s.push(0.05)).toBe(false) // 若沒 reset，這一幀會結算成 true
    expect(feed(s, 0.05, 29).some(Boolean)).toBe(true) // 重新累積滿 1.5 s
  })
})
