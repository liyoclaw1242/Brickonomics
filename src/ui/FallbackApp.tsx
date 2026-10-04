import { useMemo } from 'react'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { colorForKey } from '../scene/palette'
import { parseEmphasis } from './emphasis'
import { fallbackLevels } from './fallback'
import { MarkIcon } from './MarkIcon'
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

export function FallbackApp() {
  const levels = useMemo(() => fallbackLevels(LEVELS, universe), [])
  return (
    <main className="fallback" data-levels={levels.length}>
      <h1>{T.appTitle}</h1>
      <p className="hint">{T.fallbackIntro}</p>
      {levels.map((l) => (
        <section key={l.title} className="fallback__level">
          <h2>
            {l.label}・{l.title}
          </h2>
          <ol>
            {l.steps.map((s) => (
              <li key={s.id}>
                <h3 className="fallback__title">
                  {s.title}
                  {s.mark && <MarkIcon kind={s.mark} />}
                </h3>
                <Line line={s.line} />
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
