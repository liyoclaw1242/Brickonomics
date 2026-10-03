import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'

/** 把畫面中心移到「沒被 UI 面板蓋住」的區域：桌機左側面板約 312px；手機底部抽屜約 42vh。 */
export function ViewFraming() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const { width, height } = size
    const mobile = window.matchMedia('(max-width: 720px)').matches
    const dx = mobile ? 0 : 156
    const dy = mobile ? height * 0.21 : 0
    // 直式畫面太窄時縮小，讓兩座島都進得了畫面
    camera.zoom = Math.min(1, (width / height) * (mobile ? 0.85 : 1.1))
    camera.setViewOffset(width, height, -dx, dy, width, height)
    camera.updateProjectionMatrix()
    return () => {
      camera.clearViewOffset()
      camera.zoom = 1
      camera.updateProjectionMatrix()
    }
  }, [camera, size])
  return null
}
