import { create } from 'zustand'
import {
  chapterOfIndex, controlRange, courseById, DEFAULT_RANGES, DEFAULT_VALUES, emptyProgress, firstIndexOfChapter, nextCourse, nextIndex, parseProgress, prevIndex,
  resumeInCourse, sandboxPatchFor, serializeProgress, stepAtCourse,
} from '../tour/engine'
import type { CourseId, CoursePosition, Progress, StageValues, Step, ValueKey } from '../tour/types'
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
  tick: DEFAULT_RANGES.tick,
  rate: DEFAULT_RANGES.rate,
  months: DEFAULT_RANGES.months,
  rebal: DEFAULT_RANGES.rebal,
  hedgeCase: DEFAULT_RANGES.hedgeCase,
  trades: DEFAULT_RANGES.trades,
  bondPct: DEFAULT_RANGES.bondPct,
}

type TourState = {
  mode: 'tour' | 'sandbox'
  /**
   * 目前的課；null＝第一次來、還沒選（面板顯示開場卡，背景照初階第一步）。
   * 和 progress.course 是同一件事（progress 是存檔用的那份）：選了課之後只由 enterStep 同時寫兩邊；
   * chooseCourse／switchCourse 先把 course 設成非 null，enterStep 才知道「已選課、可以存」。
   */
  course: CourseId | null
  pos: CoursePosition
  values: StageValues
  progress: Progress
  /** 進入課程裡的某一步（換課也走這裡） */
  enterStep: (pos: CoursePosition) => void
  /** 目前課程裡的第 index 步 */
  enterIndex: (index: number) => void
  /** 目前課程某一章的第一步（時間軸用） */
  enterChapter: (chapter: number) => void
  next: () => void
  prev: () => void
  enterSandbox: () => void
  /** 從目前課程第一步重來（還沒選課時回到開場卡） */
  restartCourse: () => void
  /** 開場卡：選一門課，從第一步開始 */
  chooseCourse: (id: CourseId) => void
  /** 換階：那門課還沒上完、記得停在哪就回到那一步，否則第一步 */
  switchCourse: (id: CourseId) => void
  /** 結尾步的「下一階」：記下這門課上完，然後進下一門課（沒有可上的就去自由玩） */
  goNextCourse: () => void
  setValue: (k: ValueKey, v: number) => void
}

/** 記下目前這章完成；finish＝整門課上完（同時解鎖自由玩） */
function markDone(p: Progress, pos: CoursePosition, finish: boolean): Progress {
  const ch = courseById(pos.course).chapters[chapterOfIndex(pos.course, pos.index)]
  let out = p
  const done = out.completed[pos.course]
  if (ch && !done.includes(ch.id)) out = { ...out, completed: { ...out.completed, [pos.course]: [...done, ch.id] } }
  if (finish) {
    if (!out.finished.includes(pos.course)) out = { ...out, finished: [...out.finished, pos.course] }
    if (!out.sandboxUnlocked) out = { ...out, sandboxUnlocked: true }
  }
  return out
}

export const useTour = create<TourState>()((set, get) => ({
  mode: 'tour',
  course: 'beginner',
  pos: { course: 'beginner', index: 0 },
  values: { ...DEFAULT_VALUES },
  progress: emptyProgress(),
  enterStep: (pos) => {
    const step = stepAtCourse(pos)
    useSandbox.getState().applyScene(sandboxPatchFor(step.scene))
    // 還沒選課（開場卡還在）就不存：不然下次來會被當成舊使用者、不再問
    const chosen = get().course !== null
    const prev = get().progress
    const progress = chosen ? { ...prev, course: pos.course, stepId: step.id, lastStep: { ...prev.lastStep, [pos.course]: step.id } } : prev
    if (chosen) saveProgress(progress)
    set({ mode: 'tour', pos, ...(chosen ? { course: pos.course } : {}), values: { ...DEFAULT_VALUES, ...step.scene.values }, progress })
  },
  enterIndex: (index) => get().enterStep({ course: get().pos.course, index }),
  enterChapter: (chapter) => {
    const i = firstIndexOfChapter(get().pos.course, chapter)
    if (i !== null) get().enterIndex(i)
  },
  next: () => {
    const { pos, progress } = get()
    const n = nextIndex(pos)
    const p = n === null || chapterOfIndex(pos.course, n) !== chapterOfIndex(pos.course, pos.index) ? markDone(progress, pos, n === null) : progress
    if (p !== progress) {
      saveProgress(p)
      set({ progress: p })
    }
    if (n !== null) get().enterIndex(n)
    else get().enterSandbox()
  },
  prev: () => {
    const i = prevIndex(get().pos)
    if (i !== null) get().enterIndex(i)
  },
  enterSandbox: () => {
    useSandbox.getState().resetSandbox()
    set({ mode: 'sandbox' })
  },
  restartCourse: () => {
    if (get().course === null) {
      // 還沒選過課：回到開場卡
      set({ mode: 'tour' })
      return
    }
    get().enterStep({ course: get().pos.course, index: 0 })
  },
  chooseCourse: (id) => {
    set({ course: id })
    get().enterStep({ course: id, index: 0 })
  },
  switchCourse: (id) => {
    set({ course: id })
    get().enterStep(resumeInCourse(get().progress, id))
  },
  goNextCourse: () => {
    const { pos, progress } = get()
    const p = markDone(progress, pos, true)
    if (p !== progress) {
      saveProgress(p)
      set({ progress: p })
    }
    const to = nextCourse(pos.course)
    if (to) get().chooseCourse(to)
    else get().enterSandbox()
  },
  setValue: (k, v) => {
    // 導覽模式依目前步驟的範圍（例如 s-6 的時間軸停在配發那一刻）
    const [lo, hi] = get().mode === 'tour' ? controlRange(stepAtCourse(get().pos), k) : VALUE_RANGES[k]
    const x = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
    set({ values: { ...get().values, [k]: x } })
  },
}))

export const currentStep = (s: { pos: CoursePosition }): Step => stepAtCourse(s.pos)
