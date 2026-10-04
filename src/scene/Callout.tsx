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
  /** 窄邊距的小字塊（地層名稱這類一層一個、上下很密的標註） */
  compact?: boolean
  /**
   * 「標註」開關只藏非 persistent 的標註（名稱類，連同引線）和 NameLabel。
   * persistent 的標註（內容、提醒、圖例、帶標示圖示的數字）連同引線一律留著。
   */
  persistent?: boolean
  /** 3b1b 顏色連結：標題前的小色點與引線錨點用這個顏色（和物體、課文關鍵詞同色） */
  color?: string
}

export function Callout({ anchor, offset = [0, 2, 0], title, sub, marks, dim = false, wrap = false, compact = false, persistent = false, color }: Props) {
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
            <sphereGeometry args={[color ? 0.18 : 0.12, 12, 12]} />
            <meshBasicMaterial color={color ?? t.calloutLine} transparent opacity={color ? 1 : opacity} depthTest={false} />
          </mesh>
          <Line points={[anchor, end]} color={t.calloutLine} lineWidth={1} transparent opacity={opacity} depthTest={false} renderOrder={10} />
        </>
      )}
      {ready && (
        <Html position={end} center={!side}>
          <div className={`callout${side ? ` ${side}` : ''}${dim ? ' callout--dim' : ''}${wrap ? ' callout--wrap' : ''}${compact ? ' callout--compact' : ''}`}>
            <span className="callout__title">
              {color && <span className="callout__dot" style={{ background: color }} />}
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
