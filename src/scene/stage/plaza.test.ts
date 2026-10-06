import { describe, it, expect } from 'vitest'
import { bondSub, cityNamesOnPlaza, showPedestal } from './plaza'
import { T } from '../../ui/strings'

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
    // 實戰課的體檢塔站在交易所台座上（沒有 sandbox 籃子）
    expect(showPedestal('tour', null, 'checkup')).toBe(true)
    expect(showPedestal('tour', null, 'navPayout')).toBe(false)
  })
})

describe('bondSub (r5: b-1 named three bonds without saying who borrows)', () => {
  it('says who you lend to on b-1 and b-3, and keeps the ranks on b-2', () => {
    expect(bondSub('gov', false)).toBe('借給政府')
    expect(bondSub('hy', false)).toBe('借給體質弱的公司')
    expect(bondSub('corp', false)).toMatch(/^借給/)
    expect(bondSub('stock', false)).toBeUndefined()
    expect(bondSub('gov', true)).toBe(T.stage.bondRanks.gov)
  })
})
