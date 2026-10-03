import { describe, it, expect } from 'vitest'
import { QUALITY, detectQuality, parseQualityParam } from './quality'

describe('QUALITY', () => {
  it('fills whole layers and respects the block caps', () => {
    for (const q of ['high', 'low'] as const) {
      for (const spec of [QUALITY[q].etf, QUALITY[q].fund]) {
        expect(spec.total % (spec.w * spec.d), `${q}`).toBe(0)
      }
    }
    expect(QUALITY.high.etf.total).toBe(1000)
    expect(QUALITY.low.etf.total).toBeLessThanOrEqual(350)
  })
})

describe('detectQuality', () => {
  it('uses low quality for touch devices or few cores', () => {
    expect(detectQuality({ coarsePointer: true, cores: 16 })).toBe('low')
    expect(detectQuality({ coarsePointer: false, cores: 4 })).toBe('low')
    expect(detectQuality({ coarsePointer: false, cores: 8 })).toBe('high')
    expect(detectQuality({ coarsePointer: false, cores: undefined })).toBe('high')
  })
})

describe('parseQualityParam', () => {
  it('accepts only high or low', () => {
    expect(parseQualityParam('?quality=high')).toBe('high')
    expect(parseQualityParam('?level=2&quality=low')).toBe('low')
    expect(parseQualityParam('?quality=ultra')).toBeNull()
    expect(parseQualityParam('')).toBeNull()
  })
})
