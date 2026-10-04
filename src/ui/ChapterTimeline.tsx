import { useTour } from '../store/tour'
import { progressFraction } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { chapterStates } from './chapters'
import { T } from './strings'

/** 底部章節時間軸：7 章（圖示＋編號＋名稱）＋課程進度條。沙盒模式每章都能點，點了回到導覽該章。 */
export function ChapterTimeline() {
  const pos = useTour((s) => s.pos)
  const progress = useTour((s) => s.progress)
  const mode = useTour((s) => s.mode)
  const sandbox = mode === 'sandbox'
  const states = chapterStates(LEVELS, pos, { ...progress, sandboxUnlocked: progress.sandboxUnlocked || sandbox })
  const fraction = sandbox && progress.sandboxUnlocked ? 1 : progressFraction(LEVELS, pos)
  return (
    <nav className="timeline" aria-label={T.chaptersLabel}>
      <div className="timeline__chapters">
        {states.map((c) => {
          const ch = T.chapters[c.index]!
          const current = !sandbox && c.state === 'current'
          return (
            <button
              key={c.index}
              className={`timeline__chapter timeline__chapter--${c.state}`}
              disabled={!c.clickable}
              aria-current={current ? 'step' : undefined}
              aria-label={`${T.levelLabel(c.index)} ${ch.name}`}
              title={ch.name}
              onClick={() => useTour.getState().enterStep({ level: c.index, step: 0 })}
            >
              <span className="timeline__icon" aria-hidden="true">
                {ch.icon}
              </span>
              <span className="timeline__name">
                {String(c.index).padStart(2, '0')} {ch.name}
              </span>
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
