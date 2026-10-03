/**
 * 輸入驗證政策：所有 sim 匯出函式在入口驗證數值參數，
 * 不合法就丟 RangeError，訊息以參數名稱開頭。
 * 經過 Universe（zod）的資料已驗證過；這裡擋的是呼叫端／UI 傳入的參數。
 */

export function finite(name: string, x: number): number {
  if (!Number.isFinite(x)) throw new RangeError(`${name} must be a finite number: ${x}`)
  return x
}

/** 有限數字且 min <= x <= max（max 預設不設上限） */
export function inRange(name: string, x: number, min: number, max = Infinity): number {
  finite(name, x)
  if (x < min || x > max) throw new RangeError(`${name} must be in [${min}, ${max}]: ${x}`)
  return x
}

export function nonNegInt(name: string, x: number): number {
  if (!Number.isInteger(x) || x < 0) throw new RangeError(`${name} must be a non-negative integer: ${x}`)
  return x
}

/** 費率／殖利率／配息率：有限，0 <= x < 1 */
export function rate(name: string, x: number): number {
  finite(name, x)
  if (x < 0 || x >= 1) throw new RangeError(`${name} must be in [0, 1): ${x}`)
  return x
}

/** 報酬率：有限，> -1（不會讓價值變成負的） */
export function returnRate(name: string, x: number): number {
  finite(name, x)
  if (x <= -1) throw new RangeError(`${name} must be > -1: ${x}`)
  return x
}
