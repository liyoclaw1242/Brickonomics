import type { ResearchCard } from '../../tour/types'
import { MarkIcon } from '../MarkIcon'
import { T } from '../strings'

/** 研究數據卡（a-dt）：每列一個大一點的數字＋一句白話；最下面一行出處。沒查證的數字旁邊標 ？ */
export function ResearchCardView({ card }: { card: ResearchCard }) {
  return (
    <section className="research" aria-label={T.research.title}>
      <p className="research__title">{T.research.title}</p>
      {/* 不用 ul／li：文字版的 e2e 以 li 數步驟 */}
      <div className="research__rows" role="list">
        {card.rows.map((r) => (
          <div key={r.text} role="listitem">
            <span className="research__value">
              {r.value}
              {r.mark && <MarkIcon kind={r.mark} />}
            </span>
            <span className="research__text">
              {r.text}
              {r.source && <small className="research__source">{r.source}</small>}
            </span>
          </div>
        ))}
      </div>
      <p className="research__cite">{T.research.source(card.cite)}</p>
    </section>
  )
}
