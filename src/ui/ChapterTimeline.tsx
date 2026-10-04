import { useTour } from '../store/tour'
import { courseById, progressFractionCourse } from '../tour/engine'
import { chapterStates } from './chapters'
import { T } from './strings'

/**
 * 底部章節時間軸：目前課程的章（圖示＋編號＋名稱）＋課內進度條。沙盒模式每章都能點，點了回到導覽該章的第一步。
 * 還沒選課（開場卡）時不顯示。
 */
export function ChapterTimeline() {
  const pos = useTour((s) => s.pos)
  const progress = useTour((s) => s.progress)
  const mode = useTour((s) => s.mode)
  const course = useTour((s) => s.course)
  if (course === null) return null
  const sandbox = mode === 'sandbox'
  const states = chapterStates(courseById(course), pos, { ...progress, sandboxUnlocked: progress.sandboxUnlocked || sandbox })
  const fraction = sandbox && progress.finished.includes(course) ? 1 : progressFractionCourse(pos)
  return (
    <nav className="timeline" aria-label={T.chaptersLabel}>
      <div className="timeline__chapters">
        {states.map((c) => {
          const current = !sandbox && c.state === 'current'
          return (
            <button
              key={c.id}
              className={`timeline__chapter timeline__chapter--${c.state}`}
              disabled={!c.clickable}
              aria-current={current ? 'step' : undefined}
              // 無障礙名稱＝看得到的「編號 名稱」（WCAG 2.5.3）；窄畫面只剩圖示時仍念得出章名
              aria-label={T.chapterName(c.index, c.name)}
              title={c.name}
              onClick={() => useTour.getState().enterChapter(c.index)}
            >
              <span className="timeline__icon" aria-hidden="true">
                {c.icon}
              </span>
              <span className="timeline__name">{T.chapterName(c.index, c.name)}</span>
            </button>
          )
        })}
      </div>
      <div className="timeline__bar" role="progressbar" aria-label={T.progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
        <span style={{ width: `${fraction * 100}%` }} />
      </div>
    </nav>
  )
}
