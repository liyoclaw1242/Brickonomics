import { useMemo, useState } from 'react'
import { universe } from '../data'
import { LEVELS, ROUTES } from '../tour/levels'
import type { Route } from '../tour/types'
import { colorForKey } from '../scene/palette'
import { parseEmphasis } from './emphasis'
import { fallbackLevels } from './fallback'
import { MarkIcon } from './MarkIcon'
import { markPlacement } from './marks'
import { T } from './strings'
import './ui.css'

/** 一句話：關鍵詞粗體；有顏色鍵的再加同色底線（白天主題也看得清楚） */
function Line({ line }: { line: string }) {
  return (
    <p className="fallback__line">
      {parseEmphasis(line).map((seg, i) => {
        if (!seg.em) return <span key={i}>{seg.text}</span>
        const color = seg.key ? colorForKey(universe, seg.key) : undefined
        const style = color ? { textDecorationLine: 'underline', textDecorationColor: color, textDecorationThickness: 3, textUnderlineOffset: 4 } : undefined
        return (
          <strong key={i} style={style}>
            {seg.text}
          </strong>
        )
      })}
    </p>
  )
}

/** 文字版：預設完整版；上方兩顆按鈕可換成簡單版（只留簡單版的步驟） */
export function FallbackApp() {
  const [route, setRoute] = useState<Route>('full')
  const levels = useMemo(() => fallbackLevels(LEVELS, universe, ROUTES[route]), [route])
  return (
    <main className="fallback" data-levels={levels.length}>
      <h1>{T.appTitle}</h1>
      <p className="hint">{T.fallbackIntro}</p>
      <div className="fallback__routes" role="group" aria-label={T.route.switchLabel}>
        {(['simple', 'full'] as const).map((r) => (
          <button key={r} className="pill" aria-pressed={route === r} onClick={() => setRoute(r)}>
            {T.route.names[r]}
          </button>
        ))}
      </div>
      {levels.map((l) => (
        <section key={l.label} className="fallback__level">
          <h2>{l.title ? `${l.label}・${l.title}` : l.label}</h2>
          <ol>
            {l.steps.map((s) => (
              <li key={s.id}>
                <h3 className="fallback__title">
                  {s.title}
                  {markPlacement(s.marks).title.map((k) => (
                    <MarkIcon key={k} kind={k} />
                  ))}
                </h3>
                <Line line={s.line} />
                {/* ？ 資料待更新：放在一句話後面（和 3D 版一致） */}
                {markPlacement(s.marks).afterLine.length > 0 && (
                  <p className="step-marks-after">
                    {markPlacement(s.marks).afterLine.map((k) => (
                      <MarkIcon key={k} kind={k} />
                    ))}
                  </p>
                )}
                {/* 回顧不用 li：e2e 以 li 數步驟 */}
                {s.recap && (
                  <div className="recap" role="list" aria-label={T.recapLabel}>
                    {s.recap.map((r) => (
                      <p key={r.text} role="listitem">
                        <span className="recap__icon" aria-hidden="true">
                          {r.icon}
                        </span>
                        {r.text}
                      </p>
                    ))}
                  </div>
                )}
                <details className="fallback__more">
                  <summary>{T.more}</summary>
                  <p>{s.more}</p>
                </details>
                {s.rows.length > 0 && (
                  <table className="readout">
                    <tbody>
                      {s.rows.map((r, i) => (
                        <tr key={`${r.label}-${i}`}>
                          <th scope="row">
                            {r.label}
                            {r.marks?.map((k) => <MarkIcon key={k} kind={k} />)}
                            {r.note && <small className="readout__note">{r.note}</small>}
                          </th>
                          <td>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  )
}
