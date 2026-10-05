import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { sectorBreakdown } from '../scene/layout/underground'
import { accumulateVsPayout, exDivTimeline, principalTrap } from '../scene/layout/stages'
import { feeRaceLeader, feeRaceRows } from '../sim/feeRace'
import { DCA_DEMO, dcaNow, ddNow, INFL_DEMO, inflReal, PE_DEMO, peYears, ratePrice } from '../scene/layout/intermediate'
import { overlap } from '../sim/overlap'
import { shockImpact } from '../sim/scenario'
import { SHOCK_2330, signedPct } from '../tour/context'
import type { Stage, TourValues } from '../tour/types'
import { eventAftermath } from '../scene/events'
import type { EventSpec } from '../scene/events/types'
import { feeRowMarks, type Mark } from './marks'
import { T } from './strings'

export type ReadoutRow = { label: string; value: string; marks?: Mark[]; note?: string }

const n1 = (x: number) => x.toFixed(1)

/** 每個舞台在面板上的即時數字（純函式，畫面與測試共用） */
export function stageReadout(stage: Stage, v: TourValues, u: Universe, productId: string | null, event?: EventSpec): ReadoutRow[] {
  switch (stage.kind) {
    case 'exdiv': {
      const s = exDivTimeline(v.phase, stage.outcome)
      return [
        { label: T.readout.block, value: n1(s.blockValue), marks: ['illustrative'] },
        { label: T.readout.coins, value: n1(s.cash) },
        { label: T.readout.total, value: n1(s.blockValue + s.cash) },
      ]
    }
    case 'feeRace': {
      const withEtf = stage.etf ?? true
      const rows = feeRaceRows(u, v.years, v.frontLoad, withEtf)
      const label = (id: 'front' | 'back' | 'etf') => (id === 'front' ? T.feeRows.front(v.frontLoad) : T.feeRows[id])
      return [
        ...rows.map((r) => ({
          label: label(r.id),
          value: T.readout.remaining(r.value),
          marks: feeRowMarks(r.id, r.unverified.length),
          note: r.unverified.length ? T.readout.unverifiedParts(r.unverified.map((k) => T.feeParts[k]).join('、')) : undefined,
        })),
        { label: T.readout.leader, value: label(feeRaceLeader(rows)), note: withEtf ? T.feeRaceCaveat : T.feeRaceCaveatFunds },
      ]
    }
    case 'accumulate': {
      const r = accumulateVsPayout(v.periods)
      return [
        { label: T.readout.accumulate, value: n1(r.accumulate.value), marks: ['illustrative'] },
        { label: T.readout.payoutTower, value: n1(r.payout.value) },
        { label: T.readout.payoutCash, value: n1(r.payout.cashReceived) },
        { label: T.readout.payoutTotal, value: n1(r.payout.total) },
      ]
    }
    case 'principalTrap': {
      const s = principalTrap(v.periods)
      return [
        { label: T.readout.trapValue, value: n1(s.value), marks: ['illustrative'] },
        { label: T.readout.trapCash, value: n1(s.cashReceived) },
        { label: T.readout.trapPrincipal, value: n1(s.fromPrincipal) },
      ]
    }
    case 'shock':
      if (!eventAftermath(event)) return []
      return [
        { label: T.shock.stock, value: signedPct(SHOCK_2330['2330']!) },
        { label: u.get('0050')!.name, value: signedPct(shockImpact(u, '0050', { ...SHOCK_2330 })) },
        { label: u.get('SPY')!.name, value: signedPct(shockImpact(u, 'SPY', { ...SHOCK_2330 })) },
      ]
    case 'drawdown': {
      const d = ddNow(v.tick)
      const p = (r: number) => `${(r * 100).toFixed(1)}%`
      return [
        { label: T.readout.ddPrice, value: String(d.price), marks: ['illustrative'] },
        { label: T.readout.ddPeak, value: String(d.peak) },
        { label: T.readout.ddDrop, value: p(d.drop) },
        { label: T.readout.ddWorst, value: p(d.worst) },
      ]
    }
    case 'pe':
      return [
        { label: T.readout.pePrice, value: String(PE_DEMO.price), marks: ['illustrative'] },
        ...(['cheap', 'pricey'] as const).map((k) => ({ label: T.readout.peYears(PE_DEMO.earnings[k]), value: T.pe.years(peYears(k)) })),
      ]
    case 'seesaw':
      return [
        { label: T.readout.rateNow, value: T.controls.rateValue(v.rate), marks: ['illustrative'] },
        { label: T.readout.ratePrice, value: n1(ratePrice(v.rate)) },
        { label: T.readout.rateFace, value: '100' },
      ]
    case 'dca': {
      const { result: r } = dcaNow(v.months)
      return [
        { label: T.readout.dcaAmount, value: T.yuan(DCA_DEMO.amount), marks: ['illustrative'] },
        { label: T.readout.dcaUnits, value: n1(r.totalUnits) },
        { label: T.readout.dcaCost, value: T.yuan1(r.avgCost) },
        { label: T.readout.dcaPrice, value: T.yuan1(r.avgPrice) },
      ]
    }
    case 'inflation': {
      const p = (r: number) => `${(r * 100).toFixed(1)}%`
      return [
        { label: T.readout.inflNominal, value: p(INFL_DEMO.nominal), marks: ['illustrative'] },
        { label: T.readout.inflInflation, value: p(INFL_DEMO.inflation) },
        { label: T.readout.inflReal, value: p(inflReal()) },
      ]
    }
    case 'overlap': {
      const o = overlap(u, stage.a, stage.b)
      return [
        ...o.rows.map((r) => ({ label: u.get(r.id)!.name, value: `${(r.shared * 100).toFixed(1)}%` })),
        { label: T.readout.overlapTotal, value: `${(o.total * 100).toFixed(1)}%`, note: T.readout.overlapNote },
      ]
    }
    case 'excavator': {
      const p = productId ? u.get(productId) : undefined
      const er = p?.fees?.expenseRatio
      if (!stage.meter || !p || er === undefined) return []
      return [{ label: T.readout.expenseRatio, value: `${(er * 100).toFixed(2)}%`, marks: isVerified(p, 'fees.expenseRatio') ? undefined : ['unverified'] }]
    }
    case 'underground': {
      if (stage.show !== 'cores' || !stage.cores) return []
      return stage.cores.flatMap((id) =>
        sectorBreakdown(u, id).map((r) => ({
          label: `${u.get(id)!.name}・${T.sectors[r.sector]}${r.sector === 'unclassified' ? '' : T.readout.atLeast}`,
          value: `${r.weightPct.toFixed(1)}%`,
        })),
      )
    }
    default:
      return []
  }
}
