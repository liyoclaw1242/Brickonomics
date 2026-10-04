import { useThemeStore } from '../store/theme'
import { useTour } from '../store/tour'
import { T } from './strings'

/** 右上工具列：主題（重繪由 Lighting 訂閱主題後 invalidate）、標註、圖例；沙盒另有「重看導覽」。 */
export function Toolbar() {
  const theme = useThemeStore((s) => s.theme)
  const labels = useThemeStore((s) => s.labels)
  const legend = useThemeStore((s) => s.legend)
  const mode = useTour((s) => s.mode)
  const { toggleTheme, toggleLabels, toggleLegend } = useThemeStore.getState()
  return (
    <nav className="toolbar" aria-label={T.toolbarLabel}>
      {mode === 'sandbox' && (
        <button className="pill" onClick={() => useTour.getState().restartTour()}>
          {T.toolbar.replay}
        </button>
      )}
      {/* 文字顯示目前主題，按下切換到另一個 */}
      <button className="pill" title={T.themeLabel} onClick={toggleTheme}>
        {theme === 'dusk' ? T.toolbar.dusk : T.toolbar.day}
      </button>
      <button className="pill" aria-pressed={labels} onClick={toggleLabels}>
        {T.toolbar.labels}
      </button>
      <button className="pill" aria-pressed={legend} onClick={toggleLegend}>
        {T.toolbar.legend}
      </button>
    </nav>
  )
}
