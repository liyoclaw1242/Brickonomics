import { useFrame } from '@react-three/fiber'
import type { Light } from 'three'

type W = { __BCI_FRAMES__?: number; __BCI_LIGHTS__?: number }

/** 開發／測試用：統計實際渲染的幀數（驗證靜止時不重繪）、場景裡的燈數（驗證事件不會改變燈數、不會讓材質重新編譯） */
export function FrameCounter() {
  useFrame(({ scene }) => {
    const w = window as unknown as W
    w.__BCI_FRAMES__ = (w.__BCI_FRAMES__ ?? 0) + 1
    let lights = 0
    scene.traverse((o) => {
      if ((o as Light).isLight) lights++
    })
    w.__BCI_LIGHTS__ = lights
  })
  return null
}
