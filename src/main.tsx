import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { FallbackApp } from './ui/FallbackApp'
import { hasWebGL } from './ui/webgl'
import { universe } from './data'
import { isBasket } from './data/schema'
import { detectQuality, parseQualityParam, readEnv } from './scene/quality'
import { parseSandboxQuery, useSandbox } from './store/sandbox'
import { useQuality } from './store/quality'
import { useThemeStore, parseThemeParam, loadTheme } from './store/theme'
import { LEVELS } from './tour/levels'
import { parseTourQuery, isValidPosition } from './tour/engine'
import { loadProgress, useTour } from './store/tour'

const forceFallback = new URLSearchParams(window.location.search).get('fallback') === '1'
const webgl = !forceFallback && hasWebGL(() => document.createElement('canvas'))

// 主題：兩條路（WebGL 與 fallback）都要同步到 <html data-theme>
useThemeStore.getState().setTheme(parseThemeParam(window.location.search) ?? loadTheme())
document.documentElement.dataset.theme = useThemeStore.getState().theme
useThemeStore.subscribe((s) => {
  document.documentElement.dataset.theme = s.theme
})

const baskets = new Set([...universe.values()].filter(isBasket).map((a) => a.id))

if (webgl) {
  const progress = loadProgress()
  useTour.setState({ progress })
  const pinnedQuality = parseQualityParam(window.location.search)
  useQuality.setState({ quality: pinnedQuality ?? detectQuality(readEnv()), pinned: pinnedQuality !== null })
  const tq = parseTourQuery(window.location.search, LEVELS)
  if (tq.mode === 'sandbox' || (!tq.pos && progress.sandboxUnlocked)) {
    useTour.setState({ mode: 'sandbox' })
    useSandbox.setState(parseSandboxQuery(window.location.search, baskets))
  } else {
    useTour.getState().enterStep(tq.pos ?? (progress.pos && isValidPosition(LEVELS, progress.pos) ? progress.pos : { level: 0, step: 0 }))
  }
  if (import.meta.env.DEV) {
    ;(window as unknown as { __BCI_STEPS__: number[] }).__BCI_STEPS__ = LEVELS.map((l) => l.steps.length)
    ;(window as unknown as { __BCI_STEP_IDS__: string[] }).__BCI_STEP_IDS__ = LEVELS.flatMap((l) => l.steps.map((st) => st.id))
    ;(window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__ = LEVELS.flatMap((l) =>
      l.steps.flatMap((st) => (st.until ? [{ id: st.id, control: st.until.control, min: st.until.min }] : [])),
    )
    ;(window as unknown as { __BCI_DEGRADE__?: () => void }).__BCI_DEGRADE__ = () => useQuality.getState().degrade()
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {webgl ? (
      <ErrorBoundary fallback={<FallbackApp />}>
        <App />
      </ErrorBoundary>
    ) : (
      <FallbackApp />
    )}
  </StrictMode>,
)
