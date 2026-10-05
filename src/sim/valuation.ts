import { finite } from './guard'

const positive = (name: string, x: number): number => {
  finite(name, x)
  if (x <= 0) throw new RangeError(`${name} must be > 0: ${x}`)
  return x
}

/**
 * 本益比（用年數講）：每股每年賺 earnings，要賺幾年才賺回股價 price＝price ÷ earnings。
 * 兩個參數都須有限且 > 0，否則丟 RangeError。
 */
export function yearsToPayBack(price: number, earnings: number): number {
  return positive('price', price) / positive('earnings', earnings)
}
