import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, BufferAttribute, Color, ExtrudeGeometry, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, Object3D, Shape, ShapeGeometry } from 'three'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { atPlaza } from '../stage/plaza'
import { rand } from './ease'
import { QUAKE, QUAKE_DETAIL, crackLines, pitOutline, quakeAt, quakeFinal } from './quake'
import type { EventProps, SpecOf } from './types'

/** 遮罩比地面高一點點：廣場在坑口的地方畫不過去（深度測試輸給遮罩），露出先畫好的坑 */
const MASK_Y = 0.015
const SLAB = { w: 1.9, h: 0.4, d: 1.3 }
/** 地磚往坑裡倒的角度 */
const SLAB_TILT = 0.38
const DUST_RISE = 3.2

/** 地上的一段裂痕：從 (x0,z0) 往 (x1,z1) 長出 grow（0..1）那麼長 */
function placeSegment(dummy: Object3D, x0: number, z0: number, x1: number, z1: number, grow: number, w: number) {
  const len = Math.hypot(x1 - x0, z1 - z0) * grow
  const ang = Math.atan2(x1 - x0, z1 - z0)
  dummy.position.set(x0 + Math.sin(ang) * len * 0.5, 0.02, z0 + Math.cos(ang) * len * 0.5)
  dummy.rotation.set(0, ang, 0)
  dummy.scale.set(w, 0.04, Math.max(0.001, len))
  dummy.updateMatrix()
}

/**
 * 🌋 地震＋地裂：地面震一次，裂出一個往下沉的坑（坑深＝spec.depth），坑邊的地磚往坑裡倒、地面裂痕往外延伸、噴一陣塵土、一圈波紋。
 *
 * 坑怎麼「挖」在廣場上（不改廣場本身）：
 * 1. 先畫坑（倒過來的柱體：只看得到坑壁內側與坑底，renderOrder −2），坑邊地磚更早畫（−3）；
 * 2. 再畫一片與坑口同形狀的遮罩（只寫深度、不寫顏色，−1），比地面高一點點；
 * 3. 之後畫廣場時，坑口範圍深度測試輸給遮罩 → 廣場不會蓋掉坑。
 * 時間來自事件時鐘：t 為 null 時藏起來；clock.reduced 時直接畫終點。每種材質一個 mesh／InstancedMesh；useFrame 內不配置物件。
 */
export function Quake({ spec, clock, quality }: EventProps<SpecOf<'quake'>>) {
  const theme = THEMES[useThemeStore((s) => s.theme)].quake
  const detail = QUAKE_DETAIL[quality]
  const width = spec.width ?? QUAKE.width
  const [cx, cz] = spec.at ?? [0, 0]
  const outline = useMemo(() => pitOutline(width, detail.points), [width, detail.points])
  const cracks = useMemo(() => crackLines(outline, detail.cracks), [outline, detail.cracks])

  // 坑口形狀：Shape 在 xy 平面，轉 −90° 後 y → −z，所以 y 用 −z
  const { pit, mask } = useMemo(() => {
    const s = new Shape()
    outline.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)))
    s.closePath()
    const pit = new ExtrudeGeometry(s, { depth: 1, steps: 4, bevelEnabled: false })
    // 坑壁由上往下從土色漸暗到坑底色（頂點色）：一眼看得出有多深
    const top = new Color(theme.wall)
    const bottom = new Color(theme.floor)
    const c = new Color()
    const pos = pit.getAttribute('position')
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      c.copy(bottom).lerp(top, Math.pow(pos.getZ(i), 0.8))
      c.toArray(colors, i * 3)
    }
    pit.setAttribute('color', new BufferAttribute(colors, 3))
    return { pit, mask: new ShapeGeometry(s) }
  }, [outline, theme])
  useEffect(() => () => {
    pit.dispose()
    mask.dispose()
  }, [pit, mask])

  const root = useRef<Group>(null)
  const ground = useRef<Group>(null)
  const pitMesh = useRef<Mesh>(null)
  const maskMesh = useRef<Mesh>(null)
  const slabs = useRef<InstancedMesh>(null)
  const crackMesh = useRef<InstancedMesh>(null)
  const dust = useRef<InstancedMesh>(null)
  const ring = useRef<Mesh>(null)
  const ringMat = useRef<MeshBasicMaterial>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const final = useMemo(() => quakeFinal(spec), [spec])

  useFrame(() => {
    const g = root.current
    const t = clock.t.current
    if (!g) return
    if (t === null) {
      g.visible = false
      return
    }
    g.visible = true
    const s = clock.reduced ? final : quakeAt(spec, t)
    const open = Math.max(0.001, s.open)
    if (ground.current) ground.current.position.set(s.shakeX, 0, s.shakeZ)

    // 坑：寬度隨裂開長大，深度隨時間往下
    const depth = Math.max(0.001, s.depth)
    if (pitMesh.current) {
      pitMesh.current.scale.set(open, open, depth)
      pitMesh.current.position.y = -depth
    }
    if (maskMesh.current) maskMesh.current.scale.set(open, open, 1)

    // 坑邊的地磚：沿著輪廓，往坑裡倒（裂得越開倒得越多）
    const sl = slabs.current
    if (sl) {
      for (let i = 0; i < detail.slabs; i++) {
        const p = outline[Math.floor((i / detail.slabs) * outline.length)]!
        const r = Math.hypot(p[0], p[1]) || 1
        const nx = p[0] / r
        const nz = p[1] / r
        const out = SLAB.d * 0.35
        dummy.position.set(p[0] + nx * out, -0.15 + 0.27 * s.open, p[1] + nz * out)
        // 面向坑中心，繞切線方向往內倒
        dummy.rotation.set(0, Math.atan2(nx, nz), 0)
        dummy.rotateX(-SLAB_TILT * s.open * (0.6 + rand(i, 7) * 0.6))
        dummy.scale.set(SLAB.w * (0.7 + rand(i, 8) * 0.5), SLAB.h, SLAB.d)
        dummy.updateMatrix()
        sl.setMatrixAt(i, dummy.matrix)
      }
      sl.instanceMatrix.needsUpdate = true
    }

    // 裂痕：從坑邊往外長出來（每條兩段：先長第一段再長第二段）
    const cm = crackMesh.current
    if (cm) {
      cracks.forEach((c, i) => {
        const a = Math.min(1, s.open * 2)
        const b = Math.max(0, s.open * 2 - 1)
        placeSegment(dummy, c.x0 * open, c.z0 * open, c.xm, c.zm, a, c.width)
        cm.setMatrixAt(i * 2, dummy.matrix)
        placeSegment(dummy, c.xm, c.zm, c.x1, c.z1, b, c.width * 0.7)
        cm.setMatrixAt(i * 2 + 1, dummy.matrix)
      })
      cm.instanceMatrix.needsUpdate = true
    }

    // 塵土：從坑口噴起又落下（大小跟著拱起、最後縮成 0）
    const d = dust.current
    if (d) {
      d.visible = s.dust > 0
      if (s.dust > 0) {
        for (let i = 0; i < detail.dust; i++) {
          const p = outline[i % outline.length]!
          const k = 0.6 + rand(i, 9) * 0.6
          dummy.position.set(p[0] * k, 0.3 + DUST_RISE * s.dust * (0.4 + rand(i, 10)), p[1] * k)
          dummy.rotation.set(i, i * 0.7, 0)
          dummy.scale.setScalar((0.25 + rand(i, 11) * 0.35) * s.dust)
          dummy.updateMatrix()
          d.setMatrixAt(i, dummy.matrix)
        }
        d.instanceMatrix.needsUpdate = true
      }
    }

    // 波紋：一圈往外擴、變淡（只一圈）
    const rg = ring.current
    if (rg) {
      rg.visible = s.ripple !== null
      if (s.ripple !== null) {
        const r = width * (0.45 + 0.9 * s.ripple)
        rg.scale.set(r, r * QUAKE.aspect * 1.3, 1)
        if (ringMat.current) ringMat.current.opacity = 0.28 * (1 - s.ripple) * (1 - s.ripple)
      }
    }
  })

  const [px, py, pz] = atPlaza(cx, 0, cz)
  return (
    <group ref={root} position={[px, py, pz]} visible={false}>
      <group ref={ground}>
        <mesh ref={pitMesh} geometry={pit} rotation-x={-Math.PI / 2} renderOrder={-2} receiveShadow>
          {/* 只畫內側（坑壁與坑底）；顏色是頂點色 */}
          <meshStandardMaterial vertexColors side={BackSide} flatShading roughness={1} />
        </mesh>
        <mesh ref={maskMesh} geometry={mask} rotation-x={-Math.PI / 2} position-y={MASK_Y} renderOrder={-1}>
          <meshBasicMaterial colorWrite={false} />
        </mesh>
        <instancedMesh ref={slabs} args={[undefined, undefined, detail.slabs]} frustumCulled={false} renderOrder={-3} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={theme.rim} flatShading roughness={0.9} />
        </instancedMesh>
        <instancedMesh ref={crackMesh} args={[undefined, undefined, cracks.length * 2]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={theme.crack} roughness={1} />
        </instancedMesh>
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.05} visible={false}>
          <ringGeometry args={[0.965, 1, quality === 'low' ? 24 : 48]} />
          <meshBasicMaterial ref={ringMat} color={theme.dust} transparent depthWrite={false} />
        </mesh>
      </group>
      <instancedMesh ref={dust} args={[undefined, undefined, detail.dust]} frustumCulled={false} visible={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={theme.dust} flatShading roughness={1} />
      </instancedMesh>
    </group>
  )
}
