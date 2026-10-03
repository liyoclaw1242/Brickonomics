import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { TW_TRADING } from '../data/trading'
import { profileFromFees, valueAfter, type FeeProfile } from './fees'

/** 同一檔施羅德債券基金的前收型（手續費為假設）、後收 U 級別，以及 0050 */
export const FEE_RACE = {
  fund: 'SCHRODER_GLOBAL_INCOME_BOND',
  backClass: 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD',
  etf: '0050',
} as const

export type FeePart = 'expenseRatio' | 'distributionFee' | 'cdsc' | 'trading'
export type FeeRaceRow = { id: 'front' | 'back' | 'etf'; value: number; lost: number; unverified: FeePart[] }

const need = (u: Universe, id: string) => {
  const a = u.get(id)
  if (!a) throw new Error(`unknown asset ${id}`)
  return a
}

const combine = (x: number, y: number) => 1 - (1 - x) * (1 - y)

export function feeRaceProfiles(u: Universe, frontLoad: number): { front: FeeProfile; back: FeeProfile; etf: FeeProfile } {
  const fund = need(u, FEE_RACE.fund)
  const back = need(u, FEE_RACE.backClass)
  const etf = need(u, FEE_RACE.etf)
  return {
    front: profileFromFees({ ...fund.fees, frontLoad }),
    back: profileFromFees(back.fees),
    etf: profileFromFees(etf.fees, { buy: TW_TRADING.brokerFee, sell: combine(TW_TRADING.brokerFee, TW_TRADING.etfSellCost) }),
  }
}

/** 投入 100、毛報酬 0：只比費用。years 為持有年數（可為 0：一年內賣出） */
export function feeRace(u: Universe, years: number, frontLoad: number): FeeRaceRow[] {
  const p = feeRaceProfiles(u, frontLoad)
  const fund = need(u, FEE_RACE.fund)
  const back = need(u, FEE_RACE.backClass)
  const etf = need(u, FEE_RACE.etf)
  const row = (id: FeeRaceRow['id'], profile: FeeProfile, unverified: FeePart[]): FeeRaceRow => {
    const value = valueAfter(profile, years)
    return { id, value, lost: 100 - value, unverified }
  }
  const parts = (asset: typeof fund, keys: Exclude<FeePart, 'trading'>[]) =>
    keys.filter((k) => !isVerified(asset, `fees.${k}` as const))
  return [
    row('front', p.front, parts(fund, ['expenseRatio'])),
    row('back', p.back, parts(back, ['expenseRatio', 'distributionFee', 'cdsc'])),
    row('etf', p.etf, [
      ...parts(etf, ['expenseRatio']),
      ...(TW_TRADING.verified.brokerFee && TW_TRADING.verified.etfSellCost ? [] : (['trading'] as FeePart[])),
    ]),
  ]
}

export function feeRaceLeader(rows: FeeRaceRow[]): FeeRaceRow['id'] {
  return rows.reduce((best, r) => (r.value > best.value ? r : best)).id
}
