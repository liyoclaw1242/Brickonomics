import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { useThemeStore } from '../../store/theme'
import type { Vec3 } from '../camera'
import type { Quality } from '../quality'
import { THEMES } from '../theme'
import { useEventHemi, useEventKey } from '../eventLights'
import { PLAZA } from '../stage/plaza'
import { rand } from './ease'
import { SKY, SUNNY_DETAIL, crownPuffs, sunOf, sunnyAt, sunnyFinal } from './sunnyTree'
import { Sun, type SunFrame } from './Sun'
import { useSkyTint } from './useSkyTint'
import type { EventProps, SpecOf } from './types'

/**
 * 🌤 晴天：擋在太陽前面的雲往左右飄走、縮小 → 太陽升起（Sun：圓盤＋光暈＋光芒，永遠面向鏡頭）→ 暖色的光照下來、天空變暖亮。
 * 只負責天氣與光線；塔長高由舞台負責（樹冠用下面的 TreeCrown）。不閃光：光線只慢慢變亮。
 * 時間來自事件時鐘：t 為 null 時是陰天（雲擋著太陽、沒有暖光）；clock.reduced 時直接畫終點。useFrame 內不配置物件。
 */
export function SunnyTree({ spec, clock, quality }: EventProps<SpecOf<'sunnyTree'>>) {
  const theme = THEMES[useThemeStore((s) => s.theme)].sunny
  const detail = SUNNY_DETAIL[quality]
  const tint = useSkyTint(theme.sky, theme.fog)
  const clouds = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const nClouds = SKY.clouds.length * detail.puffs
  const [sx, sy, sz] = sunOf(spec)
  const key = useEventKey(theme.lightColor, [PLAZA[0] + sx, PLAZA[1] + sy, PLAZA[2] + sz + 10])
  const hemi = useEventHemi(theme.lightColor, theme.ground)
  const look = useMemo(() => ({ core: theme.sun, glow: theme.glow, glowOpacity: theme.glowOpacity, additive: theme.glowAdditive }), [theme])
  // 太陽：從 sun 下方 rise 升上來；光芒等雲散開才亮（Sun 自己的 useFrame 呼叫，直接讀時鐘，不靠 useFrame 的先後）
  const readSun = useCallback(
    (f: SunFrame) => {
      const t = clock.t.current
      const s = clock.reduced ? sunnyFinal(spec) : sunnyAt(spec, t)
      f.x = PLAZA[0] + sx
      f.y = PLAZA[1] + sy - SKY.rise * (1 - s.sun)
      f.z = PLAZA[2] + sz
      f.level = s.sun
      f.rays = s.clear
      f.spin = (t !== null && Number.isFinite(t) ? t : 0) * 0.15
    },
    [clock, spec, sx, sy, sz],
  )

  useFrame(() => {
    const s = clock.reduced ? sunnyFinal(spec) : sunnyAt(spec, clock.t.current)
    tint(s.warm)
    const k = key()
    if (k) k.intensity = theme.light * s.warm
    const h = hemi()
    if (h) h.intensity = theme.ambient * s.warm

    // 雲：一開始擋在太陽前面，放晴時往左右飄走、縮小
    const cl = clouds.current
    if (cl) {
      cl.visible = s.clear < 0.999
      let k = 0
      for (let c = 0; c < SKY.clouds.length; c++) {
        const cloud = SKY.clouds[c]!
        const shrink = 1 - s.clear
        for (let i = 0; i < detail.puffs; i++) {
          const a = (i / detail.puffs) * Math.PI * 2
          dummy.position.set(
            PLAZA[0] + sx + cloud.at[0] + cloud.drift * s.clear + Math.cos(a) * 1.4,
            PLAZA[1] + sy + cloud.at[1] + Math.sin(a * 2) * 0.3,
            PLAZA[2] + sz + cloud.at[2] + Math.sin(a) * 0.6,
          )
          dummy.rotation.set(0, i * 1.3, 0)
          const sc = (1.4 + rand(c * 7 + i, 1) * 0.7) * Math.max(0.001, shrink)
          dummy.scale.set(sc, sc * 0.55, sc * 0.8)
          dummy.updateMatrix()
          cl.setMatrixAt(k++, dummy.matrix)
        }
      }
      cl.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <Sun look={look} radius={SKY.sunRadius} rays={detail.rays} quality={quality} read={readSun} />
      <instancedMesh ref={clouds} args={[undefined, undefined, nClouds]} frustumCulled={false}>
        <icosahedronGeometry args={[1, quality === 'low' ? 0 : 1]} />
        <meshStandardMaterial color={theme.cloud} flatShading roughness={1} />
      </instancedMesh>
    </>
  )
}

type CrownProps = {
  /** 樹冠底部中心（通常是塔頂）；放在會動的 group 裡時用 [0, 0, 0] */
  position?: Vec3
  /** 樹冠半徑 */
  radius: number
  /** 長出來的程度 0..1（葉團依序冒出來）；每幀變的話傳函式（例如 () => treeGrowAt(clock.t.current)） */
  grow: number | (() => number)
  quality: Quality
}

/**
 * 樹冠：塔頂上一團低面數的綠色葉團，跟著 grow 依序冒出來（舞台把它放在長高的塔頂，塔就像一棵樹）。
 * 一個 InstancedMesh；顏色取主題（兩種綠交錯）。useFrame 內不配置物件。
 */
export function TreeCrown({ position = [0, 0, 0], radius, grow, quality }: CrownProps) {
  const theme = THEMES[useThemeStore((s) => s.theme)].sunny
  const puffs = useMemo(() => crownPuffs(SUNNY_DETAIL[quality].crown), [quality])
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const a = new Color(theme.leaf)
    const b = new Color(theme.leafDark)
    puffs.forEach((p, i) => m.setColorAt(i, p.shade ? b : a))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [puffs, theme])
  // grow 是數字時，改變後要補畫一幀（demand 模式）
  useLayoutEffect(() => invalidate(), [grow, radius, invalidate])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const g = typeof grow === 'function' ? grow() : grow
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i]!
      const k = Math.min(1, Math.max(0, (g - p.delay) / (1 - p.delay)))
      dummy.position.set(p.x * radius, p.y * radius * k, p.z * radius)
      dummy.rotation.set(i, i * 0.7, 0)
      dummy.scale.setScalar(Math.max(0.001, p.s * radius * k))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} position={position} args={[undefined, undefined, puffs.length]} castShadow frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial flatShading roughness={0.9} />
    </instancedMesh>
  )
}
