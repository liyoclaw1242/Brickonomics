import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, type HemisphereLight, type InstancedMesh, Object3D } from 'three'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { PLAZA } from '../stage/plaza'
import { rand } from './ease'
import { FREEZE, FREEZE_DETAIL, WIND_FIELD, chillLevel, frostLevel, frostOf, frostProgress, icicleSlots, windLevel } from './freeze'
import type { EventProps, SpecOf } from './types'

const STREAK_LEN = 2.6
const STREAK_SPEED = 0.55
const FLAKE_SIZE = 0.13
/** 積雪：最薄、霜等級 1 時再加多少 */
const CAP_MIN = 0.03
const CAP_MAX = 0.45
/** 霜等級到 1 ÷ SNOW_COVER 時積雪蓋滿整個頂面 */
const SNOW_COVER = 1.4

type Icicle = { target: number; u: number; r: number }

/**
 * ❄️ 寒流：一陣寒風（橫向的風絲＋雪花）從左往右吹過，目標結霜：冰藍半透明外殼、上面一層積雪、前緣掛一排冰柱，
 * 長的目標（length 大）霜更厚、冰柱更長；整個畫面加一點冷色的天光（不閃）。
 * 時間來自事件時鐘：t 為 null 時藏起來；clock.reduced 時直接畫終點（沒有風、霜保留）。每種材質一個 InstancedMesh；useFrame 內不配置物件。
 */
export function Freeze({ spec, clock, quality }: EventProps<SpecOf<'freeze'>>) {
  const theme = THEMES[useThemeStore((s) => s.theme)].frost
  const detail = FREEZE_DETAIL[quality]
  const targets = spec.targets
  const icicles = useMemo(() => {
    const out: Icicle[] = []
    // 超過上限時每個目標按比例分（每個至少 1 根）：後面的目標不會被截掉
    icicleSlots(targets, quality).forEach((n, i) => {
      for (let k = 0; k < n; k++) out.push({ target: i, u: (k + 0.5) / n, r: rand(i * 31 + k, 4) })
    })
    return out
  }, [targets, quality])

  const root = useRef<Group>(null)
  const shells = useRef<InstancedMesh>(null)
  const caps = useRef<InstancedMesh>(null)
  const ice = useRef<InstancedMesh>(null)
  const streaks = useRef<InstancedMesh>(null)
  const flakes = useRef<InstancedMesh>(null)
  const chill = useRef<HemisphereLight>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const g = root.current
    const t = clock.t.current
    if (!g) return
    if (t === null) {
      g.visible = false
      if (chill.current) chill.current.intensity = 0
      return
    }
    g.visible = true
    const te = clock.reduced ? Infinity : t
    const wind = windLevel(te)
    if (chill.current) chill.current.intensity = theme.chillIntensity * chillLevel(spec, te)

    // 外殼與積雪（每個目標一個）
    const sh = shells.current
    const cp = caps.current
    for (let i = 0; i < targets.length; i++) {
      const tg = targets[i]!
      const lv = frostLevel(spec, i, te)
      const th = Math.max(0.001, FREEZE.thickness * lv)
      const x = PLAZA[0] + tg.at[0]
      const y = PLAZA[1] + tg.at[1]
      const z = PLAZA[2] + tg.at[2]
      const [w, h, d] = tg.size
      const on = lv > 0.001
      dummy.rotation.set(0, 0, 0)
      dummy.position.set(x, y + (h + th) / 2, z)
      dummy.scale.set(on ? w + 2 * th : 0.001, on ? h + th : 0.001, on ? d + 2 * th : 0.001)
      dummy.updateMatrix()
      sh?.setMatrixAt(i, dummy.matrix)
      const capH = (CAP_MIN + CAP_MAX * lv) * frostProgress(te)
      dummy.position.set(x, y + h + th + capH / 2, z)
      // 積雪：霜越重蓋得越滿（短的只有中間一小片，長的整片蓋滿）
      const cover = Math.min(1, lv * SNOW_COVER)
      dummy.scale.set(on ? (w + 2 * th) * cover : 0.001, Math.max(0.001, capH), on ? (d + 2 * th) * Math.sqrt(cover) : 0.001)
      dummy.updateMatrix()
      cp?.setMatrixAt(i, dummy.matrix)
    }
    if (sh) sh.instanceMatrix.needsUpdate = true
    if (cp) cp.instanceMatrix.needsUpdate = true

    // 冰柱：沿著前緣上方往下掛，長度跟著霜等級
    const ic = ice.current
    if (ic) {
      for (let k = 0; k < icicles.length; k++) {
        const c = icicles[k]!
        const tg = targets[c.target]!
        const lv = frostLevel(spec, c.target, te)
        const th = FREEZE.thickness * lv
        const len = Math.max(0.001, FREEZE.icicle * lv * (0.45 + 0.55 * c.r))
        const [w, h, d] = tg.size
        dummy.position.set(PLAZA[0] + tg.at[0] - w / 2 + c.u * w, PLAZA[1] + tg.at[1] + h + th - len / 2, PLAZA[2] + tg.at[2] + d / 2 + th + 0.04)
        dummy.rotation.set(Math.PI, 0, 0)
        const r = 0.1 + 0.07 * c.r
        dummy.scale.set(r, len, r)
        dummy.updateMatrix()
        ic.setMatrixAt(k, dummy.matrix)
      }
      ic.instanceMatrix.needsUpdate = true
    }

    // 風絲：橫向的細線往右流；強度跟著風（沒風就縮成 0）
    const st = streaks.current
    if (st) {
      st.visible = wind > 0
      if (wind > 0) {
        for (let i = 0; i < detail.streaks; i++) {
          const u = (rand(i, 1) + te * STREAK_SPEED * (0.8 + rand(i, 2) * 0.5)) % 1
          dummy.position.set(
            PLAZA[0] - WIND_FIELD.span + u * 2 * WIND_FIELD.span,
            PLAZA[1] + 0.4 + rand(i, 3) * WIND_FIELD.height,
            PLAZA[2] + (rand(i, 4) * 2 - 1) * WIND_FIELD.depth,
          )
          dummy.rotation.set(0, 0, 0.04)
          dummy.scale.set(STREAK_LEN * wind * (0.6 + rand(i, 5) * 0.8), 1, 1)
          dummy.updateMatrix()
          st.setMatrixAt(i, dummy.matrix)
        }
        st.instanceMatrix.needsUpdate = true
      }
    }

    // 雪花：跟著風往右飄、慢慢往下
    const fl = flakes.current
    if (fl) {
      fl.visible = wind > 0
      if (wind > 0) {
        for (let i = 0; i < detail.flakes; i++) {
          const u = (rand(i, 6) + te * STREAK_SPEED * 0.7) % 1
          const fall = (rand(i, 7) + te * 0.12) % 1
          dummy.position.set(
            PLAZA[0] - WIND_FIELD.span + u * 2 * WIND_FIELD.span,
            PLAZA[1] + WIND_FIELD.height * (1 - fall) + 0.3,
            PLAZA[2] + (rand(i, 8) * 2 - 1) * WIND_FIELD.depth,
          )
          dummy.rotation.set(te * 2 + i, i, 0)
          dummy.scale.setScalar(FLAKE_SIZE * wind)
          dummy.updateMatrix()
          fl.setMatrixAt(i, dummy.matrix)
        }
        fl.instanceMatrix.needsUpdate = true
      }
    }
  })

  const anyFrost = targets.some((_, i) => frostOf(spec, i) > 0)
  return (
    <>
      <hemisphereLight ref={chill} args={[theme.chill, theme.chill, 0]} />
      <group ref={root} visible={false}>
        {anyFrost && (
          <>
            <instancedMesh ref={shells} args={[undefined, undefined, targets.length]} frustumCulled={false} renderOrder={2}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={theme.ice} emissive={theme.ice} emissiveIntensity={0.18} transparent opacity={0.55} roughness={0.2} metalness={0.1} depthWrite={false} />
            </instancedMesh>
            <instancedMesh ref={caps} args={[undefined, undefined, targets.length]} frustumCulled={false} castShadow>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color={theme.snow} roughness={0.9} flatShading />
            </instancedMesh>
            <instancedMesh ref={ice} args={[undefined, undefined, icicles.length]} frustumCulled={false}>
              <coneGeometry args={[1, 1, 5]} />
              <meshStandardMaterial color={theme.ice} emissive={theme.ice} emissiveIntensity={0.25} roughness={0.15} metalness={0.1} flatShading transparent opacity={0.9} />
            </instancedMesh>
          </>
        )}
        <instancedMesh ref={streaks} args={[undefined, undefined, detail.streaks]} frustumCulled={false} visible={false}>
          <boxGeometry args={[1, 0.045, 0.045]} />
          <meshBasicMaterial color={theme.wind} transparent opacity={0.6} depthWrite={false} />
        </instancedMesh>
        {detail.flakes > 0 && (
          <instancedMesh ref={flakes} args={[undefined, undefined, detail.flakes]} frustumCulled={false} visible={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={theme.snow} />
          </instancedMesh>
        )}
      </group>
    </>
  )
}
