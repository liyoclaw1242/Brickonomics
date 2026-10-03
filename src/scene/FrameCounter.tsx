import { useFrame } from '@react-three/fiber'

type W = { __BCI_FRAMES__?: number }

/** 開發／測試用：統計實際渲染的幀數，用來驗證靜止時不重繪 */
export function FrameCounter() {
  useFrame(() => {
    const w = window as unknown as W
    w.__BCI_FRAMES__ = (w.__BCI_FRAMES__ ?? 0) + 1
  })
  return null
}
