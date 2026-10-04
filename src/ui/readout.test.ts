import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { DEFAULT_VALUES } from '../tour/engine'
import { stageReadout } from './readout'

const v = (over: Partial<typeof DEFAULT_VALUES> = {}) => ({ ...DEFAULT_VALUES, slice: 0, explode: 0, ...over })

describe('stageReadout', () => {
  it('shows the conservation equation for ex-dividend', () => {
    const rows = stageReadout({ kind: 'exdiv', outcome: 'fill' }, v({ phase: 0.5 }), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
    expect(rows[0]!.marks).toEqual(['illustrative'])
  })

  it('lists the fee race rows, unverified parts and the leader', () => {
    const rows = stageReadout({ kind: 'feeRace' }, v({ years: 3, frontLoad: 0.015 }), universe, null)
    expect(rows[0]!.label).toContain('假設 1.50%')
    expect(rows[0]!.marks).toEqual(['assumption', 'unverified']) // 前收：假設值，且內扣費用待驗證
    expect(rows[1]!.marks).toEqual(['unverified'])
    expect(rows[2]!.marks).toEqual(['unverified']) // 0050 的內扣費用也待驗證
    expect(rows[0]!.note).toBe('待驗證：內扣費用')
    expect(rows.at(-1)!.label).toBe('費用最少（只比費用）')
    expect(rows.at(-1)!.value).toBe('ETF（0050）')
    expect(rows.at(-1)!.note).toBe('三者投資內容與風險不同，費用低不代表比較好')
  })

  it('shows shock impacts only when active', () => {
    expect(stageReadout({ kind: 'shock', active: false }, v(), universe, null)).toEqual([])
    const rows = stageReadout({ kind: 'shock', active: true }, v(), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['−30.0%', '−16.9%', '0.0%'])
  })

  it('lists overlap rows with the total', () => {
    const rows = stageReadout({ kind: 'overlap', a: 'QQQ', b: 'SPY' }, v(), universe, null)
    expect(rows[0]).toMatchObject({ label: '輝達', value: '8.3%' })
    expect(rows.at(-1)!.label).toBe('前幾大持股重疊（至少）')
    expect(rows.at(-1)!.note).toBe('其餘持股沒有列出，實際重疊更多')
  })

  it('shows the expense ratio for the fee meter and nothing for plain stages', () => {
    const rows = stageReadout({ kind: 'excavator', meter: true }, v(), universe, 'JH_BALANCED')
    expect(rows).toEqual([{ label: '每年內扣費用', value: '1.88%' }])
    expect(stageReadout({ kind: 'ticker' }, v(), universe, '0050')).toEqual([])
  })

  it('shows accumulate and trap numbers', () => {
    const acc = stageReadout({ kind: 'accumulate' }, v({ periods: 10 }), universe, null)
    expect(acc[0]!.value).toBe('196.7')
    expect(acc[0]!.marks).toEqual(['illustrative'])
    const trap = stageReadout({ kind: 'principalTrap' }, v({ periods: 10 }), universe, null)
    expect(trap.map((r) => r.value)).toEqual(['73.7', '52.5', '26.3'])
  })

  it('lists sector shares for underground cores and nothing otherwise', () => {
    const rows = stageReadout({ kind: 'underground', show: 'cores', cores: ['QQQ', 'SPY'] }, v(), universe, null)
    expect(rows[0]).toEqual({ label: 'Invesco QQQ・半導體（至少）', value: '13.3%' })
    expect(rows.find((r) => r.label.endsWith('其他'))).toBeDefined() // 其他（快照沒有細分）那一列不加「至少」
    expect(stageReadout({ kind: 'underground', show: 'strata' }, v(), universe, null)).toEqual([])
  })
})
