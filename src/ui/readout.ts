import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { accumulateVsPayout, exDivTimeline, principalTrap } from '../scene/layout/stages'
import { feeRace, feeRaceLeader } from '../sim/feeRace'
import { overlap } from '../sim/overlap'
import { shockImpact } from '../sim/scenario'
import { SHOCK_2330, signedPct } from '../tour/context'
import type { Stage, TourValues } from '../tour/types'
import { T } from './strings'

export type ReadoutRow = { label: string; value: string; unverified?: boolean; note?: string }

const n1 = (x: number) => x.toFixed(1)

/** 每個舞台在面板上的即時數字（純函式，畫面與測試共用） */
export function stageReadout(stage: Stage, v: TourValues, u: Universe, productId: string | null): ReadoutRow[] {
  switch (stage.kind) {
    case 'exdiv': {
      const s = exDivTimeline(v.phase, stage.outcome)
      return [
        { label: T.readout.block, value: n1(s.blockValue) },
        { label: T.readout.coins, value: n1(s.cash) },
        { label: T.readout.total, value: n1(s.blockValue + s.cash) },
      ]
    }
    case 'feeRace': {
      const rows = feeRace(u, v.years, v.frontLoad)
      const label = (id: 'front' | 'back' | 'etf') => (id === 'front' ? T.feeRows.front(v.frontLoad) : T.feeRows[id])
      return [
        ...rows.map((r) => ({
          label: label(r.id),
          value: T.readout.remaining(r.value),
          unverified: r.unverified.length > 0,
          note: r.unverified.length ? T.readout.unverifiedParts(r.unverified.map((k) => T.feeParts[k]).join('、')) : undefined,
        })),
        { label: T.readout.leader, value: label(feeRaceLeader(rows)), note: T.feeRaceCaveat },
      ]
    }
    case 'accumulate': {
      const r = accumulateVsPayout(v.periods)
      return [
        { label: T.readout.accumulate, value: n1(r.accumulate.value) },
        { label: T.readout.payoutTower, value: n1(r.payout.value) },
        { label: T.readout.payoutCash, value: n1(r.payout.cashReceived) },
        { label: T.readout.payoutTotal, value: n1(r.payout.total) },
      ]
    }
    case 'principalTrap': {
      const s = principalTrap(v.periods)
      return [
        { label: T.readout.trapValue, value: n1(s.value) },
        { label: T.readout.trapCash, value: n1(s.cashReceived) },
        { label: T.readout.trapPrincipal, value: n1(s.fromPrincipal) },
      ]
    }
    case 'shock':
      if (!stage.active) return []
      return [
        { label: T.shock.stock, value: signedPct(SHOCK_2330['2330']!) },
        { label: u.get('0050')!.name, value: signedPct(shockImpact(u, '0050', { ...SHOCK_2330 })) },
        { label: u.get('SPY')!.name, value: signedPct(shockImpact(u, 'SPY', { ...SHOCK_2330 })) },
      ]
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
      return [{ label: T.readout.expenseRatio, value: `${(er * 100).toFixed(2)}%`, unverified: !isVerified(p, 'fees.expenseRatio') }]
    }
    default:
      return []
  }
}
