/** 除息：方塊縮小的量剛好等於拿到的金幣（價值守恆）。 */
export function exDividend(price: number, dividend: number): { price: number; cash: number } {
  if (dividend < 0 || dividend > price) throw new Error(`invalid dividend ${dividend} for price ${price}`)
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

export function simulateDistribution(p: DistributionParams): PeriodState[] {
  let value = p.initialValue
  let cashReceived = 0
  let fromPrincipal = 0
  const states: PeriodState[] = [{ period: 0, value, cashReceived, fromPrincipal, total: value }]
  for (let period = 1; period <= p.periods; period++) {
    const income = value * p.incomeYield
    const payout = p.mode === 'payout' ? value * p.payoutRate : 0
    fromPrincipal += Math.max(0, payout - income)
    value = value * (1 + p.priceReturn) + income - payout
    cashReceived += payout
    states.push({ period, value, cashReceived, fromPrincipal, total: value + cashReceived })
  }
  return states
}
