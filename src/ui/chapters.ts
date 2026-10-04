import type { Level, Position, Progress, RouteIds } from '../tour/types'

/**
 * index＝課程裡的章（LEVELS 索引）；number＝時間軸上顯示的編號（只數路線裡有的章）；
 * finish＝這章在路線裡只剩最後的回顧那一步（簡單版的地底章），時間軸改叫「完成」。
 */
export type ChapterState = { index: number; number: number; state: 'done' | 'current' | 'todo'; clickable: boolean; finish: boolean }

/** 時間軸上每一章的狀態：done＝已完成、current＝目前所在章、其餘 todo；解鎖沙盒後每章都能點。ids＝路線（null＝全部章）。 */
export function chapterStates(levels: readonly Level[], pos: Position, progress: Progress, ids?: RouteIds): ChapterState[] {
  const out: ChapterState[] = []
  levels.forEach((l, index) => {
    const steps = l.steps.filter((s) => !ids || ids.includes(s.id))
    if (steps.length === 0) return
    const state = index === pos.level ? 'current' : progress.completed.includes(l.id) ? 'done' : 'todo'
    const finish = steps.length < l.steps.length && steps.every((s) => s.recap !== undefined)
    out.push({ index, number: out.length, state, clickable: progress.sandboxUnlocked || state !== 'todo', finish })
  })
  return out
}
