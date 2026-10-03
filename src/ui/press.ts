export const LONG_PRESS_MS = 450
export const MOVE_TOLERANCE_PX = 8

/** 長按判斷：按下後移動不超過容許距離、且尚未放開 */
export class PressTracker {
  private sx = 0
  private sy = 0
  private moved = false
  private active = false

  start(x: number, y: number) {
    this.sx = x
    this.sy = y
    this.moved = false
    this.active = true
  }

  move(x: number, y: number) {
    if (this.active && Math.hypot(x - this.sx, y - this.sy) > MOVE_TOLERANCE_PX) this.moved = true
  }

  end() {
    this.active = false
  }

  canFire(): boolean {
    return this.active && !this.moved
  }
}
