import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { THEMES } from '../theme'
import { groupTone, toneColor, toneProgress } from './tone'

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
