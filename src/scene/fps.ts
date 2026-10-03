/**
 * 幀率取樣器（純 TS）。
 * frameloop="demand" 下，閒置後的第一幀 dt 會很大；超過 maxGap 的 dt 視為閒置空檔，
 * 直接捨棄目前這一段，避免把「沒在畫」誤判成「畫得慢」。
 */
export class FpsSampler {
  private readonly maxGap: number
  private readonly window: number
  private readonly minFps: number
  private frames = 0
  private time = 0

  constructor(opts: { maxGap?: number; window?: number; minFps?: number } = {}) {
    this.maxGap = opts.maxGap ?? 0.1
    this.window = opts.window ?? 1.5
    this.minFps = opts.minFps ?? 30
  }

  /** 回傳 true 表示這一段連續幀的平均 fps 過低，應降級 */
  push(dt: number): boolean {
    if (!(dt > 0)) return false
    if (dt > this.maxGap) {
      this.frames = 0
      this.time = 0
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
