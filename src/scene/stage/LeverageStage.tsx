import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { useThemeStore } from '../../store/theme'
import { THEMES } from '../theme'
import { Color, type InstancedMesh, Object3D } from 'three'
import { T } from '../../ui/strings'
import { Callout } from '../Callout'
import { heightOnPath, waveStepAt } from '../events/wave'
import type { EventClock } from '../events/types'
import { LEV_LAYOUT, levNow } from '../layout/advanced'
import { ACCENT_COLORS } from '../palette'
import { atPlaza } from './plaza'

const KEYS = ['plain', 'double', 'inverse'] as const
const COLORS = [ACCENT_COLORS.stock, ACCENT_COLORS.double, ACCENT_COLORS.inverse]

/**
 * a-lev 槓桿的耗損：三座塔（大盤、2 倍塔、反向塔）站在水裡，起點都是 100。🌊 大浪（scene.event wave）一道一道打過來：
 * 浪頭打到＝大盤跌 10%、退下＝漲 10%。塔高沿 sim/leverage 算好的路徑走（waveStepAt＋heightOnPath）：
 * 大盤和反向塔每道浪少 1%，2 倍塔每道浪少 4%，一次比一次矮（框線＝起點 100）。浪退了才寫最後剩多少。
 */
export function LeverageStage({ event }: { event: EventClock }) {
  const n = useMemo(() => levNow(), [])
  const paths = useMemo(() => KEYS.map((k) => n[k].map((v) => v * LEV_LAYOUT.unit)), [n])
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const wave = event.spec?.kind === 'wave' ? event.spec : undefined
  const done = event.done || event.reduced
  const line = THEMES[useThemeStore((st) => st.theme)].calloutLine

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    COLORS.forEach((c, i) => m.setColorAt(i, new Color(c)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  useFrame(() => {
    const m = ref.current
    if (!m) return
    const step = wave ? waveStepAt(wave, event.reduced ? Infinity : event.t.current) : 0
    paths.forEach((p, i) => {
      const h = heightOnPath(p, step)
      dummy.position.set(...atPlaza(LEV_LAYOUT.x[i]!, h / 2, 0))
      dummy.scale.set(LEV_LAYOUT.w, Math.max(0.001, h), LEV_LAYOUT.w)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })

  const top = 100 * LEV_LAYOUT.unit
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, KEYS.length]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      {/* 起點 100 的高度：只畫框線，矮下去多少一眼看得出來 */}
      {LEV_LAYOUT.x.map((x) => (
        <mesh key={x} position={atPlaza(x, top / 2, 0)}>
          <boxGeometry args={[LEV_LAYOUT.w + 0.1, top, LEV_LAYOUT.w + 0.1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={line} />
        </mesh>
      ))}
      {KEYS.map((k, i) => (
        <Callout
          key={k}
          anchor={atPlaza(LEV_LAYOUT.x[i]!, top + 0.2, 0)}
          offset={[0, 2.2 + (i === 1 ? 1.2 : 0), 0]}
          title={T.lev[k]}
          sub={done ? T.lev.left(n[k].at(-1)!.toFixed(1)) : T.lev.start}
          color={COLORS[i]}
          persistent
        />
      ))}
    </>
  )
}
