export type Segment = { text: string; em: boolean; key?: string }

/** `**詞**` 強調；`**詞|鍵**` 強調並用「鍵」對應的物體顏色（3b1b 顏色連結）。 */
export function parseEmphasis(line: string): Segment[] {
  return line
    .split('**')
    .map((raw, i): Segment => {
      if (i % 2 === 0) return { text: raw, em: false }
      const bar = raw.indexOf('|')
      return bar < 0 ? { text: raw, em: true } : { text: raw.slice(0, bar), em: true, key: raw.slice(bar + 1) }
    })
    .filter((s) => s.text.length > 0)
}

export function stripMarkup(line: string): string {
  return parseEmphasis(line).map((s) => s.text).join('')
}

export function visibleLength(line: string): number {
  return Array.from(stripMarkup(line)).length
}
