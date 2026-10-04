import { describe, it, expect } from 'vitest'
import { layoutModel, viewFraming } from './layoutModel'

describe('layoutModel', () => {
  it('reserves the panel, toolbar and timeline on desktop', () => {
    expect(layoutModel(1280, 800)).toEqual({ mobile: false, insets: { top: 64, right: 0, bottom: 76, left: 336 } })
  })
  it('reserves the drawer and top bar on mobile', () => {
    expect(layoutModel(390, 844)).toEqual({ mobile: true, insets: { top: 56, right: 0, bottom: 414, left: 0 } }) // round(844×0.42)=354 + 時間軸 60
  })
})

describe('viewFraming', () => {
  it('shifts the view toward the centre of the visible area', () => {
    const f = viewFraming(1280, 800)
    // 內容往右 (336−0)/2 = 168、往下 (64−76)/2 = −6 → setViewOffset 的位移取負號
    expect(f.offsetX).toBe(-168)
    expect(f.offsetY).toBe(6)
  })
  it('shrinks the scene to fit the visible height on desktop', () => {
    // 可用高 800−64−76 = 660 → 660/800 = 0.825；可用寬 (1280−336)×0.85/800 = 1.003 → 取 0.825
    expect(viewFraming(1280, 800).zoom).toBeCloseTo(0.825, 3)
  })
  it('fits the narrow visible area above the mobile drawer', () => {
    const f = viewFraming(390, 844)
    // 往上 (414−56)/2 = 179；寬度限制 390×0.85/844 ≈ 0.3928 小於高度限制 (844−56−414)/844 ≈ 0.4431
    expect(f.offsetX).toBe(0)
    expect(f.offsetY).toBe(179)
    expect(f.zoom).toBeCloseTo((390 * 0.85) / 844, 4)
  })
  it('never zooms in past 1', () => {
    expect(viewFraming(3000, 800).zoom).toBeLessThanOrEqual(1)
  })
})
