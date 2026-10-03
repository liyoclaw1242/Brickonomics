import type { CSSProperties } from 'react'

/** drei <Html> 標籤的共用樣式；不攔截滑鼠 */
export const labelStyle: CSSProperties = {
  pointerEvents: 'none',
  width: 'max-content',
  maxWidth: 'calc(190px * var(--label-scale, 1))',
  textAlign: 'center',
  fontSize: 'calc(12px * var(--label-scale, 1))',
  padding: '1px calc(6px * var(--label-scale, 1))',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  color: '#1f2933',
}
