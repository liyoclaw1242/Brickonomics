import { describe, it, expect } from 'vitest'
import { finite, inRange, nonNegInt, rate, returnRate } from './guard'

describe('guard', () => {
  it('finite rejects NaN and Infinity, naming the parameter', () => {
    expect(finite('x', 1)).toBe(1)
    expect(() => finite('x', NaN)).toThrow(RangeError)
    expect(() => finite('foo', Infinity)).toThrow(/foo/)
  })
  it('inRange is inclusive', () => {
    expect(inRange('x', 0, 0, 1)).toBe(0)
    expect(inRange('x', 1, 0, 1)).toBe(1)
    expect(() => inRange('x', 1.1, 0, 1)).toThrow(/x/)
    expect(() => inRange('x', -1, 0)).toThrow(RangeError)
  })
  it('nonNegInt', () => {
    expect(nonNegInt('n', 0)).toBe(0)
    expect(() => nonNegInt('n', 1.5)).toThrow(/n/)
    expect(() => nonNegInt('n', -1)).toThrow(RangeError)
  })
  it('rate is [0, 1) and returnRate is > -1', () => {
    expect(rate('r', 0.99)).toBe(0.99)
    expect(() => rate('r', 1)).toThrow(RangeError)
    expect(() => rate('r', -0.01)).toThrow(RangeError)
    expect(returnRate('g', -0.99)).toBe(-0.99)
    expect(() => returnRate('g', -1)).toThrow(/g/)
    expect(returnRate('g', 5)).toBe(5)
  })
})
