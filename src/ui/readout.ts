import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { sectorBreakdown } from '../scene/layout/underground'
import { accumulateVsPayout, exDivTimeline, principalTrap } from '../scene/layout/stages'
import { feeRaceLeader, feeRaceRows } from '../sim/feeRace'
import { DCA_DEMO, dcaNow, ddNow, INFL_DEMO, inflReal, PE_DEMO, peYears, ratePrice } from '../scene/layout/intermediate'
import { corrNow, dtNow, durNow, feeTreesNow, hedgeCaseIndex, hedgeTowers, levNow, portNow, rebalNow } from '../scene/layout/advanced'
import { hedgeExample } from '../sim/hedge'
import { FEE_DRAG } from '../sim/feeDrag'
import { LEVERAGE } from '../sim/leverage'
import { DURATION } from '../sim/duration'
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
    case 'portfolio': {
      // 風暴是這一步一進來就發生的事件：讀數直接寫風暴後（文字版也一樣）
      const n = portNow(v.bondPct, v.storm)
      return [
        { label: T.readout.portStock, value: `${T.wan(n.before.stock)} → ${T.wan(n.after.stock)}`, marks: ['illustrative'] },
        { label: T.readout.portBond, value: `${T.wan(n.before.bond)} → ${T.wan(n.after.bond)}` },
        { label: T.readout.portRemaining, value: T.wan(n.after.remaining) },
      ]
    }
    case 'feeTrees': {
      const er = (id: string) => u.get(id)?.fees?.expenseRatio
      const a = er(FEE_DRAG.active)
      const p = er(FEE_DRAG.passive)
      if (a === undefined || p === undefined) return []
      const n = feeTreesNow(v.periods, { active: a, passive: p })
      const pct = (r: number) => `${(r * 100).toFixed(2)}%`
      const mark = (id: string): Mark[] | undefined => (isVerified(u.get(id)!, 'fees.expenseRatio') ? undefined : ['unverified'])
      return [
        { label: T.readout.fee30Years, value: T.controls.periodsValue(n.years), marks: ['illustrative'] },
        { label: T.readout.fee30Active(pct(a)), value: T.wan(n.active.value), marks: mark(FEE_DRAG.active) },
        { label: T.readout.fee30Passive(pct(p)), value: T.wan(n.passive.value), marks: mark(FEE_DRAG.passive) },
        { label: T.readout.fee30NoFee, value: T.wan(n.noFee) },
      ]
    }
    case 'rebalance': {
      const r = rebalNow(v.rebal)
      return [
        { label: T.readout.rebalStage, value: T.controls.rebalValue(r.stage), marks: ['illustrative'] },
        { label: T.readout.rebalStock, value: T.wan(r.stock) },
        { label: T.readout.rebalBond, value: T.wan(r.bond) },
        { label: T.readout.rebalPct, value: `${r.stockPct.toFixed(1)}%` },
        ...(r.moved !== 0 ? [{ label: T.readout.rebalMoved, value: T.wan(r.moved) }] : []),
      ]
    }
    case 'hedge': {
      // 這個情境走完的結果（⚡ 情境：閃電已經打下來）；反向那座用到假設的費用（✎）
      const ex = hedgeExample(u)
      const c = hedgeCaseIndex(v.hedgeCase)
      return [
        { label: T.readout.hedgeCase, value: T.controls.hedgeCaseValue(c), marks: ['illustrative'] },
        ...hedgeTowers(ex, c, 1).map((t) => ({ label: T.hedge[t.id], value: T.wan(t.total), ...(t.id === 'inverse' ? { marks: ['assumption' as const] } : {}) })),
      ]
    }
    case 'leverage': {
      // 浪是一進來就發生的事件：讀數直接寫走完之後（文字版也一樣）
      const l = levNow()
      return [
        { label: T.readout.levAfter(T.lev.plain, LEVERAGE.rounds), value: n1(l.plain.at(-1)!), marks: ['illustrative'] },
        { label: T.readout.levAfter(T.lev.double, LEVERAGE.rounds), value: n1(l.double.at(-1)!) },
        { label: T.readout.levNaive, value: n1(l.naiveDouble) },
        { label: T.readout.levAfter(T.lev.inverse, LEVERAGE.rounds), value: n1(l.inverse.at(-1)!) },
      ]
    }
    case 'duration': {
      const d = durNow(v.rate)
      return [
        { label: T.readout.rateNow, value: T.controls.rateValue(d.rate), marks: ['illustrative'] },
        { label: T.readout.durBond(DURATION.short), value: n1(100 * (1 + d.short)) },
        { label: T.readout.durBond(DURATION.long), value: n1(100 * (1 + d.long)) },
        { label: T.readout.rateFace, value: '100' },
      ]
    }
    case 'dayTrade': {
      const d = dtNow(v.trades, v.feeDiscount, v.winRate)
      return [
        { label: T.readout.dtTrades, value: T.controls.tradesValue(d.n), marks: ['illustrative'] },
        { label: T.controls.feeDiscount, value: T.controls.feeDiscountValue(d.discount) },
        { label: T.controls.winRate, value: T.controls.winRateValue(d.winRate) },
        { label: T.readout.dtBreakEven, value: T.pct1(d.breakEven) },
        { label: T.readout.dtCost, value: `${(d.costPerTrade * 100).toFixed(3)}%` },
        { label: T.readout.dtCapital, value: T.wan(d.capital) },
        { label: T.readout.dtPaid, value: T.wan(d.costPaid) },
      ]
    }
    case 'correlation': {
      // 整段舉例裡平常晃多大（各期報酬率的標準差）
      const s = corrNow().swing
      const p = (r: number) => `${(r * 100).toFixed(1)}%`
      return [
        { label: T.readout.corrAlone, value: p(s.alone), marks: ['illustrative'] },
        { label: T.readout.corrTogether, value: p(s.together) },
        { label: T.readout.corrOpposite, value: p(s.opposite) },
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
