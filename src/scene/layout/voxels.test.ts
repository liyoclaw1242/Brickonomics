import { describe, it, expect } from 'vitest'
import { allocateBlocks } from '../../sim/allocate'
import {
  stackVoxels, layersFor, voxelPosition, explodeOffsetY, sizeAlong,
  cutThreshold, isHidden, cutPlanePosition, approach, EXPLODE_GAP, MAX_EXPLODE_SPAN, explodeGap,
} from './voxels'

describe('stackVoxels', () => {
  it('fills the floor row by row, then stacks upward, group by group', () => {
    const v = stackVoxels([{ id: 'a', count: 3 }, { id: 'b', count: 2 }], 2, 2)
    expect(v).toEqual([
      { id: 'a', group: 0, x: 0, y: 0, z: 0 },
      { id: 'a', group: 0, x: 1, y: 0, z: 0 },
      { id: 'a', group: 0, x: 0, y: 0, z: 1 },
      { id: 'b', group: 1, x: 1, y: 0, z: 1 },
      { id: 'b', group: 1, x: 0, y: 1, z: 0 },
    ])
  })

  it('makes 0050 a 10x10x10 cube whose 2330 stratum is ~5.7 layers thick', () => {
    const counts = allocateBlocks(
      [{ id: '2330', weight: 57.35 }, { id: '2454', weight: 5.64 }, { id: '2308', weight: 3.47 }, { id: '2317', weight: 2.98 }, { id: 'OTHER', weight: 30.56 }],
      1000,
    )
    const v = stackVoxels(counts, 10, 10)
    expect(v).toHaveLength(1000)
    const tsmc = v.filter((x) => x.group === 0)
    expect(tsmc).toHaveLength(573)
    expect(Math.max(...tsmc.map((x) => x.y))).toBe(5) // 第 573 顆在第 6 層（y = 5）
    expect(Math.max(...v.map((x) => x.y))).toBe(9)
  })

  it('rejects non-positive or non-integer floor sizes', () => {
    expect(() => stackVoxels([{ id: 'a', count: 1 }], 0, 2)).toThrow(RangeError)
    expect(() => stackVoxels([{ id: 'a', count: 1 }], 2, 1.5)).toThrow(RangeError)
  })
})

describe('geometry helpers', () => {
  it('layersFor rounds up partial layers', () => {
    expect(layersFor(1000, 10, 10)).toBe(10)
    expect(layersFor(343, 7, 7)).toBe(7)
    expect(layersFor(1001, 10, 10)).toBe(11)
  })

  it('voxelPosition centers x/z on the origin and sits on y = 0', () => {
    expect(voxelPosition({ id: 'a', group: 0, x: 0, y: 0, z: 0 }, 10, 10)).toEqual([-4.5, 0.5, -4.5])
    expect(voxelPosition({ id: 'a', group: 0, x: 9, y: 2, z: 9 }, 10, 10)).toEqual([4.5, 2.5, 4.5])
  })

  it('explodeOffsetY separates groups proportionally to t', () => {
    expect(explodeOffsetY(0, 1, 5)).toBe(0)
    // groups=5: gap = min(1.5, 10/4 = 2.5) = 1.5; 2 * 1.5 * 0.5 = 1.5
    expect(explodeOffsetY(2, 0.5, 5)).toBeCloseTo(EXPLODE_GAP)
  })

  it('explodeGap shrinks so the exploded tower never exceeds MAX_EXPLODE_SPAN', () => {
    expect(MAX_EXPLODE_SPAN).toBe(10)
    expect(explodeGap(1)).toBe(EXPLODE_GAP) // 10 / max(1, 0) = 10 -> 1.5
    expect(explodeGap(5)).toBe(EXPLODE_GAP) // 10/4 = 2.5 -> 1.5
    expect(explodeGap(12)).toBeCloseTo(10 / 11) // 0.909 < 1.5, cap binds
    // groups=12, last group (11) at t=1: 11 * 10/11 = 10
    expect(explodeOffsetY(11, 1, 12)).toBeCloseTo(MAX_EXPLODE_SPAN)
    // groups=21: gap = 10/20 = 0.5; group 20 -> 10
    expect(explodeOffsetY(20, 1, 21)).toBeCloseTo(10)
  })

  it('sizeAlong picks the grid size for an axis', () => {
    expect(sizeAlong('x', 10, 6, 14)).toBe(10)
    expect(sizeAlong('z', 10, 6, 14)).toBe(6)
    expect(sizeAlong('y', 10, 6, 14)).toBe(14)
  })
})

describe('cutting', () => {
  it('cutThreshold maps amount 0..1 to size..0 and clamps', () => {
    expect(cutThreshold(10, 0)).toBe(10)
    expect(cutThreshold(10, 0.5)).toBe(5)
    expect(cutThreshold(10, 1)).toBe(0)
    expect(cutThreshold(10, 2)).toBe(0)
    expect(cutThreshold(10, -1)).toBe(10)
  })

  it('isHidden removes voxels at or beyond the threshold', () => {
    const cut = { axis: 'x' as const, threshold: 5 }
    expect(isHidden({ id: 'a', group: 0, x: 4, y: 0, z: 0 }, cut)).toBe(false)
    expect(isHidden({ id: 'a', group: 0, x: 5, y: 0, z: 0 }, cut)).toBe(true)
  })

  it('cutPlanePosition sits on the boundary between visible and hidden voxels', () => {
    expect(cutPlanePosition({ axis: 'x', threshold: 5 }, 10, 10)).toBe(0) // x=4 中心 -0.5、x=5 中心 0.5
    expect(cutPlanePosition({ axis: 'z', threshold: 2 }, 10, 6)).toBe(-1)
    expect(cutPlanePosition({ axis: 'y', threshold: 3 }, 10, 10)).toBe(3)
  })
})

describe('approach', () => {
  it('moves toward the target without overshooting', () => {
    expect(approach(0, 1, 0)).toBe(0)
    const mid = approach(0, 1, 0.1)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(approach(0, 1, 10)).toBeCloseTo(1, 6)
    expect(approach(1, 0, 0.1)).toBeLessThan(1)
  })
})
