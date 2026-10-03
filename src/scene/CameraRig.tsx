import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { currentStep, useTour } from '../store/tour'
import { acquire } from './continuous'
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
  const release = useRef<(() => void) | null>(null)
  const hold = useCallback(() => {
    if (!release.current) release.current = acquire()
  }, [])
  const drop = useCallback(() => {
    release.current?.()
    release.current = null
  }, [])
  const presetId = mode === 'tour' ? scene.camera : 'overview'

  useEffect(() => {
    if (mode === 'tour' && scene.cameraFrom && controls) {
      const f = CAMERA_PRESETS[scene.cameraFrom]
      camera.position.set(...f.position)
      controls.target.set(...f.target)
      controls.update()
    }
    active.current = true
    hold()
    first.current = true
    lastDist.current = Infinity
    stuck.current = 0
    activate()
    invalidate()
  }, [mode, scene, camera, controls, invalidate, hold])

  // 卸載時一定要歸還持續繪製登記
  useEffect(() => drop, [drop])

  useEffect(() => {
    if (!controls) return
    const stop = () => {
      active.current = false
      drop()
      document.body.dataset.cameraSettled = 'true'
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls, drop])

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
    // 套用 OrbitControls 限制後，鏡頭位置與注視點實際還離目標多遠（兩者相加）
    const pos = camera.position.toArray() as Vec3
    const tgt = controls.target.toArray() as Vec3
    const remaining = Math.hypot(pos[0] - p.position[0], pos[1] - p.position[1], pos[2] - p.position[2]) + Math.hypot(tgt[0] - p.target[0], tgt[1] - p.target[1], tgt[2] - p.target[2])
    const done = a.done && b.done
    // 已到位就不再計卡住；還沒到位時，連續多幀都沒有更接近才視為被限制擋住
    if (!done) stuck.current = remaining < lastDist.current - 1e-4 ? 0 : stuck.current + 1
    lastDist.current = remaining
    if (done || stuck.current >= STUCK_FRAMES) {
      active.current = false
      drop()
      document.body.dataset.cameraSettled = 'true'
    } else invalidate()
  })
  return null
}
