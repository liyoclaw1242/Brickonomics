import { create } from 'zustand'
import { LEVELS } from '../tour/levels'
import { DEFAULT_VALUES, nextPosition, parseProgress, prevPosition, sandboxPatchFor, serializeProgress, stepAt } from '../tour/engine'
import type { Position, Progress, StageValues, Step, ValueKey } from '../tour/types'
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

export const VALUE_RANGES: Record<ValueKey, [number, number]> = {
  years: [0, 10],
  periods: [0, 20],
  phase: [0, 1],
  frontLoad: [0, 0.03],
}

type TourState = {
  mode: 'tour' | 'sandbox'
  pos: Position
  values: StageValues
  progress: Progress
  enterStep: (pos: Position) => void
  next: () => void
  prev: () => void
  enterSandbox: () => void
  restartTour: () => void
  setValue: (k: ValueKey, v: number) => void
}

export const useTour = create<TourState>()((set, get) => ({
  mode: 'tour',
  pos: { level: 0, step: 0 },
  values: { ...DEFAULT_VALUES },
  progress: { completed: [], sandboxUnlocked: false },
  enterStep: (pos) => {
    const step = stepAt(LEVELS, pos)
    useSandbox.getState().applyScene(sandboxPatchFor(step.scene))
    const progress = { ...get().progress, pos }
    saveProgress(progress)
    set({ mode: 'tour', pos, values: { ...DEFAULT_VALUES, ...step.scene.values }, progress })
  },
  next: () => {
    const { pos, progress } = get()
    const n = nextPosition(LEVELS, pos)
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
    const p = prevPosition(LEVELS, get().pos)
    if (p) get().enterStep(p)
  },
  enterSandbox: () => {
    useSandbox.getState().resetSandbox()
    set({ mode: 'sandbox' })
  },
  restartTour: () => get().enterStep({ level: 0, step: 0 }),
  setValue: (k, v) => {
    const [lo, hi] = VALUE_RANGES[k]
    const x = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
    set({ values: { ...get().values, [k]: x } })
  },
}))

export const currentStep = (s: { pos: Position }): Step => stepAt(LEVELS, s.pos)
