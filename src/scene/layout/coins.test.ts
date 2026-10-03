import { describe, it, expect } from 'vitest'
import { coinPositions, coinPileLayout, COIN_HEIGHT } from './coins'

const p = { from: [0, 4, 0] as [number, number, number], to: [4, 0, 0] as [number, number, number], rate: 1, fallTime: 1, arc: 2 }

describe('coinPositions', () => {
  it('stops producing coins after the limit', () => {
    const q = { ...p, rate: 2 }
    // t = 1.2, rate 2：第 0、1、2 枚的年齡 1.2、0.7、0.2 → 沒限制時 2 枚在空中
    expect(coinPositions(1.2, q)).toHaveLength(2)
    // limit 1：只有第 0 枚（年齡 1.2 ≥ 1，已落地）
    expect(coinPositions(1.2, { ...q, limit: 1 })).toHaveLength(0)
    // t = 0.9：第 0、1 枚在空中（年齡 0.9、0.4）；limit 1 只剩第 0 枚
    expect(coinPositions(0.9, q)).toHaveLength(2)
    expect(coinPositions(0.9, { ...q, limit: 1 })).toHaveLength(1)
  })

  it('spawns the first coin at the source at t = 0', () => {
    expect(coinPositions(0, p)).toEqual([[0, 4, 0]])
  })

  it('stops producing coins after the limit', () => {
    const q = { ...p, rate: 2 }
    // t = 1.2, rate 2：第 0、1、2 枚的年齡 1.2、0.7、0.2 → 沒限制時 2 枚在空中
    expect(coinPositions(1.2, q)).toHaveLength(2)
    // limit 1：只有第 0 枚（年齡 1.2 ≥ 1，已落地）
    expect(coinPositions(1.2, { ...q, limit: 1 })).toHaveLength(0)
    // t = 0.9：第 0、1 枚在空中（年齡 0.9、0.4）；limit 1 只剩第 0 枚
    expect(coinPositions(0.9, q)).toHaveLength(2)
    expect(coinPositions(0.9, { ...q, limit: 1 })).toHaveLength(1)
  })

  it('moves along a lerp plus a parabola (peak arc at the midpoint)', () => {
    const [c] = coinPositions(0.5, p)
    expect(c![0]).toBeCloseTo(2)
    expect(c![1]).toBeCloseTo(2 + 2) // lerp 2 + arc*4*0.5*0.5
  })

  it('stops producing coins after the limit', () => {
    const q = { ...p, rate: 2 }
    // t = 1.2, rate 2：第 0、1、2 枚的年齡 1.2、0.7、0.2 → 沒限制時 2 枚在空中
    expect(coinPositions(1.2, q)).toHaveLength(2)
    // limit 1：只有第 0 枚（年齡 1.2 ≥ 1，已落地）
    expect(coinPositions(1.2, { ...q, limit: 1 })).toHaveLength(0)
    // t = 0.9：第 0、1 枚在空中（年齡 0.9、0.4）；limit 1 只剩第 0 枚
    expect(coinPositions(0.9, q)).toHaveLength(2)
    expect(coinPositions(0.9, { ...q, limit: 1 })).toHaveLength(1)
  })

  it('drops coins that have landed and never exceeds rate × fallTime + 1', () => {
    expect(coinPositions(1.5, p)).toHaveLength(1) // 第 0 枚已落地，第 1 枚飛行中
    const many = coinPositions(10, { ...p, rate: 5, fallTime: 1 })
    expect(many.length).toBeLessThanOrEqual(6)
  })

  it('stops producing coins after the limit', () => {
    const q = { ...p, rate: 2 }
    // t = 1.2, rate 2：第 0、1、2 枚的年齡 1.2、0.7、0.2 → 沒限制時 2 枚在空中
    expect(coinPositions(1.2, q)).toHaveLength(2)
    // limit 1：只有第 0 枚（年齡 1.2 ≥ 1，已落地）
    expect(coinPositions(1.2, { ...q, limit: 1 })).toHaveLength(0)
    // t = 0.9：第 0、1 枚在空中（年齡 0.9、0.4）；limit 1 只剩第 0 枚
    expect(coinPositions(0.9, q)).toHaveLength(2)
    expect(coinPositions(0.9, { ...q, limit: 1 })).toHaveLength(1)
  })

  it('rejects non-positive rate or fall time', () => {
    expect(() => coinPositions(0, { ...p, rate: 0 })).toThrow(RangeError)
    expect(() => coinPositions(0, { ...p, fallTime: 0 })).toThrow(RangeError)
  })
})

describe('coinPileLayout', () => {
  it('stops producing coins after the limit', () => {
    const q = { ...p, rate: 2 }
    // t = 1.2, rate 2：第 0、1、2 枚的年齡 1.2、0.7、0.2 → 沒限制時 2 枚在空中
    expect(coinPositions(1.2, q)).toHaveLength(2)
    // limit 1：只有第 0 枚（年齡 1.2 ≥ 1，已落地）
    expect(coinPositions(1.2, { ...q, limit: 1 })).toHaveLength(0)
    // t = 0.9：第 0、1 枚在空中（年齡 0.9、0.4）；limit 1 只剩第 0 枚
    expect(coinPositions(0.9, q)).toHaveLength(2)
    expect(coinPositions(0.9, { ...q, limit: 1 })).toHaveLength(1)
  })

  it('stacks coins in columns', () => {
    const pts = coinPileLayout(12, 10, 0.8)
    expect(pts).toHaveLength(12)
    expect(pts[9]![1]).toBeCloseTo(COIN_HEIGHT / 2 + 9 * COIN_HEIGHT)
    expect(pts[10]![0]).toBeCloseTo(0.8)
    expect(pts[10]![1]).toBeCloseTo(COIN_HEIGHT / 2)
  })

  it('stops producing coins after the limit', () => {
    const q = { ...p, rate: 2 }
    // t = 1.2, rate 2：第 0、1、2 枚的年齡 1.2、0.7、0.2 → 沒限制時 2 枚在空中
    expect(coinPositions(1.2, q)).toHaveLength(2)
    // limit 1：只有第 0 枚（年齡 1.2 ≥ 1，已落地）
    expect(coinPositions(1.2, { ...q, limit: 1 })).toHaveLength(0)
    // t = 0.9：第 0、1 枚在空中（年齡 0.9、0.4）；limit 1 只剩第 0 枚
    expect(coinPositions(0.9, q)).toHaveLength(2)
    expect(coinPositions(0.9, { ...q, limit: 1 })).toHaveLength(1)
  })

  it('returns nothing for 0 and rejects negatives', () => {
    expect(coinPileLayout(0)).toEqual([])
    expect(() => coinPileLayout(-1)).toThrow(RangeError)
  })
})
