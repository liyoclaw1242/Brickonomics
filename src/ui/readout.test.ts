import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { DEFAULT_VALUES } from '../tour/engine'
import { stageReadout } from './readout'

const v = (over: Partial<typeof DEFAULT_VALUES> = {}) => ({ ...DEFAULT_VALUES, slice: 0, explode: 0, ...over })

describe('stageReadout', () => {
  it('shows the conservation equation for ex-dividend', () => {
    const rows = stageReadout({ kind: 'exdiv', outcome: 'fill' }, v({ phase: 0.5 }), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
  })

  it('lists the fee race rows, unverified parts and the leader', () => {
    const rows = stageReadout({ kind: 'feeRace' }, v({ years: 3, frontLoad: 0.015 }), universe, null)
    expect(rows[0]!.label).toContain('假設 1.50%')
    expect(rows[0]!.unverified).toBe(true)
    expect(rows.at(-1)!.label).toBe('目前最划算')
    expect(rows.at(-1)!.value).toBe('ETF（0050）')
  })

  it('shows shock impacts only when active', () => {
    expect(stageReadout({ kind: 'shock', active: false }, v(), universe, null)).toEqual([])
    const rows = stageReadout({ kind: 'shock', active: true }, v(), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['−30.0%', '−17.2%', '0.0%'])
  })

  it('lists overlap rows with the total', () => {
    const rows = stageReadout({ kind: 'overlap', a: 'QQQ', b: 'SPY' }, v(), universe, null)
    expect(rows[0]).toMatchObject({ label: '輝達', value: '8.3%' })
    expect(rows.at(-1)!.label).toBe('重疊合計')
  })

  it('shows the expense ratio for the fee meter and nothing for plain stages', () => {
    const rows = stageReadout({ kind: 'excavator', meter: true }, v(), universe, 'JH_BALANCED')
    expect(rows).toEqual([{ label: '每年內扣費用', value: '1.88%', unverified: false }])
    expect(stageReadout({ kind: 'ticker' }, v(), universe, '0050')).toEqual([])
  })

  it('shows accumulate and trap numbers', () => {
    const acc = stageReadout({ kind: 'accumulate' }, v({ periods: 10 }), universe, null)
    expect(acc[0]!.value).toBe('196.7')
    const trap = stageReadout({ kind: 'principalTrap' }, v({ periods: 10 }), universe, null)
    expect(trap.map((r) => r.value)).toEqual(['73.7', '52.5', '26.3'])
  })
})
