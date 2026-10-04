import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import { viewFraming } from '../ui/layoutModel'

/** 把場景框進「沒被 UI 蓋住」的可視區；蓋住哪裡由 ui/layoutModel.ts 統一決定。 */
export function ViewFraming() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const { width, height } = size
    const { offsetX, offsetY, zoom } = viewFraming(width, height)
    camera.zoom = zoom
    // drei Html 的距離縮放不含 zoom；窄畫面標籤等比縮小，避免互相壓住
    document.documentElement.style.setProperty('--label-scale', String(Math.max(0.6, Math.sqrt(zoom))))
    camera.setViewOffset(width, height, offsetX, offsetY, width, height)
    camera.updateProjectionMatrix()
    invalidate()
    return () => {
      camera.clearViewOffset()
      camera.zoom = 1
      document.documentElement.style.removeProperty('--label-scale')
      camera.updateProjectionMatrix()
      invalidate()
    }
  }, [camera, size, invalidate])
  return null
}
