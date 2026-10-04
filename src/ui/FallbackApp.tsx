import { useMemo } from 'react'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { fallbackLevels } from './fallback'
import { MarkIcon } from './MarkIcon'
import { T } from './strings'
import './ui.css'

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
                <p>{s.text}</p>
                {s.rows.length > 0 && (
                  <table className="readout">
                    <tbody>
                      {s.rows.map((r, i) => (
                        <tr key={`${r.label}-${i}`}>
                          <th scope="row">
                            {r.label}
                            {r.mark && <MarkIcon kind={r.mark} />}
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
