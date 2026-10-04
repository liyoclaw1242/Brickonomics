import { Color } from 'three'
import type { Theme } from '../theme'

export type Tone = 'vivid' | 'muted'

/** 優先順序：選取 > 導覽焦點 > 拆開（全部鮮豔）> 低飽和 */
export function groupTone(p: { group: number; focus: readonly number[]; picked: number | null; explode: number }): Tone {
  if (p.picked !== null) return p.group === p.picked ? 'vivid' : 'muted'
  if (p.focus.length > 0) return p.focus.includes(p.group) ? 'vivid' : 'muted'
  if (p.explode > 0.3) return 'vivid'
  return 'muted'
}

export function toneColor(hex: string, tone: Tone, theme: Theme): string {
  const c = new Color(hex)
  if (tone === 'vivid') {
    if (theme.tone.vividBoost === 1) return hex
    c.multiplyScalar(theme.tone.vividBoost)
    return `#${c.getHexString()}`
  }
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s * theme.tone.mutedSaturation, Math.min(1, Math.max(0, hsl.l + theme.tone.mutedLightness)))
  return `#${c.getHexString()}`
}

export const TONE_FADE_SEC = 0.4
/** 0→1 的漸變進度，smoothstep。 */
export function toneProgress(elapsedSec: number): number {
  const t = Math.min(1, Math.max(0, elapsedSec / TONE_FADE_SEC))
  return t * t * (3 - 2 * t)
}
