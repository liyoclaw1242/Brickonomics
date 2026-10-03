import { describe, it, expect } from 'vitest'
import { allocateBlocks } from './allocate'

describe('allocateBlocks', () => {
  it('uses the largest remainder method (0050-like weights, 1000 blocks)', () => {
    const r = allocateBlocks(
      [
        { id: '2330', weight: 57.35 },
        { id: '2454', weight: 5.64 },
        { id: '2308', weight: 3.47 },
        { id: '2317', weight: 2.98 },
        { id: 'OTHER', weight: 30.56 },
      ],
      1000,
    )
    expect(r).toEqual([
      { id: '2330', count: 573 },
      { id: '2454', count: 56 },
      { id: '2308', count: 35 },
      { id: '2317', count: 30 },
      { id: 'OTHER', count: 306 },
    ])
  })

  it('always sums to total even when weights do not sum to 100', () => {
    const r = allocateBlocks([{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }], 10)
    expect(r.reduce((s, x) => s + x.count, 0)).toBe(10)
    expect(r.map((x) => x.count)).toEqual([4, 3, 3])
  })

  it('returns zeros for total 0 and rejects invalid input', () => {
    expect(allocateBlocks([{ id: 'a', weight: 1 }], 0)).toEqual([{ id: 'a', count: 0 }])
    expect(() => allocateBlocks([], 10)).toThrow()
    expect(() => allocateBlocks([{ id: 'a', weight: -1 }], 10)).toThrow()
    expect(() => allocateBlocks([{ id: 'a', weight: 1 }], 2.5)).toThrow()
  })
})
