import { describe, expect, it } from 'vitest'
import { realReturn } from './inflation'

describe('realReturn', () => {
  it('= (1 + nominal) ÷ (1 + inflation) − 1, close to nominal − inflation', () => {
    expect(realReturn(0.05, 0.03)).toBeCloseTo(1.05 / 1.03 - 1, 12) // 0.019417
    expect(realReturn(0.05, 0.03)).toBeCloseTo(0.05 - 0.03, 2)
    expect(realReturn(0.03, 0)).toBeCloseTo(0.03, 12)
  })
  it('inflation above the interest makes it negative', () => {
    expect(realReturn(0.02, 0.03)).toBeLessThan(0)
  })
  it('rejects bad inputs, naming the parameter', () => {
    expect(() => realReturn(NaN, 0.02)).toThrow(/nominal/)
    expect(() => realReturn(0.05, -1)).toThrow(/inflation/)
  })
})
