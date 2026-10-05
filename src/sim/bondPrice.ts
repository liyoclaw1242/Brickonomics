import { nonNegInt, rate } from './guard'

/** 面額（到期拿回的本金） */
export const FACE = 100

export type BondPriceParams = {
  /** 每年利息占面額的比例（例 0.02） */
  coupon: number
  /** 還剩幾年到期（整數；0＝今天到期） */
  years: number
  /** 現在的市場利率（例 0.05） */
  rate: number
}

/**
 * 舊借據（已經發行的債券）今天值多少：每年付一次利息，到期還面額 100，全部用市場利率折回今天（現值）。
 * coupon、rate 須在 [0, 1)，years 為非負整數，否則丟 RangeError。
 */
export function bondPrice(p: BondPriceParams): number {
  rate('coupon', p.coupon)
  nonNegInt('years', p.years)
  rate('rate', p.rate)
  let pv = 0
  for (let k = 1; k <= p.years; k++) pv += (FACE * p.coupon) / (1 + p.rate) ** k
  return pv + FACE / (1 + p.rate) ** p.years
}
