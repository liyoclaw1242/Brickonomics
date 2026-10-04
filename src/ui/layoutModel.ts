/**
 * 唯一的版面模型：UI 蓋住畫面的哪些地方（insets），ViewFraming 用它把 3D 場景框進剩下的可視區。
 * MOBILE_MAX 必須與 ui.css 的 `@media (max-width: 720px)` 一致；PANEL_WIDTH 必須與 ui.css 的 --panel-w 一致。
 */
export const MOBILE_MAX = 720
/** 桌機左側面板寬度（px） */
export const PANEL_WIDTH = 312
/** 手機底部抽屜佔畫面高度的比例（ui.css 的 42vh） */
const DRAWER_FRACTION = 0.42

export type Insets = { top: number; right: number; bottom: number; left: number }
export type Layout = { mobile: boolean; insets: Insets }

export function layoutModel(w: number, h: number): Layout {
  if (w <= MOBILE_MAX) {
    // 上：工具列；下：抽屜＋浮在抽屜上方的時間軸
    return { mobile: true, insets: { top: 56, right: 0, bottom: Math.round(h * DRAWER_FRACTION) + 40, left: 0 } }
  }
  // 上：工具列；左：面板＋間距；下：時間軸
  return { mobile: false, insets: { top: 64, right: 0, bottom: 76, left: PANEL_WIDTH + 24 } }
}

/** 場景在 zoom 1 時大約是「高 h、寬 h / 0.85」的框（舊規則：寬高比低於 0.85 才縮小）。 */
const SCENE_ASPECT = 0.85

/**
 * camera.setViewOffset 的位移與 camera.zoom：
 * - 位移把畫面中心移到可視區中心（內容往右 (left−right)/2、往下 (top−bottom)/2，setViewOffset 取負號）
 * - zoom 讓整個場景框塞進扣掉 insets 後的可視區（高與寬各自的限制取小，最大 1）
 */
export function viewFraming(w: number, h: number): { offsetX: number; offsetY: number; zoom: number } {
  const { insets } = layoutModel(w, h)
  const availW = Math.max(1, w - insets.left - insets.right)
  const availH = Math.max(1, h - insets.top - insets.bottom)
  const zoom = Math.min(1, availH / h, (availW * SCENE_ASPECT) / h)
  return { offsetX: (insets.right - insets.left) / 2, offsetY: (insets.bottom - insets.top) / 2, zoom }
}
