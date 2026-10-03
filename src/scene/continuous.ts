/**
 * 「持續繪製需求」登錄（純 TS）。
 * 任何需要每幀重繪的東西（動畫、鏡頭移動）呼叫 acquire()，結束時呼叫回傳的 release。
 * FpsGuard 只在 isContinuous() 為 true 的連續幀上取樣，閒置空檔不會被當成卡頓。
 */
let count = 0

export function acquire(): () => void {
  count += 1
  let released = false
  return () => {
    if (released) return
    released = true
    count -= 1
  }
}

export function isContinuous(): boolean {
  return count > 0
}
