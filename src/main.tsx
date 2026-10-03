import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { universe } from './data'
import { isBasket } from './data/schema'
import { parseSandboxQuery, useSandbox } from './store/sandbox'

const baskets = new Set([...universe.values()].filter(isBasket).map((a) => a.id))
useSandbox.setState(parseSandboxQuery(window.location.search, baskets))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
