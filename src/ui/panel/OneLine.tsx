import type { CSSProperties } from 'react'
import { parseEmphasis } from '../emphasis'

/** 一句話：`**詞**` 用 --em；`**詞|鍵**` 用該鍵對應物體的顏色（3b1b 顏色連結）。顯示後每段間隔 80ms 依序淡入。 */
export function OneLine({ line, colorOf }: { line: string; colorOf: (key: string) => string | undefined }) {
  return (
    <p className="oneline">
      {parseEmphasis(line).map((s, i) => {
        const delay = { animationDelay: `${i * 80}ms` }
        if (!s.em) return <span key={i} style={delay}>{s.text}</span>
        const color = s.key ? colorOf(s.key) : undefined
        // 顏色放在 --key：白天主題由 CSS 把淺色（如金幣黃）調深並加同色底線，避免白底上看不清
        const style: CSSProperties = color ? ({ ...delay, '--key': color } as CSSProperties) : delay
        return (
          <strong key={i} className={color ? 'em-key' : undefined} style={style}>
            {s.text}
          </strong>
        )
      })}
    </p>
  )
}
