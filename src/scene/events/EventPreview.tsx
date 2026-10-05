import { StrictMode, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useQuality } from '../../store/quality'
import { useThemeStore } from '../../store/theme'
import { FrameCounter } from '../FrameCounter'
import { Lighting } from '../Lighting'
import { QUALITY, parseQualityParam, type Quality } from '../quality'
import { THEMES } from '../theme'
import { Plaza } from '../stage/Plaza'
import { PLAZA } from '../stage/plaza'
import { useContinuousRender } from '../useContinuousRender'
import { prefersReducedMotion } from '../useRevealAfterCamera'
import { EventLayer } from './EventLayer'
import { eventDuration, eventLingers } from './index'
import { PREVIEW_PROPS } from './PreviewProps'
import { parsePreview, type PreviewOptions } from './preview'
import type { EventClock, EventSpec } from './types'
import '../../ui/ui.css'

/** 播放模式：載入後等這麼久才開始（像正式課程等鏡頭停下） */
const START_DELAY = 0.6

/**
 * 預覽用的事件時鐘：和 useEventClock 同一套規則（減少動態或靜態事件 → 直接終點；只在動畫期間持續繪製），
 * 但不看課程與鏡頭。options.t 有值時定格在那個時間（截圖用）。
 */
function usePreviewClock({ spec, t: fixed, reduced: forceReduced }: PreviewOptions): EventClock {
  const [reduced] = useState(() => forceReduced || prefersReducedMotion())
  const duration = eventDuration(spec)
  const lingers = eventLingers(spec)
  const instant = reduced || (duration <= 0 && !lingers)
  const start = instant ? Infinity : fixed
  const t = useRef<number | null>(start)
  const t0 = useRef<number | null>(null)
  const [done, setDone] = useState(instant || (fixed !== null && fixed >= duration))
  const running = !instant && fixed === null && (!done || lingers)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate])
  useContinuousRender(running)
  useFrame(({ clock }) => {
    if (!running) return
    if (t0.current === null) t0.current = clock.elapsedTime + START_DELAY
    const now = clock.elapsedTime - t0.current
    t.current = now < 0 ? null : now
    if (!done && now > duration) {
      setDone(true)
      invalidate()
    }
  }, -1)
  const epoch = `preview|${JSON.stringify(spec)}|${fixed}|${instant}`
  return useMemo(() => ({ spec, t, done, reduced, epoch }), [spec, done, reduced, epoch])
}

/** 鏡頭：從廣場前上方往下看（約 30°），窄螢幕拉遠一點，讓舞台寬度大致放得進來 */
function PreviewCamera() {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const target: [number, number, number] = [PLAZA[0], 3, PLAZA[2]]
    const halfW = aspect < 1 ? 9 : 15
    const tanHalf = Math.tan(((45 / 2) * Math.PI) / 180)
    const dist = Math.max(30, halfW / (tanHalf * aspect))
    const dir = [0, 0.62, 1]
    const len = Math.hypot(dir[0]!, dir[1]!, dir[2]!)
    camera.position.set(target[0] + (dir[0]! / len) * dist, target[1] + (dir[1]! / len) * dist, target[2] + (dir[2]! / len) * dist)
    camera.lookAt(...target)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, aspect, invalidate])
  return null
}

function PreviewScene({ options, quality }: { options: PreviewOptions; quality: Quality }) {
  const clock = usePreviewClock(options)
  const sea = THEMES[useThemeStore((s) => s.theme)].sea
  const Props = PREVIEW_PROPS[options.spec.kind] as ComponentType<{ spec: EventSpec; clock: EventClock; quality: Quality }> | null
  return (
    <>
      <Lighting quality={quality} />
      <PreviewCamera />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color={sea} />
      </mesh>
      <Plaza />
      {Props && <Props spec={options.spec} clock={clock} quality={quality} />}
      <EventLayer clock={clock} quality={quality} />
      <FrameCounter />
    </>
  )
}

function EventPreview({ options }: { options: PreviewOptions }) {
  const quality = useQuality((s) => s.quality)
  const cfg = QUALITY[quality]
  return (
    <div className="app" data-event-preview={options.spec.kind}>
      <Canvas frameloop="demand" shadows={cfg.shadows} dpr={cfg.dpr} camera={{ fov: 45 }}>
        <PreviewScene options={options} quality={quality} />
      </Canvas>
    </div>
  )
}

/** main.tsx（只在 DEV）呼叫：網址有 ?eventPreview=<kind> 時掛上預覽頁而不是主程式；kind 不認得回傳 false */
export function mountEventPreview(root: HTMLElement): boolean {
  const options = parsePreview(window.location.search)
  if (!options) return false
  const pinned = parseQualityParam(window.location.search)
  useQuality.setState({ quality: pinned ?? 'high', pinned: true })
  createRoot(root).render(
    <StrictMode>
      <EventPreview options={options} />
    </StrictMode>,
  )
  return true
}
