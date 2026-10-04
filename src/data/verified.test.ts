import { describe, it, expect } from 'vitest'
import { isVerified } from './verified'
import { universe } from './index'
import type { Asset } from './schema'

const base: Asset = { id: 'X', name: 'X', type: 'stock', asOf: '2026-10-03', source: [] }

describe('isVerified', () => {
  it('is false when there is no verified map', () => {
    expect(isVerified(base, 'holdings')).toBe(false)
  })

  it('uses the exact key when present', () => {
    const a: Asset = { ...base, verified: { fees: false, 'fees.cdsc': true } }
    expect(isVerified(a, 'fees.cdsc')).toBe(true)
  })

  it('falls back from a fine key to its parent key', () => {
    const a: Asset = { ...base, verified: { fees: true } }
    expect(isVerified(a, 'fees.cdsc')).toBe(true)
    expect(isVerified({ ...base, verified: { fees: false } }, 'fees.expenseRatio')).toBe(false)
  })

  it('an explicit false on the fine key beats a true parent', () => {
    const a: Asset = { ...base, verified: { fees: true, 'fees.expenseRatio': false } }
    expect(isVerified(a, 'fees.expenseRatio')).toBe(false)
  })

  it('is false when neither key exists', () => {
    expect(isVerified({ ...base, verified: { holdings: true } }, 'fees.cdsc')).toBe(false)
  })

  it('matches the Schroder U-class flags in the snapshot', () => {
    const u = universe.get('SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD')!
    expect(isVerified(u, 'fees.cdsc')).toBe(true)
    expect(isVerified(u, 'fees.expenseRatio')).toBe(true) // 2026-10 查證：TER 2.38% − 分銷費 1.00% = 1.38%
    expect(isVerified(u, 'distribution')).toBe(true)
    expect(isVerified(u, 'holdings')).toBe(true)
  })
})
