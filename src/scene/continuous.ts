/**
 * 「持續繪製需求」登錄（純 TS）。
 * 任何需要每幀重繪的東西（動畫、鏡頭移動）呼叫 acquire()，結束時呼叫回傳的 release。
 * FpsGuard 只在 isContinuous() 為 true 的連續幀上取樣，閒置空檔不會被當成卡頓。
 */
let count = 0
let epoch = 0

export function acquire(): () => void {
  count += 1
  let released = false
  return () => {
    if (released) return
    released = true
    count -= 1
    if (count === 0) epoch += 1
  }
}

export function isContinuous(): boolean {
  return count > 0
}

/** 每次登記數歸零就 +1：用來發現「上一幀之後曾經閒置過」（FpsGuard 的 useFrame 可能早於釋放者執行） */
export function idleEpoch(): number {
  return epoch
}

export type FrameMark = { continuous: boolean; epoch: number }

/** 這一幀的 dt 能否納入取樣：上一幀是持續繪製，且從那之後沒有歸零過 */
export function shouldSample(prev: FrameMark, nowEpoch: number): boolean {
  return prev.continuous && prev.epoch === nowEpoch
}
