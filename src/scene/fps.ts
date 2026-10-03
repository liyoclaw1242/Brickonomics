/**
 * 幀率取樣器（純 TS）。
 * 閒置空檔由 continuous 登錄排除（FpsGuard 只在持續繪製時取樣、否則 reset）；
 * maxGap（預設 2 秒）只是最後防線：單一幀超過它就視為被暫停（例如分頁在背景），捨棄目前這一段。
 */
export class FpsSampler {
  private readonly maxGap: number
  private readonly window: number
  private readonly minFps: number
  private frames = 0
  private time = 0

  constructor(opts: { maxGap?: number; window?: number; minFps?: number } = {}) {
    this.maxGap = opts.maxGap ?? 2
    this.window = opts.window ?? 1.5
    this.minFps = opts.minFps ?? 30
  }

  /** 捨棄目前累積的這一段（中斷連續繪製時呼叫） */
  reset(): void {
    this.frames = 0
    this.time = 0
  }

  /** 回傳 true 表示這一段連續幀的平均 fps 過低，應降級 */
  push(dt: number): boolean {
    if (!(dt > 0)) return false
    if (dt > this.maxGap) {
      this.reset()
      return false
    }
    this.frames += 1
    this.time += dt
    // 容許浮點累加誤差（30 × 0.05 可能是 1.4999999999999998）
    if (this.time < this.window - 1e-9) return false
    const fps = this.frames / this.time
    this.frames = 0
    this.time = 0
    return fps < this.minFps
  }
}
