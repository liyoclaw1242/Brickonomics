import { routeIds, useTour } from '../store/tour'
import { firstInLevel, progressFraction } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { chapterStates } from './chapters'
import { T } from './strings'

/**
 * 底部章節時間軸：路線裡有的章（圖示＋編號＋名稱）＋課程進度條。沙盒模式每章都能點，點了回到導覽該章在路線裡的第一步。
 * 簡單版的地底章只剩最後的回顧，叫「完成」。還沒選路線（開始卡片）時不顯示。
 */
export function ChapterTimeline() {
  const pos = useTour((s) => s.pos)
  const progress = useTour((s) => s.progress)
  const mode = useTour((s) => s.mode)
  const route = useTour((s) => s.route)
  if (route === null) return null
  const ids = routeIds(route)
  const sandbox = mode === 'sandbox'
  const states = chapterStates(LEVELS, pos, { ...progress, sandboxUnlocked: progress.sandboxUnlocked || sandbox }, ids)
  const fraction = sandbox && progress.sandboxUnlocked ? 1 : progressFraction(LEVELS, pos, ids)
  return (
    <nav className="timeline" aria-label={T.chaptersLabel}>
      <div className="timeline__chapters">
        {states.map((c) => {
          const ch = c.finish ? T.finishChapter : T.chapters[c.index]!
          const current = !sandbox && c.state === 'current'
          const target = firstInLevel(LEVELS, c.index, ids)
          return (
            <button
              key={c.index}
              className={`timeline__chapter timeline__chapter--${c.state}`}
              disabled={!c.clickable}
              aria-current={current ? 'step' : undefined}
              // 無障礙名稱＝看得到的「編號 名稱」（WCAG 2.5.3）；窄畫面只剩圖示時仍念得出章名
              aria-label={T.chapterName(c.number, ch.name)}
              title={ch.name}
              onClick={() => target && useTour.getState().enterStep(target)}
            >
              <span className="timeline__icon" aria-hidden="true">
                {ch.icon}
              </span>
              <span className="timeline__name">{T.chapterName(c.number, ch.name)}</span>
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
