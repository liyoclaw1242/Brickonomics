import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { universe } from './data'
import { isBasket } from './data/schema'
import { parseSandboxQuery, useSandbox } from './store/sandbox'
import { LEVELS } from './tour/levels'
import { parseTourQuery } from './tour/engine'
import { loadProgress, useTour } from './store/tour'

const baskets = new Set([...universe.values()].filter(isBasket).map((a) => a.id))

const progress = loadProgress()
useTour.setState({ progress })
const tq = parseTourQuery(window.location.search, LEVELS)
if (tq.mode === 'sandbox' || (!tq.pos && progress.sandboxUnlocked)) {
  useTour.setState({ mode: 'sandbox' })
  useSandbox.setState(parseSandboxQuery(window.location.search, baskets))
} else {
  useTour.getState().enterStep(tq.pos ?? { level: 0, step: 0 })
}
if (import.meta.env.DEV) {
  ;(window as unknown as { __BCI_STEPS__: number[] }).__BCI_STEPS__ = LEVELS.map((l) => l.steps.length)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
