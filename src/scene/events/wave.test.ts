import { describe, expect, it } from 'vitest'
import { choppyPath, leveragedPath } from '../../sim/leverage'
import { bigNumberDelayMs, eventAftermath, eventDuration, eventLingers } from './index'
import type { SpecOf } from './types'
import {
  WAVE,
  WAVE_DETAIL,
  crestTime,
  heightOnPath,
  stepTime,
  surfaceY,
  swellAt,
  troughTime,
  waveAt,
  waveCount,
  waveEnd,
  waveFinal,
  waveStepAt,
} from './wave'

const spec: SpecOf<'wave'> = { kind: 'wave', waves: 5 }

describe('wave timeline', () => {
  it('end = the final state: calm water at rest level, every step taken (2 per wave)', () => {
    expect(waveAt(spec, Infinity)).toEqual(waveFinal())
    expect(waveAt(spec, waveEnd(spec))).toEqual(waveFinal())
    expect(waveFinal()).toEqual({ level: WAVE.rest, swell: 0, ripple: 0, phase: 0, spray: null })
    expect(waveStepAt(spec, Infinity)).toBe(10)
    expect(waveStepAt(spec, waveEnd(spec))).toBeCloseTo(10, 12)
  })

  it('before the clock starts: no water, step 0', () => {
    expect(waveAt(spec, null)).toEqual({ level: 0, swell: 0, ripple: 0, phase: 0, spray: null })
    expect(waveStepAt(spec, null)).toBe(0)
    expect(waveStepAt(spec, 0)).toBe(0)
  })

  it('the water rises and falls exactly `waves` times (one hump per wave), and never flashes', () => {
    for (const n of [1, 3, 5]) {
      const s: SpecOf<'wave'> = { kind: 'wave', waves: n }
      let humps = 0
      let prev = 0
      let rising = false
      for (let t = 0; t <= waveEnd(s) + 1; t += 0.004) {
        const e = swellAt(s, t)
        expect(e).toBeGreaterThanOrEqual(0)
        expect(e).toBeLessThanOrEqual(1)
        if (e > prev) rising = true
        if (e < prev && rising) {
          humps += 1
          rising = false
        }
        prev = e
      }
      expect(humps).toBe(n)
    }
  })

  it('crest = the wave hits (down step), trough = it falls back (up step); steps alternate and only increase', () => {
    expect(stepTime(0)).toBe(crestTime(0))
    expect(stepTime(1)).toBe(troughTime(0))
    expect(stepTime(2)).toBe(crestTime(1))
    expect(swellAt(spec, crestTime(2))).toBeCloseTo(1, 12)
    expect(swellAt(spec, troughTime(2))).toBeCloseTo(0, 12)
    let prev = 0
    for (let t = 0; t <= waveEnd(spec) + 0.5; t += 0.01) {
      const s = waveStepAt(spec, t)
      expect(s).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = s
    }
    // 第一道浪打到之後 settle 秒：走完第 1 步；退下之後 settle 秒：走完第 2 步
    expect(waveStepAt(spec, crestTime(0) + WAVE.settle)).toBeCloseTo(1, 12)
    expect(waveStepAt(spec, troughTime(0) + WAVE.settle)).toBeCloseTo(2, 12)
  })

  it('spray only right after each crest; one spray per wave', () => {
    let sprays = 0
    let had = false
    for (let t = 0; t <= waveEnd(spec) + 0.5; t += 0.01) {
      const s = waveAt(spec, t)
      if (s.spray !== null && !had) sprays += 1
      had = s.spray !== null
    }
    expect(sprays).toBe(5)
  })

  it('waves are clamped to 0..maxWaves; zero waves = no aftermath', () => {
    expect(waveCount({ kind: 'wave', waves: 99 })).toBe(WAVE.maxWaves)
    expect(waveCount({ kind: 'wave', waves: -2 })).toBe(0)
    expect(waveCount({ kind: 'wave', waves: 2.6 })).toBe(3)
    expect(eventAftermath({ kind: 'wave', waves: 0 })).toBe(false)
  })

  it('timeline registry: runs once, does not linger, leaves an aftermath, number waits for the first hit', () => {
    expect(eventDuration(spec)).toBe(waveEnd(spec))
    expect(waveEnd(spec)).toBeCloseTo(WAVE.delay + 5 * WAVE.period + WAVE.settle, 12)
    expect(eventLingers(spec)).toBe(false)
    expect(eventAftermath(spec)).toBe(true)
    expect(bigNumberDelayMs(spec, false)).toBeCloseTo(crestTime(0) * 1000, 9)
    expect(bigNumberDelayMs(spec, true)).toBe(0)
  })
})

describe('stage mapping: heights along a leveraged path', () => {
  it('heightOnPath interpolates between steps and clamps at both ends', () => {
    const p = [10, 20, 5]
    expect(heightOnPath(p, 0)).toBe(10)
    expect(heightOnPath(p, 0.5)).toBe(15)
    expect(heightOnPath(p, 1.5)).toBe(12.5)
    expect(heightOnPath(p, 2)).toBe(5)
    expect(heightOnPath(p, 9)).toBe(5)
    expect(heightOnPath(p, -1)).toBe(10)
    expect(heightOnPath([], 1)).toBe(0)
  })

  it('5 waves on −10% / +10%: the hit knocks the 2× tower down (100 → 80 = 100 × (1 − 2 × 0.1)), the recede lifts it to 80 × 1.2 = 96; it ends at 100 × 0.96^5 = 81.54', () => {
    const towers = leveragedPath(choppyPath(100, 0.1, 5), 2)
    expect(heightOnPath(towers, waveStepAt(spec, Infinity))).toBeCloseTo(81.537, 3)
    expect(heightOnPath(towers, waveStepAt(spec, crestTime(0) + WAVE.settle))).toBeCloseTo(80, 9)
    expect(heightOnPath(towers, waveStepAt(spec, troughTime(0) + WAVE.settle))).toBeCloseTo(96, 9)
  })
})

describe('every hit knocks the 2× tower down (槓桿塔每次被打矮一截)', () => {
  it('for each wave k: height just after the crest < height just before it', () => {
    const towers = leveragedPath(choppyPath(100, 0.1, 5), 2)
    for (let k = 0; k < 5; k++) {
      const before = heightOnPath(towers, waveStepAt(spec, crestTime(k) - 0.01))
      const after = heightOnPath(towers, waveStepAt(spec, crestTime(k) + WAVE.settle))
      expect(after).toBeLessThan(before)
      expect(after / before).toBeCloseTo(0.8, 9) // 2 × (−10%) = −20%
    }
  })
})

describe('no snap at the end', () => {
  it('the ripple fades to 0 just before the end, so the surface just before = the flat final surface', () => {
    const end = waveEnd(spec)
    const before = waveAt(spec, end - 1e-6)
    expect(before.ripple).toBeLessThan(1e-6)
    expect(before.level).toBeCloseTo(waveFinal().level, 9)
    for (const x of [-9, -3, 0, 4, 8]) expect(surfaceY(before, x, 1)).toBeCloseTo(surfaceY(waveFinal(), x, 1), 5)
    // 小起伏在 end − 0.8 之前還在
    expect(waveAt(spec, end - 1).ripple).toBeGreaterThan(0.04)
  })
})

describe('wave surface and detail', () => {
  it('the surface sits around the level, within ± ripple', () => {
    const s = waveAt(spec, crestTime(1))
    for (let x = -13; x <= 13; x += 1.3) {
      const y = surfaceY(s, x, 2)
      expect(y).toBeGreaterThanOrEqual(s.level - s.ripple - 1e-12)
      expect(y).toBeLessThanOrEqual(s.level + s.ripple + 1e-12)
    }
    expect(s.level).toBeGreaterThan(WAVE.rest + WAVE.lift * 0.99)
  })

  it('low quality uses fewer segments, foam and spray', () => {
    expect(WAVE_DETAIL.low.segX).toBeLessThan(WAVE_DETAIL.high.segX)
    expect(WAVE_DETAIL.low.segZ).toBeLessThan(WAVE_DETAIL.high.segZ)
    expect(WAVE_DETAIL.low.foam).toBeLessThan(WAVE_DETAIL.high.foam)
    expect(WAVE_DETAIL.low.spray).toBeLessThan(WAVE_DETAIL.high.spray)
  })
})

describe('fix round: numberAtEnd (a-lev: the card waits until the waves end)', () => {
  it('numberDelay is the first crest by default and the end of the last wave with numberAtEnd', async () => {
    const { WAVE_TIMELINE, crestTime, waveEnd } = await import('./wave')
    expect(WAVE_TIMELINE.numberDelay({ kind: 'wave', waves: 5 })).toBe(crestTime(0))
    expect(WAVE_TIMELINE.numberDelay({ kind: 'wave', waves: 5, numberAtEnd: true })).toBe(waveEnd({ kind: 'wave', waves: 5 }))
  })
})
