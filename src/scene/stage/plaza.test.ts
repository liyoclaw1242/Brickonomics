import { describe, it, expect } from 'vitest'
import { cityNamesOnPlaza, showPedestal } from './plaza'

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

describe('showPedestal (r3: an empty dark board looked broken / unfinished)', () => {
  it('shows the exchange pedestal only when something stands on it, or in the sandbox', () => {
    expect(showPedestal('tour', null)).toBe(false)
    expect(showPedestal('tour', '0050')).toBe(true)
    expect(showPedestal('sandbox', null)).toBe(true)
  })
})
