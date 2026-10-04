import { describe, it, expect } from 'vitest'
import { countUp } from './countUp'

describe('countUp', () => {
  it('grows the first number from 0 toward the target, keeping its format', () => {
    const mid = countUp('56%', 0.5)
    expect(mid).toMatch(/^\d+%$/)
    const n = Number(mid.slice(0, -1))
    expect(n).toBeGreaterThan(0)
    expect(n).toBeLessThan(56)
    expect(n).toBeGreaterThan(28) // ease-out：前半段已超過一半
  })

  it('reaches the exact text at t = 1 and keeps the surrounding text', () => {
    expect(countUp('至少 63%', 1)).toBe('至少 63%')
    expect(countUp('-16.9%', 1)).toBe('-16.9%')
    expect(countUp('−16.9%', 1)).toBe('−16.9%')
    expect(countUp('可轉債 32%', 1)).toBe('可轉債 32%')
    expect(countUp('1.88%', 2)).toBe('1.88%') // t 超過 1 也停在終點
  })

  it('keeps decimals and starts at zero', () => {
    expect(countUp('-16.9%', 0)).toBe('0.0%') // 顯示為 0 時不帶負號（不出現 −0.0%）
    expect(countUp('−16.9%', 0)).toBe('0.0%')
    expect(countUp('−16.9%', 0.0005)).toBe('0.0%') // 16.9 × (1 − 0.9995³) ≈ 0.025 → 0.0
    expect(countUp('−16.9%', 0.5)).toMatch(/^−\d+\.\d%$/)
    expect(countUp('1.88%', 0)).toBe('0.00%')
    expect(countUp('-16.9%', 0.5)).toMatch(/^-\d+\.\d%$/)
    expect(countUp('至少 63%', 0)).toBe('至少 0%')
  })

  it('only animates the first number', () => {
    expect(countUp('100 與 5', 0)).toBe('0 與 5')
  })

  it('returns text without numbers unchanged', () => {
    expect(countUp('不變', 0.3)).toBe('不變')
    expect(countUp('', 0.3)).toBe('')
  })
})
