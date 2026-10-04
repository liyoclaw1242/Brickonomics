import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { displayName } from './names'

describe('displayName', () => {
  it('pairs product codes with a plain nickname on 3D labels', () => {
    expect(displayName(universe, '0050')).toBe('0050（台灣50大）')
    expect(displayName(universe, 'QQQ')).toBe('QQQ（美國科技100）')
    expect(displayName(universe, 'SPY')).toBe('SPY（美國500大）')
  })

  it('shows a name he knows for companies whose data name is unfamiliar (r2: Alphabet → Google)', () => {
    expect(displayName(universe, 'GOOGL')).toBe('Google')
    expect(universe.get('GOOGL')!.name).toBe('Alphabet') // 資料名稱不動
  })

  it('falls back to the data name, then the id', () => {
    expect(displayName(universe, '2330')).toBe('台積電')
    expect(displayName(universe, 'NOPE')).toBe('NOPE')
  })
})
