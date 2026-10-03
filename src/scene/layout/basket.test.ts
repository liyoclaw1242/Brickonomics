import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { QUALITY } from '../quality'
import { basketSpec, basketVoxels } from './basket'

describe('basket layout', () => {
  it('picks the ETF cube or the fund tower spec by product type and quality', () => {
    expect(basketSpec(universe, '0050', 'high')).toBe(QUALITY.high.etf)
    expect(basketSpec(universe, 'JH_BALANCED', 'low')).toBe(QUALITY.low.fund)
  })

  it('stacks voxels strictly by weight', () => {
    const v = basketVoxels(universe, '0050', QUALITY.high.etf)
    expect(v).toHaveLength(1000)
    expect(v.filter((x) => x.id === '2330')).toHaveLength(573)
  })

  it('throws for non-baskets', () => {
    expect(() => basketVoxels(universe, '2330', QUALITY.high.etf)).toThrow('not a basket: 2330')
  })
})
