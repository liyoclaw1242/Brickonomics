/** 3b1b「數字會長出來」：純函式，畫面與測試共用 */

const NUMBER = /([-−]?)(\d+(?:\.\d+)?)/

/** ease-out（三次方）：開始快、結尾慢 */
export const easeOut = (t: number): number => 1 - (1 - t) ** 3

/**
 * 把字串中第一個數字（含緊接的負號）依 t（0–1，ease-out）從 0 長到目標值；保留小數位數與前後文字。
 * 沒有數字時原樣回傳；t ≥ 1 時回傳原字串。
 */
export function countUp(value: string, t: number): string {
  const m = NUMBER.exec(value)
  if (!m || t >= 1) return value
  const sign = m[1]!
  const raw = m[2]!
  const decimals = raw.includes('.') ? raw.length - raw.indexOf('.') - 1 : 0
  const shown = (Number(raw) * easeOut(Math.max(0, t))).toFixed(decimals)
  // 顯示為 0 時不帶負號，避免出現 −0.0%
  const signed = Number(shown) === 0 ? shown : sign + shown
  return value.slice(0, m.index) + signed + value.slice(m.index + m[0].length)
}
