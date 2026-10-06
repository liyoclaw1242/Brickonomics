import { availableCourses } from '../../tour/courses'
import { stepsOf } from '../../tour/engine'
import type { CourseId } from '../../tour/types'
import { T } from '../strings'

/** 第一次來：先選一階。可上的課各一顆大按鈕（名稱＋一句白話＋步數），照建議順序排，第一顆最醒目；不鎖 */
export function CourseStart({ onChoose }: { onChoose: (id: CourseId) => void }) {
  return (
    <section className="course-start" aria-labelledby="course-start-title">
      <h1 className="step-title" id="course-start-title">
        {T.course.startTitle}
      </h1>
      {availableCourses().map((c, i) => (
        <button key={c.id} className={i === 0 ? 'course-start__choice course-start__choice--first' : 'course-start__choice'} onClick={() => onChoose(c.id)}>
          <span className="course-start__order">{c.standalone ? T.course.standalone : T.course.order(i)}</span>
          <span className="course-start__name">{c.name}</span>
          <span className="course-start__note">{T.course.note(c.tagline, stepsOf(c.id).length)}</span>
        </button>
      ))}
      <p className="hint">{T.course.later}</p>
      <p className="hint disclaimer">{T.disclaimer}</p>
    </section>
  )
}
