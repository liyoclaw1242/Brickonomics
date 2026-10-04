import { describe, it, expect } from 'vitest'
import { THEMES } from './theme'

describe('THEMES', () => {
  it('defines the same keys for dusk and day', () => {
    expect(Object.keys(THEMES.dusk).sort()).toEqual(Object.keys(THEMES.day).sort())
  })
  it('makes dusk darker than day', () => {
    expect(THEMES.dusk.sky).not.toBe(THEMES.day.sky)
    expect(THEMES.dusk.key.intensity).toBeGreaterThan(0)
  })
})
