import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type InstancedMesh, Object3D } from 'three'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { CoinMaterial } from '../CoinDrip'
import { coinScaleAt, HEAT_END } from '../events/heatwave'
import type { EventClock } from '../events/types'
import { INFL_DEMO, INFL_LAYOUT, inflReal, inflStack } from '../layout/intermediate'
import { ACCENT_COLORS } from '../palette'
import { useEventValue } from '../useEventClock'
import { atPlaza } from './plaza'

const BOND_COLOR = '#d4a72c'
const pct0 = (r: number) => `${Math.round(r * 100)}%`

/**
 * b-infl 通膨：左邊一張借據，右邊一排利息金幣（每 1% 一疊）。步驟的 scene.event 是熱浪（events/Heatwave）：
 * 烈日、熱氣線，金幣慢慢融化變小（coinScaleAt），融掉的部分＝通膨吃掉的；剩下的＝真正賺到的（約 利息 − 通膨）。
 */
export function InflationStage({ event }: { event: EventClock }) {
  const heat = event.spec?.kind === 'heatwave' ? event.spec : undefined
  const coins = heat?.coins ?? []
  const ref = useRef<InstancedMesh>(null)
  const ghost = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const n = coins.length * INFL_LAYOUT.perStack
  const melted = useEventValue(event, (t) => !!heat && t !== null && t >= HEAT_END)

  useFrame(() => {
    const m = ref.current
    if (!m || !heat) return
    // 半徑不變、只有高度變矮：剩下的高度＝剩下的利息（約 39%）
    const k = Math.max(0.001, coinScaleAt(heat, event.reduced ? Infinity : event.t.current))
    const { radius: r, height } = inflStack(k)
    // 每枚金幣的厚度＝整疊高度 ÷ 枚數（高度只從 inflStack 來）
    const pitch = height / INFL_LAYOUT.perStack
    coins.forEach((c, i) => {
      for (let j = 0; j < INFL_LAYOUT.perStack; j++) {
        dummy.position.set(...atPlaza(c[0], c[1] + (j + 0.5) * pitch, c[2]))
        dummy.rotation.set(0, j * 0.4, 0)
        dummy.scale.set(r, pitch / INFL_LAYOUT.coinH, r)
        dummy.updateMatrix()
        m.setMatrixAt(i * INFL_LAYOUT.perStack + j, dummy.matrix)
      }
    })
    m.instanceMatrix.needsUpdate = true
    // 原本的高度留一個淡淡的外框：一眼看出「剩下約 4 成」
    const g = ghost.current
    if (g) {
      const full = inflStack(1).height
      coins.forEach((c, i) => {
        dummy.position.set(...atPlaza(c[0], c[1] + full / 2, c[2]))
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(r * 1.02, full, r * 1.02)
        dummy.updateMatrix()
        g.setMatrixAt(i, dummy.matrix)
      })
      g.instanceMatrix.needsUpdate = true
      g.visible = k < 0.98
    }
  })

  const [bw, bh, bd] = INFL_LAYOUT.bond
  const mid = coins.length > 0 ? (coins[0]![0] + coins[coins.length - 1]![0]) / 2 : 0
  return (
    <>
      <mesh position={atPlaza(INFL_LAYOUT.bondX, bh / 2, 0)} castShadow>
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial color={BOND_COLOR} roughness={0.45} metalness={0.3} />
      </mesh>
      {n > 0 && (
        <instancedMesh ref={ref} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
          <cylinderGeometry args={[1, 1, INFL_LAYOUT.coinH * 0.9, 24]} />
          <CoinMaterial />
        </instancedMesh>
      )}
      {coins.length > 0 && (
        <instancedMesh ref={ghost} args={[undefined, undefined, coins.length]} frustumCulled={false} visible={false}>
          <cylinderGeometry args={[1, 1, 1, 24, 1, true]} />
          <meshBasicMaterial color={ACCENT_COLORS.coin} transparent opacity={0.16} depthWrite={false} side={DoubleSide} />
        </instancedMesh>
      )}
      <Callout anchor={atPlaza(INFL_LAYOUT.bondX, bh, 0)} offset={[0, 1.6, 0]} title={T.infl.bond(pct0(INFL_DEMO.nominal))} persistent />
      <Callout
        anchor={atPlaza(mid, 0.1, INFL_LAYOUT.coinR)}
        offset={[0, -0.3, 2.6]}
        title={melted ? T.infl.real(pct0(inflReal())) : T.infl.coins(pct0(INFL_DEMO.nominal))}
        sub={melted ? T.infl.eaten(pct0(INFL_DEMO.inflation)) : undefined}
        color={ACCENT_COLORS.coin}
        persistent
      />
    </>
  )
}
