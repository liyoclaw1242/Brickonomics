import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { currentStep, useTour } from '../store/tour'
import { approachVec, CAMERA_PRESETS, rigDt, type Vec3 } from './camera'

/** 連續這麼多幀距離沒有縮短（被 OrbitControls 限制擋住）就視為到位，避免永遠重繪 */
const STUCK_FRAMES = 10

function activate() {
  const b = document.body
  b.dataset.cameraSettled = 'false'
  b.dataset.cameraSeq = String(Number(b.dataset.cameraSeq ?? '0') + 1)
}

/** 導覽時把鏡頭移到步驟指定的位置；使用者一拖動就停止，不跟使用者搶控制權 */
export function CameraRig() {
  const mode = useTour((s) => s.mode)
  const scene = useTour((s) => currentStep(s).scene)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const invalidate = useThree((s) => s.invalidate)
  const active = useRef(false)
  const first = useRef(true)
  const lastDist = useRef(Infinity)
  const stuck = useRef(0)
  const presetId = mode === 'tour' ? scene.camera : 'overview'

  useEffect(() => {
    if (mode === 'tour' && scene.cameraFrom && controls) {
      const f = CAMERA_PRESETS[scene.cameraFrom]
      camera.position.set(...f.position)
      controls.target.set(...f.target)
      controls.update()
    }
    active.current = true
    first.current = true
    lastDist.current = Infinity
    stuck.current = 0
    activate()
    invalidate()
  }, [mode, scene, camera, controls, invalidate])

  useEffect(() => {
    if (!controls) return
    const stop = () => {
      active.current = false
      document.body.dataset.cameraSettled = 'true'
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useFrame((_, rawDt) => {
    if (!active.current || !controls) return
    const dt = rigDt(rawDt, first.current)
    first.current = false
    const p = CAMERA_PRESETS[presetId]
    const a = approachVec(camera.position.toArray() as Vec3, p.position, dt)
    const b = approachVec(controls.target.toArray() as Vec3, p.target, dt)
    camera.position.set(...a.next)
    controls.target.set(...b.next)
    controls.update()
    // 套用 OrbitControls 限制後，實際離目標還有多遠
    const pos = camera.position.toArray() as Vec3
    const dist = Math.hypot(pos[0] - p.position[0], pos[1] - p.position[1], pos[2] - p.position[2])
    stuck.current = dist < lastDist.current - 1e-4 ? 0 : stuck.current + 1
    lastDist.current = dist
    if ((a.done && b.done) || stuck.current >= STUCK_FRAMES) {
      active.current = false
      document.body.dataset.cameraSettled = 'true'
    } else invalidate()
  })
  return null
}
