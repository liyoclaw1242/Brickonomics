import { chapterOfIndex } from '../tour/engine'
import type { Course, CoursePosition, Progress } from '../tour/types'

/** index＝章在課程裡的索引（也是時間軸上顯示的編號）；icon、name 照課程資料 */
export type ChapterState = { index: number; id: string; icon: string; name: string; state: 'done' | 'current' | 'todo'; clickable: boolean }

/**
 * 時間軸上目前課程每一章的狀態：done＝這門課已完成的章、current＝目前所在章、其餘 todo；
 * 解鎖自由玩後每章都能點。每門課的完成狀態分開記（完成初階不會讓中階的章變 done）。
 */
export function chapterStates(course: Course, pos: CoursePosition, progress: Progress): ChapterState[] {
  const here = pos.course === course.id ? chapterOfIndex(course.id, pos.index) : -1
  const done = progress.completed[course.id] ?? []
  return course.chapters.map((ch, index) => {
    const state = index === here ? 'current' : done.includes(ch.id) ? 'done' : 'todo'
    return { index, id: ch.id, icon: ch.icon, name: ch.name, state, clickable: progress.sandboxUnlocked || state !== 'todo' }
  })
}
