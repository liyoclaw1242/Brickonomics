import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import type { Universe } from '../data'
import { DEFAULT_VALUES } from '../tour/engine'
import { stageReadout } from './readout'

const unverify = (ids: string[]): Universe => {
  const m = new Map(universe)
  for (const id of ids) m.set(id, { ...m.get(id)!, verified: {} })
  return m
}
const v = (over: Partial<typeof DEFAULT_VALUES> = {}) => ({ ...DEFAULT_VALUES, slice: 0, explode: 0, ...over })

describe('stageReadout', () => {
  it('x-cc covered call: move, plain, premium, covered (≈); rise +20 → +20%, +2%, +7%; fall −20 → −18%', () => {
    const up = stageReadout({ kind: 'coveredCall' }, v({ ccMove: 20 }), universe, null)
    expect(up.map((r) => r.value)).toEqual(['漲 20%', '+20%', '+2%', '+7%'])
    expect(up[0]!.marks).toEqual(['illustrative'])
    const down = stageReadout({ kind: 'coveredCall' }, v({ ccMove: -20 }), universe, null)
    expect(down.map((r) => r.value)).toEqual(['跌 20%', '−20%', '+2%', '−18%'])
  })

  it('shows the conservation equation for ex-dividend', () => {
    const rows = stageReadout({ kind: 'exdiv', outcome: 'fill' }, v({ phase: 0.5 }), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
    expect(rows[0]!.marks).toEqual(['illustrative'])
  })

  it('lists the fee race rows, unverified parts and the leader', () => {
    const rows = stageReadout({ kind: 'feeRace' }, v({ years: 3, frontLoad: 0.015 }), universe, null)
    expect(rows[0]!.label).toContain('假設 1.50%')
    // 2026-10：施羅德 A／U 與 0050 的內扣費用都已查證 → 前收只剩假設值 ✎，其餘沒有標示
    expect(rows[0]!.marks).toEqual(['assumption'])
    expect(rows[1]!.marks).toEqual([])
    expect(rows[2]!.marks).toEqual([])
    expect(rows[0]!.note).toBeUndefined()
    // 旗標清空時 ？ 與「資料待更新」仍會出現
    const stale = unverify(['SCHRODER_GLOBAL_INCOME_BOND', 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', '0050'])
    const sr = stageReadout({ kind: 'feeRace' }, v({ years: 3, frontLoad: 0.015 }), stale, null)
    expect(sr[0]!.marks).toEqual(['assumption', 'unverified'])
    expect(sr[1]!.marks).toEqual(['unverified'])
    expect(sr[2]!.marks).toEqual(['unverified'])
    expect(sr[0]!.note).toBe('資料待更新：內扣費用')
    expect(rows.at(-1)!.label).toBe('費用最少（只比費用）')
    expect(rows.at(-1)!.value).toBe('ETF（0050）')
    expect(rows.at(-1)!.note).toBe('三者投資內容與風險不同，費用低不代表比較好')
  })

  it('fee race without the ETF (tour f-6/f-7: 0050 is not taught yet) lists only the two fund classes', () => {
    const rows = stageReadout({ kind: 'feeRace', etf: false }, v({ years: 3, frontLoad: 0.015 }), universe, null)
    expect(rows.map((r) => r.label).join('｜')).not.toContain('0050')
    expect(rows).toHaveLength(3) // 前收、後收、費用最少
    expect(rows[0]!.marks).toEqual(['assumption']) // 多說一點裡的數字表保留 ✎；內扣費用已查證
    expect(rows[1]!.marks).toEqual([])
    const stale = unverify(['SCHRODER_GLOBAL_INCOME_BOND', 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD'])
    const sr = stageReadout({ kind: 'feeRace', etf: false }, v({ years: 3, frontLoad: 0.015 }), stale, null)
    expect(sr[0]!.marks).toEqual(['assumption', 'unverified'])
    expect(sr[1]!.marks).toEqual(['unverified'])
    expect(['前收型（假設 1.50%）', '後收型（U 級別）']).toContain(rows.at(-1)!.value)
    expect(rows.at(-1)!.note).not.toContain('三者')
  })

  it('shows shock impacts only when active', () => {
    expect(stageReadout({ kind: 'shock' }, v(), universe, null, { kind: 'lightning', phase: 'gather' })).toEqual([])
    const rows = stageReadout({ kind: 'shock' }, v(), universe, null, { kind: 'lightning', phase: 'strike' })
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
