import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import { checkupOf } from '../../data/fundCheckup'
import { useThemeStore } from '../../store/theme'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { regionTiles } from '../layout/practice'
import { NameLabel } from '../NameLabel'
import { ACCENT_COLORS } from '../palette'
import { THEMES } from '../theme'
import { atPlaza } from './plaza'

const THICK = 0.4
/** 點亮的顏色：島越亮越往這個暖白色混 */
const LIT = '#fff1c1'
/** 標註寫名字的島：最大的三座；其他的用小字 */
const CALLOUT_TOP = 3

/**
 * x-where 錢放在哪（真資料）：廣場上一張簡單的地圖，每個區域一座方形島，面積 ∝ 比例、最大的最亮（點亮）。
 * 現金不是區域：一塊現金綠的板子。所有島共用一個 InstancedMesh（每座一個顏色）。
 */
export function RegionStage({ fund }: { fund: string }) {
  const f = checkupOf(fund)
  const tiles = useMemo(() => regionTiles(f), [f])
  const theme = THEMES[useThemeStore((s) => s.theme)]
  const land = useMemo(() => tiles.filter((t) => !t.cash), [tiles])
  const cash = tiles.find((t) => t.cash)
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const base = new Color(theme.island.US)
    const lit = new Color(LIT)
    const c = new Color()
    land.forEach((t, i) => {
      dummy.position.set(...atPlaza(t.x, THICK / 2, t.z))
      dummy.scale.set(t.side, THICK, t.side)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, c.copy(base).lerp(lit, t.glow))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [land, theme, dummy, invalidate])

  const pct = (v: number) => v.toFixed(1)
  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, land.length]} receiveShadow castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      {cash && (
        <mesh position={atPlaza(cash.x, THICK / 2, cash.z)} receiveShadow castShadow>
          <boxGeometry args={[cash.side, THICK, cash.side]} />
          <meshStandardMaterial color={ACCENT_COLORS.cash} roughness={0.85} />
        </mesh>
      )}
      {land.slice(0, CALLOUT_TOP).map((t, i) => (
        <Callout key={t.name} anchor={atPlaza(t.x, THICK, t.z)} offset={i === 0 ? [0, 2.4, 0] : [0, 2.2, 0]} title={T.checkup.region(t.zh, pct(t.pct))} color={LIT} persistent />
      ))}
      {[...land.slice(CALLOUT_TOP), ...(cash ? [cash] : [])].map((t) => (
        <NameLabel key={t.name} position={atPlaza(t.x, THICK + 0.2, t.z + t.side / 2 + 1.3)} text={T.checkup.region(t.zh, pct(t.pct))} className="name-label--city" />
      ))}
    </>
  )
}
