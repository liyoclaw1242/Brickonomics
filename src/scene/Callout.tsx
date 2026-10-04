import { Html, Line } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import { MarkIcon } from '../ui/MarkIcon'
import type { Mark } from '../ui/marks'
import type { Vec3 } from './camera'
import { THEMES } from './theme'
import { useAfterFirstTick } from './useAfterFirstTick'

type Props = { anchor: Vec3; offset?: Vec3; title: string; sub?: string; mark?: Mark; dim?: boolean; wrap?: boolean }

export function Callout({ anchor, offset = [0, 2, 0], title, sub, mark, dim = false, wrap = false }: Props) {
  const ready = useAfterFirstTick()
  const show = useThemeStore((s) => s.labels)
  const t = THEMES[useThemeStore((s) => s.theme)]
  if (!show) return null
  const end: Vec3 = [anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]]
  const leader = offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0
  return (
    <group>
      {leader && (
        <>
          <mesh position={anchor}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color={t.calloutLine} />
          </mesh>
          <Line points={[anchor, end]} color={t.calloutLine} lineWidth={1} transparent opacity={dim ? 0.3 : 0.75} />
        </>
      )}
      {ready && (
        <Html position={end} center={!leader} className={`callout${dim ? ' callout--dim' : ''}${wrap ? ' callout--wrap' : ''}`}>
          <span className="callout__title">
            {title}
            {mark && <MarkIcon kind={mark} />}
          </span>
          {sub && <span className="callout__sub">{sub}</span>}
        </Html>
      )}
    </group>
  )
}
