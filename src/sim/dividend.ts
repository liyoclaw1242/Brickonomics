import { inRange, nonNegInt, rate, returnRate, finite } from './guard'

/**
 * 除息：方塊縮小的量剛好等於拿到的金幣（價值守恆）。
 * price 須有限且 > 0；dividend 須有限且在 [0, price]，否則丟 RangeError。
 */
export function exDividend(price: number, dividend: number): { price: number; cash: number } {
  finite('price', price)
  if (price <= 0) throw new RangeError(`price must be > 0: ${price}`)
  inRange('dividend', dividend, 0, price)
  return { price: price - dividend, cash: dividend }
}

export type DistributionParams = {
  initialValue: number
  /** 每期內部產出（股利、利息）占價值的比例 */
  incomeYield: number
  /** 每期價格漲跌（不含產出） */
  priceReturn: number
  /** 每期配出占價值的比例；mode 為 accumulate 時忽略 */
  payoutRate: number
  periods: number
  mode: 'payout' | 'accumulate'
}

export type PeriodState = {
  period: number
  value: number
  cashReceived: number
  /** 累計配出超過產出的部分（配息來自本金） */
  fromPrincipal: number
  total: number
}

/**
 * 逐期模擬配息／不配息。rates 須在 [0, 1)，priceReturn > -1，periods 為非負整數，
 * initialValue 有限且 ≥ 0；若某期配出後價值會變成負數則丟 RangeError。
 */
export function simulateDistribution(p: DistributionParams): PeriodState[] {
  inRange('initialValue', p.initialValue, 0)
  rate('incomeYield', p.incomeYield)
  returnRate('priceReturn', p.priceReturn)
  rate('payoutRate', p.payoutRate)
  nonNegInt('periods', p.periods)
  let value = p.initialValue
  let cashReceived = 0
  let fromPrincipal = 0
  const states: PeriodState[] = [{ period: 0, value, cashReceived, fromPrincipal, total: value }]
  for (let period = 1; period <= p.periods; period++) {
    const income = value * p.incomeYield
    const payout = p.mode === 'payout' ? value * p.payoutRate : 0
    fromPrincipal += Math.max(0, payout - income)
    const next = value * (1 + p.priceReturn) + income - payout
    if (next < 0) throw new RangeError(`payoutRate ${p.payoutRate} makes value negative in period ${period}`)
    value = next
    cashReceived += payout
    states.push({ period, value, cashReceived, fromPrincipal, total: value + cashReceived })
  }
  return states
}
