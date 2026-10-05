import { bondPrice } from './bondPrice'

/** 存續期間的舉例（≈ 示意）：短借據 2 年、長借據 20 年，市場利率從 2% 升到 3% */
export const DURATION = { rateFrom: 0.02, rateTo: 0.03, short: 2, long: 20 } as const

/**
 * 利率從 rateFrom 變成 rateTo 時，一張借據（債券）的價格變多少（比例；−0.15＝少掉 15%）。
 * 借據是在利率 rateFrom 時用面額 100 買的（利息＝rateFrom，所以買的時候價格正好 100），還剩 years 年到期。
 * 沿用 bondPrice（現值）。年期越長，同樣的利率變動價格動得越多（翹翹板越長、翹得越高）。
 * years 須為非負整數、兩個利率須在 [0, 1)，否則丟 RangeError（bondPrice 檢查，訊息以 coupon／years／rate 開頭）。
 */
export function priceChange(years: number, rateFrom: number, rateTo: number): number {
  const before = bondPrice({ coupon: rateFrom, years, rate: rateFrom })
  const after = bondPrice({ coupon: rateFrom, years, rate: rateTo })
  return after / before - 1
}
