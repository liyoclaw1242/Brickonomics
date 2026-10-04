import { parseEmphasis } from '../emphasis'

/** 一句話：`**詞**` 用 --em；`**詞|鍵**` 用該鍵對應物體的顏色（3b1b 顏色連結）。顯示後每段間隔 80ms 依序淡入。 */
export function OneLine({ line, colorOf }: { line: string; colorOf: (key: string) => string | undefined }) {
  return (
    <p className="oneline">
      {parseEmphasis(line).map((s, i) => {
        const delay = { animationDelay: `${i * 80}ms` }
        if (!s.em) return <span key={i} style={delay}>{s.text}</span>
        const color = s.key ? colorOf(s.key) : undefined
        return (
          <strong key={i} style={color ? { ...delay, color } : delay}>
            {s.text}
          </strong>
        )
      })}
    </p>
  )
}
