import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { THEMES } from '../theme'
import { CITY_FADE, fadedColor, groupTone, toneColor, toneProgress } from './tone'

const base = { focus: [] as number[], picked: null, explode: 0 }

describe('groupTone', () => {
  it('is muted by default and vivid when exploded', () => {
    expect(groupTone({ ...base, group: 0 })).toBe('muted')
    expect(groupTone({ ...base, group: 0, explode: 0.5 })).toBe('vivid')
  })
  it('highlights the picked group over focus', () => {
    expect(groupTone({ ...base, group: 1, picked: 1, focus: [0] })).toBe('vivid')
    expect(groupTone({ ...base, group: 0, picked: 1, focus: [0] })).toBe('muted')
  })
  it('highlights focus groups when nothing is picked', () => {
    expect(groupTone({ ...base, group: 2, focus: [2] })).toBe('vivid')
    expect(groupTone({ ...base, group: 3, focus: [2] })).toBe('muted')
  })
  it('keeps focus over explode: only focus groups are vivid when exploded', () => {
    expect(groupTone({ ...base, group: 2, focus: [2], explode: 0.5 })).toBe('vivid')
    expect(groupTone({ ...base, group: 3, focus: [2], explode: 0.5 })).toBe('muted')
  })
  it('is vivid while sliced, so the cut face shows the real layer colours (e-2 laser)', () => {
    expect(groupTone({ ...base, group: 0, cut: true })).toBe('vivid')
    expect(groupTone({ ...base, group: 0, cut: false })).toBe('muted')
    expect(groupTone({ ...base, group: 3, focus: [2], cut: true })).toBe('muted') // 焦點仍優先
  })
  it('keeps picked over explode', () => {
    expect(groupTone({ ...base, group: 1, picked: 1, explode: 0.5 })).toBe('vivid')
    expect(groupTone({ ...base, group: 0, picked: 1, explode: 0.5 })).toBe('muted')
  })
})

describe('toneColor', () => {
  it('lowers saturation for muted', () => {
    const hsl = { h: 0, s: 0, l: 0 }
    const before = new Color('#4f7cff').getHSL({ ...hsl }).s
    const after = new Color(toneColor('#4f7cff', 'muted', THEMES.dusk)).getHSL({ ...hsl }).s
    expect(after).toBeLessThan(before)
  })
  it('keeps vivid colours unchanged on day (boost 1)', () => {
    expect(toneColor('#4f7cff', 'vivid', THEMES.day)).toBe('#4f7cff')
  })
})

describe('toneProgress', () => {
  it('eases from 0 to 1', () => {
    expect(toneProgress(0)).toBe(0)
    expect(toneProgress(0.2)).toBe(0.5)
    expect(toneProgress(1)).toBe(1)
  })
})

describe('fadedColor (background city on teaching steps, mid-r1)', () => {
  it('is closer to the background (sea) than the muted colour, in both themes', () => {
    const dist = (a: string, b: string) => {
      const x = new Color(a)
      const y = new Color(b)
      return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b)
    }
    for (const th of Object.values(THEMES)) {
      for (const hex of ['#4f7cff', '#ff8a3d', '#2bb3a3']) {
        const muted = toneColor(hex, 'muted', th)
        const faded = fadedColor(hex, th)
        expect(dist(faded, th.sea)).toBeLessThan(dist(muted, th.sea))
        expect(dist(faded, th.sea)).toBeCloseTo(dist(muted, th.sea) * (1 - CITY_FADE), 1)
      }
    }
  })
})
