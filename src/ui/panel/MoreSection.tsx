import type { ReadoutRow } from '../readout'
import { MarkIcon } from '../MarkIcon'
import { T } from '../strings'

/** 多說一點：預設收起，收原本的課文與即時數字表（表格不用 aria-live，避免拖拉桿時一直朗讀） */
export function MoreSection({ more, rows, refs }: { more: string; rows: readonly ReadoutRow[]; refs?: readonly { citation: string; doi: string }[] }) {
  return (
    <details className="more">
      <summary>{T.more}</summary>
      <p className="more__text">{more}</p>
      {/* 研究的完整出處（論文名稱＋DOI） */}
      {refs && refs.length > 0 && (
        <ol className="more__refs" aria-label={T.research.refs}>
          {refs.map((r) => (
            <li key={r.doi}>
              {r.citation} <a href={r.doi} target="_blank" rel="noreferrer">{r.doi}</a>
            </li>
          ))}
        </ol>
      )}
      {rows.length > 0 && (
        <table className="readout" aria-live="off">
          <caption>{T.readout.title}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
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
    </details>
  )
}
