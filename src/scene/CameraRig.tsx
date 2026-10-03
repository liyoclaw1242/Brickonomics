import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { currentStep, useTour } from '../store/tour'
import { MAX_FRAME_DT } from './layout/voxels'
import { approachVec, CAMERA_PRESETS, type Vec3 } from './camera'

/** 導覽時把鏡頭移到步驟指定的位置；使用者一拖動就停止，不跟使用者搶控制權 */
export function CameraRig() {
  const mode = useTour((s) => s.mode)
  const scene = useTour((s) => currentStep(s).scene)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const invalidate = useThree((s) => s.invalidate)
  const active = useRef(false)
  const presetId = mode === 'tour' ? scene.camera : 'overview'

  useEffect(() => {
    if (mode === 'tour' && scene.cameraFrom && controls) {
      const f = CAMERA_PRESETS[scene.cameraFrom]
      camera.position.set(...f.position)
      controls.target.set(...f.target)
      controls.update()
    }
    active.current = true
    invalidate()
  }, [mode, scene, camera, controls, invalidate])

  useEffect(() => {
    if (!controls) return
    const stop = () => {
      active.current = false
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_FRAME_DT)
    if (!active.current || !controls) return
    const p = CAMERA_PRESETS[presetId]
    const a = approachVec(camera.position.toArray() as Vec3, p.position, dt)
    const b = approachVec(controls.target.toArray() as Vec3, p.target, dt)
    camera.position.set(...a.next)
    controls.target.set(...b.next)
    controls.update()
    if (a.done && b.done) active.current = false
    else invalidate()
  })
  return null
}
