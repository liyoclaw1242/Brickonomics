import type { CSSProperties } from 'react'

/** drei <Html> 標籤的共用樣式；不攔截滑鼠 */
export const labelStyle: CSSProperties = {
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  fontSize: 12,
  padding: '1px 6px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  color: '#1f2933',
}
