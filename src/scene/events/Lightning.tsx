import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type AmbientLight, type Group, type InstancedMesh, type MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import type { Vec3 } from '../camera'
import {
  BOLT_DETAIL,
  CLOUD,
  CLOUD_LABEL_ANCHOR,
  IMPACT_TIME,
  boltGlow,
  boltReveal,
  boltSegments,
  flashLevel,
  strikeAt,
  strikeTarget,
  SHOCK_SUBJECTS,
  visibleSegments,
} from './lightning'
import type { Quality } from '../quality'
import { THEMES } from '../theme'
import { atPlaza } from '../stage/plaza'
import { useEventValue } from '../useEventClock'
import { StormCloud } from './StormCloud'
import type { EventProps } from './types'

const CORE = 0.07
const CORE_PER_WIDTH = 0.16
const GLOW_SCALE = 3.4
const GLOW_OPACITY = 0.5
const SPARK_TIME = 0.5
const UP = new Vector3(0, 1, 0)

type BoltProps = {
  /** 閃電時間（秒，c-2 鏡頭停下後起算）；null＝還沒開始 */
  time: { readonly current: number | null }
  quality: Quality
  /** prefers-reduced-motion：直接擺一道靜止的閃電，不長、不閃、不退 */
  still: boolean
}

/**
 * 一道閃電：從烏雲打下來，分岔到有台積電的地方（只買台積電那柱、0050 裡的台積電層）；SPY 沒有分岔。
 * 每段是一個細長方塊（白色芯＋外圈光暈各一個 InstancedMesh），調 count 逐段長出來；
 * 打中那一刻全場補光一次（ambientLight 脈衝）、打中點各一團光，之後退掉。持續繪製由事件時鐘（useEventClock）負責。
 */
function Bolt({ time, quality, still }: BoltProps) {
  const theme = THEMES[useThemeStore((s) => s.theme)].bolt
  const detail = BOLT_DETAIL[quality]
  const segs = useMemo(() => boltSegments(quality), [quality])
  const targets = useMemo(
    () => SHOCK_SUBJECTS.map((s) => strikeTarget(s.key)).filter((p): p is Vec3 => p !== null).map((p) => atPlaza(...p)),
    [],
  )
  const root = useRef<Group>(null)
  const core = useRef<InstancedMesh>(null)
  const glow = useRef<InstancedMesh>(null)
  const sparks = useRef<InstancedMesh>(null)
  const coreMat = useRef<MeshBasicMaterial>(null)
  const glowMat = useRef<MeshBasicMaterial>(null)
  const sparkMat = useRef<MeshBasicMaterial>(null)
  const flash = useRef<AmbientLight>(null)
  const dummy = useMemo(() => new Object3D(), [])

  // 形狀固定：只在掛載／換畫質時擺一次
  useLayoutEffect(() => {
    const dir = new Vector3()
    const a = new Vector3()
    const b = new Vector3()
    segs.forEach((s, i) => {
      a.set(...atPlaza(...s.a))
      b.set(...atPlaza(...s.b))
      dir.subVectors(b, a)
      const len = dir.length()
      dummy.position.addVectors(a, b).multiplyScalar(0.5)
      dummy.quaternion.setFromUnitVectors(UP, dir.normalize())
      const w = CORE + CORE_PER_WIDTH * s.width
      // 稍微加長一點，段與段的接縫不會斷開
      dummy.scale.set(w, len + w, w)
      dummy.updateMatrix()
      core.current?.setMatrixAt(i, dummy.matrix)
      dummy.scale.set(w * GLOW_SCALE, len + w * GLOW_SCALE, w * GLOW_SCALE)
      dummy.updateMatrix()
      glow.current?.setMatrixAt(i, dummy.matrix)
    })
    for (const m of [core.current, glow.current]) if (m) m.instanceMatrix.needsUpdate = true
  }, [segs, dummy])

  useFrame(() => {
    const g = root.current
    const t = time.current
    if (!g) return
    if (t === null) {
      g.visible = false
      if (flash.current) flash.current.intensity = 0
      return
    }
    const level = still ? 1 : boltGlow(t)
    const n = still ? segs.length : visibleSegments(segs, boltReveal(t))
    g.visible = level > 0 && n > 0
    if (core.current) core.current.count = n
    if (glow.current) glow.current.count = n
    if (coreMat.current) coreMat.current.opacity = level
    if (glowMat.current) glowMat.current.opacity = GLOW_OPACITY * level
    if (flash.current) flash.current.intensity = still ? 0 : theme.flash * flashLevel(t)
    const sp = sparks.current
    if (sp) {
      const u = (t - IMPACT_TIME) / SPARK_TIME
      const on = !still && u >= 0 && u <= 1
      sp.visible = on
      if (on) {
        targets.forEach((p, i) => {
          dummy.position.set(...p)
          dummy.quaternion.identity()
          dummy.scale.setScalar(0.6 + 1.6 * u)
          dummy.updateMatrix()
          sp.setMatrixAt(i, dummy.matrix)
        })
        sp.instanceMatrix.needsUpdate = true
        if (sparkMat.current) sparkMat.current.opacity = 0.8 * (1 - u)
      }
    }
  })

  return (
    <>
      <ambientLight ref={flash} intensity={0} color={theme.glow} />
      <group ref={root} visible={false}>
        {detail.glow && (
          <instancedMesh ref={glow} args={[undefined, undefined, segs.length]} frustumCulled={false} renderOrder={5}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial ref={glowMat} color={theme.glow} transparent opacity={GLOW_OPACITY} depthWrite={false} toneMapped={false} />
          </instancedMesh>
        )}
        <instancedMesh ref={core} args={[undefined, undefined, segs.length]} frustumCulled={false} renderOrder={6}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial ref={coreMat} color={theme.core} transparent depthWrite={false} toneMapped={false} />
        </instancedMesh>
        <instancedMesh ref={sparks} args={[undefined, undefined, targets.length]} frustumCulled={false} visible={false}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial ref={sparkMat} color={theme.glow} transparent depthWrite={false} toneMapped={false} />
        </instancedMesh>
      </group>
    </>
  )
}

/**
 * 閃電事件（單一公司出事）：c-1（gather）只有一片烏雲高掛在三組上方；c-2（strike）鏡頭停下後一道閃電打下來，
 * 打中那一刻雲底出現「假設：台積電被打中」。閃電只打一次（≤ 1 次閃光）；減少動態時直接顯示終點與一道靜止的閃電。
 * 受損（柱子變矮、0050 的紅色方塊、跌幅）由舞台（ShockStage）以 strikeAt 讀同一個時鐘決定。
 */
export function Lightning({ spec, clock, quality }: EventProps) {
  const struck = useEventValue(clock, (t) => strikeAt(spec, t))
  return (
    <>
      <StormCloud quality={quality} position={atPlaza(...CLOUD.center)} spread={CLOUD.spread} size={CLOUD.size} />
      {spec.phase === 'strike' && <Bolt time={clock.t} quality={quality} still={clock.reduced} />}
      {struck && <Callout anchor={atPlaza(...CLOUD_LABEL_ANCHOR)} offset={[2.2, -0.8, 0]} title={T.shock.struck} persistent />}
    </>
  )
}
