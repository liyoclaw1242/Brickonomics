import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, type Group, type HemisphereLight, type InstancedMesh, type MeshBasicMaterial, Object3D } from 'three'
import { useThemeStore } from '../../store/theme'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { PLAZA } from '../stage/plaza'
import { rand } from './ease'
import { HEAT, HEAT_DETAIL, HEAT_FIELD, HEAT_SUN, PUDDLE_GROW, heatLevel, meltAt, meltOf, shimmerOffset } from './heatwave'
import { Sun, type SunFrame } from './Sun'
import { useSkyTint } from './useSkyTint'
import type { EventProps, SpecOf } from './types'

/** 減少動態時熱氣線定格的時間（讓它有一點彎，不是直線） */
const STILL_TIME = 1.3
const SEG_LEN = 0.45
const LINE_W = 0.07
const PUDDLE_BLOBS = 3
/** 暖霧那片：寬、高、在廣場後面多遠（廣場鏡頭往下看，看不到地平線；暖霧立在廣場後面的海上） */
const HAZE = { w: 160, h: 44, z: -34 } as const

/** 暖霧：直向漸層，貼水面的地方透明（不會有一條水平的硬邊）、往上一點最濃、再往上淡掉（掛載時畫一次） */
function hazeTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 64
  const g = c.getContext('2d')
  if (!g) return null
  const grad = g.createLinearGradient(0, 64, 0, 0)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.3, 'rgba(255,255,255,1)')
  grad.addColorStop(0.6, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 64)
  return new CanvasTexture(c)
}
const DEFAULT_COIN_RADIUS = 0.9

/**
 * ☀️ 熱浪：烈日升起、天空與霧往暖色混、加一點橘色的天光；地面冒出一條條往上飄、左右扭的熱氣線（簡化的熱浪扭曲）；
 * 金幣（舞台畫，讀 coinScaleAt）慢慢變小，事件在它們下面畫一灘越來越大的金色水窪。不閃光：一切只慢慢變熱。
 * 時間來自事件時鐘：t 為 null 時藏起來；clock.reduced 時直接畫終點（熱氣線定格）。每種材質一個 InstancedMesh；useFrame 內不配置物件。
 */
export function Heatwave({ spec, clock, quality }: EventProps<SpecOf<'heatwave'>>) {
  const theme = THEMES[useThemeStore((s) => s.theme)].heat
  const detail = HEAT_DETAIL[quality]
  const tint = useSkyTint(theme.sky, theme.fog)
  const coins = spec.coins ?? []
  const coinR = spec.coinRadius ?? DEFAULT_COIN_RADIUS
  const root = useRef<Group>(null)
  const lines = useRef<InstancedMesh>(null)
  const puddles = useRef<InstancedMesh>(null)
  const hemi = useRef<HemisphereLight>(null)
  const hazeMat = useRef<MeshBasicMaterial>(null)
  const haze = useMemo(hazeTexture, [])
  useEffect(() => () => haze?.dispose(), [haze])
  const dummy = useMemo(() => new Object3D(), [])
  const look = useMemo(() => ({ core: theme.sun, glow: theme.glow, glowOpacity: theme.glowOpacity, additive: theme.glowAdditive }), [theme])
  const nSeg = detail.lines * detail.segments

  // 烈日：跟著熱度升起、變亮（Sun 自己的 useFrame 呼叫，直接讀時鐘）
  const readSun = useCallback(
    (f: SunFrame) => {
      const t = clock.t.current
      const h = t === null ? 0 : clock.reduced ? 1 : heatLevel(t)
      f.x = PLAZA[0] + HEAT_SUN.at[0]
      f.y = PLAZA[1] + HEAT_SUN.at[1] - 3 * (1 - h)
      f.z = PLAZA[2] + HEAT_SUN.at[2]
      f.level = h
      f.rays = h
      f.spin = t !== null && Number.isFinite(t) ? -t * 0.1 : 0
    },
    [clock],
  )

  useFrame(() => {
    const g = root.current
    const t = clock.t.current
    const h = t === null ? 0 : clock.reduced ? 1 : heatLevel(t)
    const m = t === null ? 0 : clock.reduced ? meltOf(spec) : meltAt(spec, t)
    tint(h)
    if (hemi.current) hemi.current.intensity = theme.ambient * h
    if (!g) return
    g.visible = t !== null
    if (t === null) return
    const time = clock.reduced || !Number.isFinite(t) ? STILL_TIME : t

    // 熱氣線：每條從地面往上飄、左右扭；越往上越細（淡出），熱度越高越明顯
    const ln = lines.current
    if (ln) {
      ln.visible = h > 0.01
      let k = 0
      for (let i = 0; i < detail.lines; i++) {
        const bx = PLAZA[0] + (rand(i, 1) * 2 - 1) * HEAT_FIELD.span
        const bz = PLAZA[2] + (rand(i, 2) * 2 - 1) * HEAT_FIELD.depth
        const phase = rand(i, 3) * Math.PI * 2
        const lift = ((rand(i, 4) + (time * HEAT.rise) / HEAT_FIELD.height) % 1) * HEAT_FIELD.height * 0.5
        for (let s = 0; s < detail.segments; s++) {
          const y0 = 0.3 + lift + s * SEG_LEN
          const y1 = y0 + SEG_LEN
          const x0 = shimmerOffset(y0, time, phase)
          const x1 = shimmerOffset(y1, time, phase)
          const fade = 1 - s / detail.segments
          dummy.position.set(bx + (x0 + x1) / 2, PLAZA[1] + (y0 + y1) / 2, bz)
          dummy.rotation.set(0, 0, -Math.atan2(x1 - x0, SEG_LEN))
          dummy.scale.set(LINE_W * h * (0.4 + 0.6 * fade), Math.hypot(x1 - x0, SEG_LEN), LINE_W)
          dummy.updateMatrix()
          ln.setMatrixAt(k++, dummy.matrix)
        }
      }
      ln.instanceMatrix.needsUpdate = true
    }

    // 金色水窪：每個金幣下面 PUDDLE_BLOBS 片重疊的扁圓（不規則的一灘），融掉越多越大（面積大約跟融掉的量成正比）
    const pd = puddles.current
    if (pd) {
      pd.visible = m > 0.001
      const grow = 0.6 + PUDDLE_GROW * Math.sqrt(m)
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i]!
        for (let b = 0; b < PUDDLE_BLOBS; b++) {
          const a = rand(i * 5 + b, 5) * Math.PI * 2
          const off = b === 0 ? 0 : coinR * grow * (0.35 + 0.3 * rand(i * 5 + b, 6))
          const r = coinR * grow * (b === 0 ? 1 : 0.55 + 0.25 * rand(i * 5 + b, 7))
          dummy.position.set(PLAZA[0] + c[0] + Math.cos(a) * off, PLAZA[1] + c[1] + 0.02 + b * 0.002, PLAZA[2] + c[2] + Math.sin(a) * off * 0.8)
          dummy.rotation.set(0, a, 0)
          dummy.scale.set(r, 1, r * 0.8)
          dummy.updateMatrix()
          pd.setMatrixAt(i * PUDDLE_BLOBS + b, dummy.matrix)
        }
      }
      pd.instanceMatrix.needsUpdate = true
    }

    // 暖色的霧：舞台後面一大片由下往上淡掉的暖色（熱度越高越濃）
    if (hazeMat.current) hazeMat.current.opacity = theme.hazeOpacity * h
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={[theme.light, theme.ground, 0]} />
      <Sun look={look} radius={HEAT_SUN.radius} rays={detail.rays} quality={quality} read={readSun} />
      <mesh position={[PLAZA[0], PLAZA[1] + HAZE.h / 2 - 1, PLAZA[2] + HAZE.z]} renderOrder={-5}>
        <planeGeometry args={[HAZE.w, HAZE.h]} />
        <meshBasicMaterial ref={hazeMat} map={haze} color={theme.haze} transparent opacity={0} depthWrite={false} fog={false} />
      </mesh>
      <group ref={root} visible={false}>
        <instancedMesh ref={lines} args={[undefined, undefined, nSeg]} frustumCulled={false} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={theme.shimmer} transparent opacity={0.7} depthWrite={false} />
        </instancedMesh>
        {coins.length > 0 && (
          <instancedMesh ref={puddles} args={[undefined, undefined, coins.length * PUDDLE_BLOBS]} frustumCulled={false} visible={false} receiveShadow>
            <cylinderGeometry args={[1, 1, 0.04, quality === 'low' ? 10 : 18]} />
            <meshStandardMaterial color={ACCENT_COLORS.coin} metalness={0.7} roughness={0.15} emissive={ACCENT_COLORS.coin} emissiveIntensity={0.2} />
          </instancedMesh>
        )}
      </group>
    </>
  )
}
