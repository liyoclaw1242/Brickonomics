import { create } from 'zustand'
import { LEVELS, ROUTES } from '../tour/levels'
import { controlRange, DEFAULT_RANGES, DEFAULT_VALUES, firstPosition, nextPosition, parseProgress, prevPosition, sandboxPatchFor, serializeProgress, snapToRoute, stepAt } from '../tour/engine'
import type { Position, Progress, Route, RouteIds, StageValues, Step, ValueKey } from '../tour/types'
import { useSandbox } from './sandbox'

const STORAGE_KEY = 'block-city-invest:progress'

/** 讀取進度；localStorage 不可用（隱私模式、測試環境）時回傳空進度 */
export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(STORAGE_KEY))
  } catch {
    return parseProgress(null)
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProgress(p))
  } catch {
    // 無法保存就算了：進度只是方便功能
  }
}

/** 拉桿的預設範圍（沙盒與沒有指定範圍的步驟） */
export const VALUE_RANGES: Record<ValueKey, [number, number]> = {
  years: DEFAULT_RANGES.years,
  periods: DEFAULT_RANGES.periods,
  phase: DEFAULT_RANGES.phase,
  frontLoad: DEFAULT_RANGES.frontLoad,
}

type TourState = {
  mode: 'tour' | 'sandbox'
  /** 走哪條路線；null＝第一次來、還沒選（面板顯示開始卡片，導覽照完整版算） */
  route: Route | null
  pos: Position
  values: StageValues
  progress: Progress
  enterStep: (pos: Position) => void
  next: () => void
  prev: () => void
  enterSandbox: () => void
  restartTour: () => void
  /** 開始卡片：選一條路線，從那條路線的第一步開始 */
  chooseRoute: (r: Route) => void
  /** 工具列切換路線：停在新路線裡「這一步或它之前」最近的一步 */
  setRoute: (r: Route) => void
  setValue: (k: ValueKey, v: number) => void
}

export const useTour = create<TourState>()((set, get) => ({
  mode: 'tour',
  route: 'full',
  pos: { level: 0, step: 0 },
  values: { ...DEFAULT_VALUES },
  progress: { completed: [], sandboxUnlocked: false },
  enterStep: (pos) => {
    const step = stepAt(LEVELS, pos)
    useSandbox.getState().applyScene(sandboxPatchFor(step.scene))
    const progress = { ...get().progress, pos, stepId: step.id }
    // 還沒選路線（開始卡片還在）就不存：不然下次來會被當成舊使用者、不再問
    if (get().route !== null) saveProgress(progress)
    set({ mode: 'tour', pos, values: { ...DEFAULT_VALUES, ...step.scene.values }, progress })
  },
  next: () => {
    const { pos, progress } = get()
    const n = nextPosition(LEVELS, pos, routeIds(get().route))
    let p = progress
    if (!n || n.level !== pos.level) {
      const id = LEVELS[pos.level]!.id
      if (!p.completed.includes(id)) p = { ...p, completed: [...p.completed, id] }
    }
    if (!n) p = { ...p, sandboxUnlocked: true }
    if (p !== progress) {
      saveProgress(p)
      set({ progress: p })
    }
    if (n) get().enterStep(n)
    else get().enterSandbox()
  },
  prev: () => {
    const p = prevPosition(LEVELS, get().pos, routeIds(get().route))
    if (p) get().enterStep(p)
  },
  enterSandbox: () => {
    useSandbox.getState().resetSandbox()
    set({ mode: 'sandbox' })
  },
  restartTour: () => get().enterStep(firstPosition(LEVELS, routeIds(get().route))),
  chooseRoute: (r) => {
    set({ route: r, progress: { ...get().progress, route: r } })
    get().enterStep(firstPosition(LEVELS, ROUTES[r]))
  },
  setRoute: (r) => {
    set({ route: r, progress: { ...get().progress, route: r } })
    if (get().mode === 'tour') get().enterStep(snapToRoute(LEVELS, get().pos, ROUTES[r]))
    else saveProgress(get().progress)
  },
  setValue: (k, v) => {
    // 導覽模式依目前步驟的範圍（例如 s-6 的時間軸停在配發那一刻）
    const [lo, hi] = get().mode === 'tour' ? controlRange(stepAt(LEVELS, get().pos), k) : VALUE_RANGES[k]
    const x = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
    set({ values: { ...get().values, [k]: x } })
  },
}))

/** 路線的步驟 id；還沒選路線時照完整版 */
export const routeIds = (r: Route | null): RouteIds => ROUTES[r ?? 'full']

export const currentStep = (s: { pos: Position }): Step => stepAt(LEVELS, s.pos)
