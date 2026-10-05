import { Color } from 'three'
import type { Theme } from '../theme'

export type Tone = 'vivid' | 'muted'

/** 優先順序：選取 > 導覽焦點 > 拆開或切開（全部鮮豔，切面看得到真正的地層顏色）> 低飽和 */
export function groupTone(p: { group: number; focus: readonly number[]; picked: number | null; explode: number; cut?: boolean }): Tone {
  if (p.picked !== null) return p.group === p.picked ? 'vivid' : 'muted'
  if (p.focus.length > 0) return p.focus.includes(p.group) ? 'vivid' : 'muted'
  if (p.explode > 0.3 || p.cut) return 'vivid'
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

/** 背景城市往背景色（海）混多少（cityDim 的教學步驟） */
export const CITY_FADE = 0.6

/**
 * 背景城市（cityDim）：先照 muted 降飽和，再往背景色（主題的海）混 CITY_FADE，
 * 教具在前面才跳得出來（mid-r1：f-2、f-3、f-4、f-8、e-4、c-3 的教具和後面的大樓擠在一起）
 */
export function fadedColor(hex: string, theme: Theme): string {
  const c = new Color(toneColor(hex, 'muted', theme))
  c.lerp(new Color(theme.sea), CITY_FADE)
  return `#${c.getHexString()}`
}

export const TONE_FADE_SEC = 0.4
/** 0→1 的漸變進度，smoothstep。 */
export function toneProgress(elapsedSec: number): number {
  const t = Math.min(1, Math.max(0, elapsedSec / TONE_FADE_SEC))
  return t * t * (3 - 2 * t)
}
