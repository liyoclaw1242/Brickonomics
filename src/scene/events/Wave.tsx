import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, type Group, type InstancedMesh, Object3D } from 'three'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { atPlaza } from '../stage/plaza'
import { rand } from './ease'
import { WAVE, WAVE_DETAIL, surfaceY, waveAt, waveFinal } from './wave'
import type { EventProps, SpecOf } from './types'

/** 浪頭的泡沫：沿著水面小起伏的波峰排（每道波峰幾顆） */
const FOAM_SIZE = 0.17
/** 浪湧到這個程度才有白浪；水花被拋到波峰上方多高 */
const FOAM_FROM = 0.3
const FOAM_TOSS = 0.9
/** 浪花：噴多高、往外多遠、每顆多大 */
const SPRAY_UP = 2.6
const SPRAY_OUT = 1.6
const SPRAY_SIZE = 0.13
/** 水面最低（不讓水面穿到地面以下） */
const MIN_Y = 0.02

/**
 * 🌊 大浪：一片半透明的水圍住目標的底部，水面一直有小起伏往右走；每道浪整片水湧起再退下（一上一下），
 * 浪頭打到時在目標旁噴一次浪花（不閃光、不加燈）。白浪與浪花都是圓的半透明水泡（不像浮冰，和 ❄️ 分開）；結束前水面的小起伏慢慢停下，終點是平的水面。塔高由舞台依 waveStepAt 沿 leveragedPath 取。
 * 水是一個分段的方塊：每幀只改頂面（與側面上緣）頂點的高度；flatShading 由著色器算法線，不必每幀重算。
 * 時間來自事件時鐘：t 為 null 時藏起來；clock.reduced 時直接畫終點（平靜的水面）。低畫質分段、泡沫、浪花都少。useFrame 內不配置物件。
 */
export function Wave({ spec, clock, quality }: EventProps<SpecOf<'wave'>>) {
  const theme = THEMES[useThemeStore((s) => s.theme)].wave
  const detail = WAVE_DETAIL[quality]
  const [cx, cz] = spec.at ?? [0, 0]
  const [w, d] = spec.size ?? [WAVE.width, WAVE.depth]
  const targets = spec.targets ?? []

  // 底部貼地（y 0..1）；頂點 y = 1 的是頂面與側面上緣，每幀改成水面高度
  const { geometry, top } = useMemo(() => {
    const g = new BoxGeometry(w, 1, d, detail.segX, 1, detail.segZ)
    g.translate(0, 0.5, 0)
    const pos = g.getAttribute('position')
    const idx: number[] = []
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.5) idx.push(i)
    return { geometry: g, top: Int32Array.from(idx) }
  }, [w, d, detail.segX, detail.segZ])
  useEffect(() => () => geometry.dispose(), [geometry])

  const root = useRef<Group>(null)
  const foam = useRef<InstancedMesh>(null)
  const spray = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const sprayCount = Math.max(1, targets.length * detail.spray)
  /** 波峰的間距（水面小起伏的一個波長）與水面上排得下幾道 */
  const lambda = (2 * Math.PI) / WAVE.kx
  const crests = Math.ceil(w / lambda)

  useFrame(() => {
    const g = root.current
    const t = clock.t.current
    if (!g) return
    if (t === null) {
      g.visible = false
      return
    }
    g.visible = true
    const s = clock.reduced ? waveFinal() : waveAt(spec, t)

    const pos = geometry.getAttribute('position')
    for (let k = 0; k < top.length; k++) {
      const i = top[k]!
      pos.setY(i, Math.max(MIN_Y, surfaceY(s, pos.getX(i), pos.getZ(i))))
    }
    pos.needsUpdate = true

    // 白浪：每顆小水泡固定在某一道波峰、某個 z，跟著波峰往右走；浪湧得夠高才出現（FOAM_FROM 以下整個藏起來，不留小點）。
    // 一部分水泡被拋到波峰上方（水花），全部是圓的、半透明：看起來是水，不是浮冰
    const fm = foam.current
    const lift = Math.max(0, (s.swell - FOAM_FROM) / (1 - FOAM_FROM))
    if (fm) {
      fm.visible = lift > 0
      for (let i = 0; i < detail.foam; i++) {
        const z = (rand(i, 1) - 0.5) * d * 0.92
        const m = i % crests
        // 波峰：WAVE.kx·x − phase + 0.35·z = π/2 → x = (π/2 + phase − 0.35·z) ÷ kx，再加 m 個波長、折回水面範圍內
        const x0 = (Math.PI / 2 + s.phase - 0.35 * z) / WAVE.kx + m * lambda + (rand(i, 2) - 0.5) * 0.6
        const span = crests * lambda
        const x = -w / 2 + ((((x0 + w / 2) % span) + span) % span)
        const size = x < w / 2 - 0.2 ? FOAM_SIZE * (0.5 + rand(i, 3)) * lift : 0
        const toss = i % 3 === 0 ? FOAM_TOSS * lift * (0.4 + rand(i, 7)) : 0
        dummy.position.set(x, surfaceY(s, x, z) + size * 0.3 + toss, z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(Math.max(0.001, size))
        dummy.updateMatrix()
        fm.setMatrixAt(i, dummy.matrix)
      }
      fm.instanceMatrix.needsUpdate = true
    }

    // 浪花：浪頭打到目標時，從目標四周往上、往外噴一次（拋物線），越來越小
    const sp = spray.current
    if (sp) {
      sp.visible = s.spray !== null && targets.length > 0
      if (s.spray !== null) {
        const u = s.spray
        for (let ti = 0; ti < targets.length; ti++) {
          const tg = targets[ti]!
          const half = Math.max(tg.size[0], tg.size[2]) / 2
          for (let j = 0; j < detail.spray; j++) {
            const a = ((j + rand(ti * 17 + j, 4) * 0.5) / detail.spray) * Math.PI * 2
            const r = half + SPRAY_OUT * u * (0.5 + rand(ti * 17 + j, 5))
            dummy.position.set(
              tg.at[0] - cx + Math.cos(a) * r,
              s.level + 4 * u * (1 - u) * SPRAY_UP * (0.55 + rand(ti * 17 + j, 6) * 0.6),
              tg.at[2] - cz + Math.sin(a) * r,
            )
            dummy.rotation.set(j, j * 0.5, 0)
            dummy.scale.setScalar(Math.max(0.001, SPRAY_SIZE * (1 - u)))
            dummy.updateMatrix()
            sp.setMatrixAt(ti * detail.spray + j, dummy.matrix)
          }
        }
        sp.instanceMatrix.needsUpdate = true
      }
    }
  })

  const [px, py, pz] = atPlaza(cx, 0, cz)
  return (
    <group ref={root} position={[px, py, pz]} visible={false}>
      <mesh geometry={geometry} frustumCulled={false} renderOrder={1}>
        <meshStandardMaterial color={theme.water} transparent opacity={theme.opacity} roughness={0.25} metalness={0.1} flatShading depthWrite={false} />
      </mesh>
      <instancedMesh ref={foam} args={[undefined, undefined, detail.foam]} frustumCulled={false} renderOrder={2} visible={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={theme.foam} roughness={0.6} transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={spray} args={[undefined, undefined, sprayCount]} frustumCulled={false} visible={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={theme.foam} roughness={0.6} transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
