import { describe, it, expect } from 'vitest'
import { cityNamesOnPlaza } from './plaza'

describe('cityNamesOnPlaza', () => {
  it('hides city names while a plaza stage is the subject', () => {
    expect(cityNamesOnPlaza('bonds')).toBe(false)
    expect(cityNamesOnPlaza('feeRace')).toBe(false)
    expect(cityNamesOnPlaza('shock')).toBe(false)
  })
  it('keeps them off the plaza', () => {
    expect(cityNamesOnPlaza('none')).toBe(true)
    expect(cityNamesOnPlaza('underground')).toBe(true)
  })
})
