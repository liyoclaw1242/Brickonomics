import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Group, type InstancedMesh, Object3D } from 'three'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { STORM, STORM_COUNTS, funnelRadius, funnelSway, stormAppear, stormPos } from './tornado'
import { BlockMaterial } from '../materials'
import { ACCENT_COLORS, SECTOR_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from '../stage/plaza'
import { StormCloud } from './StormCloud'
import type { EventProps } from './types'

/** 捲起來的小方塊：城市裡的方塊顏色（積木城市被吹散的碎片） */
const DEBRIS_COLORS = [SECTOR_COLORS.semiconductor, ACCENT_COLORS.loss, '#ffb300', SECTOR_COLORS.electronics, SECTOR_COLORS.software, '#90a4ae']
const CAP_Y = STORM.height + 0.6
const RAIN_RADIUS = 6.5
const RAIN_TOP = STORM.height + 0.5
const RAIN_LEN = 1.3
/** 靜態（減少動態）時漏斗定格的時間：讓它有一點扭，不是一根直筒 */
const STILL_TIME = 1.7

/** 0..1 的固定偽亂數（不每幀配置、每次重整都一樣） */
const rand = (i: number, k: number) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/**
 * 經濟風暴的龍捲風：一圈圈灰藍色的環疊成往地面變細的漏斗（會轉、會扭），頂上一片烏雲，底部捲著幾顆小方塊。
 * 時間來自事件時鐘：t 為 null（鏡頭還沒停下）時藏起來；clock.reduced（減少動態）時不轉、不移動，只擺一個靜止的龍捲風。
 * 每種材質一個 InstancedMesh；useFrame 內不配置物件。持續繪製由事件時鐘（useEventClock）負責。
 */
export function Tornado({ clock, quality }: EventProps) {
  const time = clock.t
  const still = clock.reduced
  const n = STORM_COUNTS[quality]
  const theme = THEMES[useThemeStore((s) => s.theme)].storm
  const root = useRef<Group>(null)
  const cap = useRef<Group>(null)
  const rings = useRef<InstancedMesh>(null)
  const dust = useRef<InstancedMesh>(null)
  const debris = useRef<InstancedMesh>(null)
  const rain = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  // 顏色只在換主題時設定：環由下而上從漏斗色漸變到烏雲色
  useLayoutEffect(() => {
    const c = new Color()
    const a = new Color(theme.funnel)
    const b = new Color(theme.cloud)
    const r = rings.current
    if (r) {
      for (let i = 0; i < n.rings; i++) r.setColorAt(i, c.copy(a).lerp(b, Math.pow(i / (n.rings - 1), 1.5) * 0.7))
      if (r.instanceColor) r.instanceColor.needsUpdate = true
    }
    const d = debris.current
    if (d) {
      for (let i = 0; i < n.debris; i++) d.setColorAt(i, c.set(DEBRIS_COLORS[i % DEBRIS_COLORS.length]!))
      if (d.instanceColor) d.instanceColor.needsUpdate = true
    }
  }, [theme, n.rings, n.debris])

  useFrame(({ clock }) => {
    const g = root.current
    const t = time.current
    if (!g) return
    if (t === null) {
      g.visible = false
      return
    }
    g.visible = true
    const pos = stormPos(t)
    const [px, , pz] = atPlaza(pos.x, 0, pos.z)
    g.position.set(px, 0, pz)
    g.scale.setScalar(still ? 1 : Math.max(0.001, stormAppear(t)))
    const now = still ? STILL_TIME : clock.elapsedTime

    const r = rings.current
    if (r) {
      for (let i = 0; i < n.rings; i++) {
        const h = (i / (n.rings - 1)) * STORM.height
        const rad = funnelRadius(h)
        const sw = funnelSway(h, now)
        // 每圈往不同方向微微傾斜，傾斜方向隨時間轉：看起來在旋
        const spin = now * 2.4 + i * 0.55
        dummy.position.set(sw.dx, h, sw.dz)
        dummy.rotation.set(Math.PI / 2 + 0.16 * Math.cos(spin), 0.16 * Math.sin(spin), spin)
        dummy.scale.set(rad, rad, 0.9 + h * 0.05)
        dummy.updateMatrix()
        r.setMatrixAt(i, dummy.matrix)
      }
      r.instanceMatrix.needsUpdate = true
    }

    const d = dust.current
    if (d) {
      for (let i = 0; i < n.dust; i++) {
        // 沿著漏斗螺旋往上：越低轉越快
        const u = (rand(i, 1) + now * 0.09) % 1
        const h = u * STORM.height
        const sw = funnelSway(h, now)
        const rad = funnelRadius(h) * (0.95 + rand(i, 2) * 0.25)
        const ang = rand(i, 3) * Math.PI * 2 + now * (3.4 - u * 1.8)
        dummy.position.set(sw.dx + Math.cos(ang) * rad, h, sw.dz + Math.sin(ang) * rad)
        dummy.rotation.set(ang, ang * 0.7, 0)
        dummy.scale.setScalar(0.12 + u * 0.22)
        dummy.updateMatrix()
        d.setMatrixAt(i, dummy.matrix)
      }
      d.instanceMatrix.needsUpdate = true
    }

    const b = debris.current
    if (b) {
      for (let i = 0; i < n.debris; i++) {
        const ang = (i / n.debris) * Math.PI * 2 + now * (2 + rand(i, 4) * 0.8)
        const rad = 1.5 + rand(i, 5) * 1.1
        const h = 0.5 + rand(i, 6) * 2.2 + Math.sin(now * 2.2 + i) * 0.35
        dummy.position.set(Math.cos(ang) * rad, h, Math.sin(ang) * rad)
        dummy.rotation.set(now * 2.1 + i, now * 1.7 + i * 2, 0)
        dummy.scale.setScalar(0.42 + rand(i, 7) * 0.18)
        dummy.updateMatrix()
        b.setMatrixAt(i, dummy.matrix)
      }
      b.instanceMatrix.needsUpdate = true
    }

    if (cap.current) cap.current.rotation.y = now * 0.25

    const w = rain.current
    if (w) {
      for (let i = 0; i < n.streaks; i++) {
        // 斜斜落下的細線（風）：每條自己的相位，落到地面就從上面重來
        const fall = (rand(i, 8) + now * 0.55) % 1
        const ang = rand(i, 9) * Math.PI * 2
        const rad = 1.5 + rand(i, 10) * RAIN_RADIUS
        const y = RAIN_TOP * (1 - fall)
        dummy.position.set(Math.cos(ang) * rad - fall * 1.6, y, Math.sin(ang) * rad * 0.6)
        dummy.rotation.set(0, 0, -0.35)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        w.setMatrixAt(i, dummy.matrix)
      }
      w.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group ref={root} visible={false}>
      <instancedMesh ref={rings} args={[undefined, undefined, n.rings]} frustumCulled={false}>
        <torusGeometry args={[1, 0.34, 4, n.ringSegments]} />
        <meshStandardMaterial flatShading roughness={0.9} transparent opacity={0.72} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={dust} args={[undefined, undefined, n.dust]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.dust} flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={debris} args={[undefined, undefined, n.debris]} frustumCulled={false} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <BlockMaterial kind="matte" quality={quality} />
      </instancedMesh>
      <group ref={cap}>
        <StormCloud quality={quality} position={[0, CAP_Y, 0]} bob={!still} />
      </group>
      {n.streaks > 0 && (
        <instancedMesh ref={rain} args={[undefined, undefined, n.streaks]} frustumCulled={false}>
          <boxGeometry args={[0.05, RAIN_LEN, 0.05]} />
          <meshBasicMaterial color={theme.streak} transparent opacity={0.45} depthWrite={false} />
        </instancedMesh>
      )}
      <Callout anchor={[0, CAP_Y + 1.1, 0]} offset={[0, 1.6, 0]} title={T.stage.storm} persistent />
    </group>
  )
}
