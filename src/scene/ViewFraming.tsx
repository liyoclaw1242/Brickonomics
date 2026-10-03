import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import { PANEL_GUTTER, PANEL_WIDTH } from '../ui/layout'

/** 把畫面中心移到「沒被 UI 面板蓋住」的區域：桌機左側面板（寬度見 ui/layout.ts）；手機底部抽屜約 42vh。 */
export function ViewFraming() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const { width, height } = size
    const mobile = window.matchMedia('(max-width: 720px)').matches
    const covered = PANEL_WIDTH + PANEL_GUTTER
    const avail = mobile ? width : width - covered
    const dx = mobile ? 0 : covered / 2
    const dy = mobile ? height * 0.21 : 0
    // 直式畫面太窄時縮小，讓兩座島都進得了畫面
    const zoom = Math.min(1, (avail / height) * 0.85)
    camera.zoom = zoom
    // drei Html 的距離縮放不含 zoom；窄畫面標籤等比縮小，避免互相壓住
    document.documentElement.style.setProperty('--label-scale', String(Math.max(0.6, Math.sqrt(zoom))))
    camera.setViewOffset(width, height, -dx, dy, width, height)
    camera.updateProjectionMatrix()
    return () => {
      camera.clearViewOffset()
      camera.zoom = 1
      document.documentElement.style.removeProperty('--label-scale')
      camera.updateProjectionMatrix()
    }
  }, [camera, size])
  return null
}
