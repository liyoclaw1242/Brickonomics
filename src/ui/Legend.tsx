import { SECTOR_COLORS } from '../scene/palette'
import { THEMES } from '../scene/theme'
import { useThemeStore } from '../store/theme'
import { T } from './strings'

const SECTORS = (Object.keys(T.sectors) as (keyof typeof T.sectors)[]).filter((k) => k !== 'unclassified')

/** 工具列下方的產業色票列（🎨 圖例打開時才顯示） */
export function Legend() {
  const show = useThemeStore((s) => s.legend)
  const unclassified = THEMES[useThemeStore((s) => s.theme)].unclassified
  if (!show) return null
  return (
    <ul className="legend-bar" aria-label={T.legendLabel}>
      {SECTORS.map((k) => (
        <li key={k}>
          <i style={{ background: SECTOR_COLORS[k] ?? unclassified }} />
          {T.sectors[k]}
        </li>
      ))}
      <li>
        <i style={{ background: unclassified }} />
        {T.sectors.unclassified}
      </li>
    </ul>
  )
}
