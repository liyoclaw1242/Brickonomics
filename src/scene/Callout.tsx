import { Html, Line } from '@react-three/drei'
import { useThemeStore } from '../store/theme'
import { MarkIcon } from '../ui/MarkIcon'
import type { Mark } from '../ui/marks'
import type { Vec3 } from './camera'
import { THEMES } from './theme'
import { useAfterFirstTick } from './useAfterFirstTick'

type Props = {
  anchor: Vec3
  offset?: Vec3
  title: string
  sub?: string
  marks?: Mark[]
  dim?: boolean
  wrap?: boolean
  /**
   * 「標註」開關關掉時，非 persistent 的標註（名稱類）整個隱藏（含指引線）；
   * persistent（內容、提醒、圖例、帶標示圖示的數字）連同指引線一律留著。NameLabel 也一併隱藏。
   */
  persistent?: boolean
}

export function Callout({ anchor, offset = [0, 2, 0], title, sub, marks, dim = false, wrap = false, persistent = false }: Props) {
  const ready = useAfterFirstTick()
  const labels = useThemeStore((s) => s.labels)
  const t = THEMES[useThemeStore((s) => s.theme)]
  if (!labels && !persistent) return null
  const end: Vec3 = [anchor[0] + offset[0], anchor[1] + offset[1], anchor[2] + offset[2]]
  const leader = offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0
  const opacity = dim ? 0.3 : 0.75
  // 框往引線外側長：向左的引線框在左，向右在右，垂直或沒有引線就置中
  const side = offset[0] < 0 ? 'callout--left' : offset[0] > 0 ? 'callout--right' : ''
  // drei 的 Html 會把 inline transform 放在外層（center ? translate(-50%,-50%) : none），所以位移放在內層 div
  return (
    <group>
      {leader && (
        <>
          <mesh position={anchor} renderOrder={11}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshBasicMaterial color={t.calloutLine} transparent opacity={opacity} depthTest={false} />
          </mesh>
          <Line points={[anchor, end]} color={t.calloutLine} lineWidth={1} transparent opacity={opacity} depthTest={false} renderOrder={10} />
        </>
      )}
      {ready && (
        <Html position={end} center={!side}>
          <div className={`callout${side ? ` ${side}` : ''}${dim ? ' callout--dim' : ''}${wrap ? ' callout--wrap' : ''}`}>
            <span className="callout__title">
              {title}
              {marks?.map((k) => <MarkIcon key={k} kind={k} />)}
            </span>
            {sub && <span className="callout__sub">{sub}</span>}
          </div>
        </Html>
      )}
    </group>
  )
}
