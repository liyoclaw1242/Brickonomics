import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FallbackApp } from './ui/FallbackApp'
import { hasWebGL } from './ui/webgl'
import { universe } from './data'
import { isBasket } from './data/schema'
import { detectQuality, readEnv } from './scene/quality'
import { parseSandboxQuery, useSandbox } from './store/sandbox'
import { useQuality } from './store/quality'
import { LEVELS } from './tour/levels'
import { parseTourQuery, isValidPosition } from './tour/engine'
import { loadProgress, useTour } from './store/tour'

const forceFallback = new URLSearchParams(window.location.search).get('fallback') === '1'
const webgl = !forceFallback && hasWebGL(() => document.createElement('canvas'))

const baskets = new Set([...universe.values()].filter(isBasket).map((a) => a.id))

if (webgl) {
  const progress = loadProgress()
  useTour.setState({ progress })
  useQuality.getState().setQuality(detectQuality(readEnv()))
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
    ;(window as unknown as { __BCI_DEGRADE__?: () => void }).__BCI_DEGRADE__ = () => useQuality.getState().degrade()
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {webgl ? <App /> : <FallbackApp />}
  </StrictMode>,
)
