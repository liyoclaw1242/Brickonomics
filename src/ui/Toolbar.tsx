import { useThemeStore } from '../store/theme'
import { useTour } from '../store/tour'
import { T } from './strings'

/** 右上工具列：路線（簡單版／完整版）、主題（重繪由 Lighting 訂閱主題後 invalidate）、標註、圖例；沙盒另有「重看導覽」。 */
export function Toolbar() {
  const theme = useThemeStore((s) => s.theme)
  const labels = useThemeStore((s) => s.labels)
  const legend = useThemeStore((s) => s.legend)
  const mode = useTour((s) => s.mode)
  const route = useTour((s) => s.route)
  const { toggleTheme, toggleLabels, toggleLegend } = useThemeStore.getState()
  return (
    <nav className="toolbar" aria-label={T.toolbarLabel}>
      {mode === 'sandbox' && (
        <button className="pill" onClick={() => useTour.getState().restartTour()}>
          {T.toolbar.replay}
        </button>
      )}
      {/* 路線：兩個名字都看得到、目前的那個亮；按下換到另一個（停在新路線裡這一步或它之前最近的一步）。還沒選（開始卡片）時不顯示 */}
      {route !== null && (
        <button
          className="pill route-pill"
          title={T.route.switchLabel}
          aria-label={T.route.action(T.route.names[route], T.route.names[route === 'simple' ? 'full' : 'simple'])}
          onClick={() => useTour.getState().setRoute(route === 'simple' ? 'full' : 'simple')}
        >
          <span className={route === 'simple' ? 'route-pill__on' : 'route-pill__off'}>{T.route.names.simple}</span>
          {T.route.sep}
          <span className={route === 'full' ? 'route-pill__on' : 'route-pill__off'}>{T.route.names.full}</span>
        </button>
      )}
      {/* 文字顯示目前主題，按下切換到另一個 */}
      <button
        className="pill"
        title={T.themeLabel}
        aria-label={theme === 'dusk' ? T.themeAction(T.toolbar.dusk, T.themeNames.day) : T.themeAction(T.toolbar.day, T.themeNames.dusk)}
        onClick={toggleTheme}
      >
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
