import type { Level, Position, Progress } from '../tour/types'

export type ChapterState = { index: number; state: 'done' | 'current' | 'todo'; clickable: boolean }

/** 時間軸上每一章的狀態：done＝已完成、current＝目前所在章、其餘 todo；解鎖沙盒後每章都能點。 */
export function chapterStates(levels: readonly Level[], pos: Position, progress: Progress): ChapterState[] {
  return levels.map((l, index) => {
    const state = progress.completed.includes(l.id) ? 'done' : index === pos.level ? 'current' : 'todo'
    return { index, state, clickable: progress.sandboxUnlocked || state !== 'todo' }
  })
}
