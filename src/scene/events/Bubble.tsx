import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type InstancedMesh, type Mesh, type MeshBasicMaterial, Object3D, ShaderMaterial } from 'three'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { atPlaza } from '../stage/plaza'
import { BUBBLE_DETAIL, bubbleAt, bubbleFinal, bubbleRadii, dropletDirs, liftOf } from './bubble'
import type { EventProps, SpecOf } from './types'

/**
 * 肥皂泡的膜：中間幾乎透明、邊緣亮（菲涅耳），邊緣顏色隨方向在兩個顏色之間變（像肥皂泡的彩虹）。
 * 不受光照影響（泡泡本身不擋光）；uOpacity 給淡入用。
 */
const FILM_VERTEX = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`
const FILM_FRAGMENT = /* glsl */ `
uniform vec3 uRimA;
uniform vec3 uRimB;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  float f = 1.0 - abs(dot(n, normalize(vV)));
  float rim = pow(f, 2.4);
  vec3 col = mix(uRimA, uRimB, 0.5 + 0.5 * sin(n.x * 2.6 + n.y * 3.1));
  gl_FragColor = vec4(col, (0.06 + 0.85 * rim) * uOpacity);
  #include <colorspace_fragment>
}
`

/** 亮點在泡泡表面的方向（左上前方）與大小 */
const HIGHLIGHTS: { dir: [number, number, number]; size: number }[] = [
  { dir: [-0.62, 0.5, 0.6], size: 0.42 },
  { dir: [-0.42, 0.72, 0.55], size: 0.2 },
]
const DROPLET_SIZE = 0.24
const DROPLET_FLY = 0.7
/** 破掉後膜撐開、淡掉的時間（佔水滴飛散的比例） */
const SHRED = 0.35

/**
 * 🫧 泡泡：目標被半透明泡泡包住、浮起；pop 時泡泡一次破成往外飛的小水滴（不閃光），目標掉回地面。
 * 目標本身由舞台畫（讀 bubbleAt 的 lift、squash）；這裡畫泡泡膜、兩個亮點、破掉時的水滴，以及目標浮起時地上的影子。
 * 時間來自事件時鐘：float 的 t 為 null 時藏起來；clock.reduced 時直接畫終點。每種材質一個 mesh／InstancedMesh；useFrame 內不配置物件。
 */
export function Bubble({ spec, clock, quality }: EventProps<SpecOf<'bubble'>>) {
  const theme = THEMES[useThemeStore((s) => s.theme)].bubble
  const detail = BUBBLE_DETAIL[quality]
  const size = spec.target.size
  const radii = useMemo(() => bubbleRadii(size), [size])
  const dirs = useMemo(() => dropletDirs(detail.droplets), [detail.droplets])
  const lift = liftOf(spec)
  const film = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FILM_VERTEX,
        fragmentShader: FILM_FRAGMENT,
        uniforms: { uRimA: { value: new Color() }, uRimB: { value: new Color() }, uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => film.dispose(), [film])
  useLayoutEffect(() => {
    film.uniforms.uRimA!.value.set(theme.rimA)
    film.uniforms.uRimB!.value.set(theme.rimB)
  }, [film, theme])

  const root = useRef<Group>(null)
  const ball = useRef<Group>(null)
  const shine = useRef<InstancedMesh>(null)
  const drops = useRef<InstancedMesh>(null)
  const shadow = useRef<Mesh>(null)
  const shadowMat = useRef<MeshBasicMaterial>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const g = root.current
    const t = clock.t.current
    if (!g) return
    const s = clock.reduced ? bubbleFinal(spec) : bubbleAt(spec, t)
    g.visible = s.bubble > 0 || s.burst !== null || s.lift > 0
    const cy = size[1] / 2 + s.lift
    const sh = shine.current

    // 泡泡膜；剛破掉的一瞬間（水滴飛散的前 SHRED）膜往外撐開、變淡消失（不是閃光：只會變暗）
    const b = ball.current
    if (b) {
      const shred = s.burst !== null && s.burst < SHRED ? s.burst / SHRED : null
      b.visible = s.bubble > 0 || shred !== null
      const k = shred !== null ? 1 + 0.3 * shred : Math.max(0.001, s.bubble * s.strain)
      b.position.set(0, cy, 0)
      b.scale.set(radii[0] * k, radii[1] * k, radii[2] * k)
      film.uniforms.uOpacity!.value = shred !== null ? 0.8 * (1 - shred) : Math.min(1, s.bubble * 1.5)
      if (sh) sh.visible = shred === null
    }

    if (sh) {
      HIGHLIGHTS.forEach((h, i) => {
        const l = Math.hypot(...h.dir)
        dummy.position.set((h.dir[0] / l) * 0.96, (h.dir[1] / l) * 0.96, (h.dir[2] / l) * 0.96)
        dummy.rotation.set(-0.6, -0.5, 0.4)
        dummy.scale.set(h.size / radii[0], (h.size * 0.55) / radii[1], (h.size * 0.25) / radii[2])
        dummy.updateMatrix()
        sh.setMatrixAt(i, dummy.matrix)
      })
      sh.instanceMatrix.needsUpdate = true
    }

    // 破掉：水滴從泡泡表面往外飛、往下掉、越來越小
    const d = drops.current
    if (d) {
      d.visible = s.burst !== null
      if (s.burst !== null) {
        const u = s.burst
        dirs.forEach((dir, i) => {
          const out = 1 + DROPLET_FLY * u
          dummy.position.set(dir[0] * radii[0] * out, cy + dir[1] * radii[1] * out - 5 * u * u, dir[2] * radii[2] * out)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.setScalar(Math.max(0.001, DROPLET_SIZE * (1 - u)))
          dummy.updateMatrix()
          d.setMatrixAt(i, dummy.matrix)
        })
        d.instanceMatrix.needsUpdate = true
      }
    }

    // 地上的影子：浮越高越小、越淡
    const sd = shadow.current
    if (sd) {
      const k = lift > 0 ? Math.min(1, s.lift / lift) : 0
      sd.visible = k > 0.01
      const r = Math.max(size[0], size[2]) * 0.75 * (1 - 0.3 * k)
      sd.scale.set(r, r * (size[2] / Math.max(size[0], 0.001)) ** 0.5, 1)
      if (shadowMat.current) shadowMat.current.opacity = 0.35 * k
    }
  })

  const [px, py, pz] = atPlaza(...spec.target.at)
  return (
    <group ref={root} position={[px, py, pz]} visible={false}>
      <group ref={ball} visible={false}>
        <mesh material={film} renderOrder={4}>
          <sphereGeometry args={[1, detail.segments, Math.round(detail.segments * 0.75)]} />
        </mesh>
        <instancedMesh ref={shine} args={[undefined, undefined, HIGHLIGHTS.length]} frustumCulled={false} renderOrder={5}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={theme.highlight} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </instancedMesh>
      </group>
      <instancedMesh ref={drops} args={[undefined, undefined, dirs.length]} frustumCulled={false} visible={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={theme.drop} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.03} visible={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial ref={shadowMat} color={theme.shadow} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}
