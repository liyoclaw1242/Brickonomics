import { finite, returnRate } from './guard'

/**
 * 扣掉通膨後真正賺到的比例：(1 + nominal) ÷ (1 + inflation) − 1（約等於 nominal − inflation）。
 * nominal 須有限；inflation 須 > −1，否則丟 RangeError。
 */
export function realReturn(nominal: number, inflation: number): number {
  finite('nominal', nominal)
  returnRate('inflation', inflation)
  return (1 + nominal) / (1 + inflation) - 1
}
