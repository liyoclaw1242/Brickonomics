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
import { COURSES } from './tour/courses'
import { parseCourseQuery, queryPosition, startOfCourse, stepsOf } from './tour/engine'
import { loadProgress, useTour } from './store/tour'

const forceFallback = new URLSearchParams(window.location.search).get('fallback') === '1'
const webgl = !forceFallback && hasWebGL(() => document.createElement('canvas'))

// 主題：兩條路（WebGL 與 fallback）都要同步到 <html data-theme>
// ?theme= 只是預覽，不寫入 localStorage
useThemeStore.setState({ theme: parseThemeParam(window.location.search) ?? loadTheme() })
document.documentElement.dataset.theme = useThemeStore.getState().theme
useThemeStore.subscribe((s) => {
  document.documentElement.dataset.theme = s.theme
})

const baskets = new Set([...universe.values()].filter(isBasket).map((a) => a.id))

/**
 * DEV 事件預覽頁（?eventPreview=<kind>，見 src/scene/events/preview.ts）：只在 DEV。
 * 條件直接寫 import.meta.env.DEV，正式版打包時整段（含動態 import）被拿掉；npm run build 之後由 scripts/check-dev-only.mjs 確認。
 */
const eventPreview = import.meta.env.DEV && webgl && new URLSearchParams(window.location.search).has('eventPreview')

if (webgl && !eventPreview) {
  const progress = loadProgress()
  useTour.setState({ progress })
  const pinnedQuality = parseQualityParam(window.location.search)
  useQuality.setState({ quality: pinnedQuality ?? detectQuality(readEnv()), pinned: pinnedQuality !== null })
  const cq = parseCourseQuery(window.location.search)
  // 課程：網址 ?course=&step= 優先（舊 ?route=、?level=&step= 也轉得過來），再來是存檔；第一次來是 null（面板先顯示開場卡）
  const start = startOfCourse(progress, cq)
  useTour.setState({ course: start.course, pos: start.pos })
  if (cq.mode === 'sandbox' || (!queryPosition(cq) && progress.sandboxUnlocked)) {
    useTour.setState({ mode: 'sandbox' })
    useSandbox.setState(parseSandboxQuery(window.location.search, baskets))
  } else {
    useTour.getState().enterStep(start.pos)
  }
  if (import.meta.env.DEV) {
    const available = COURSES.filter((c) => c.available)
    // 每門課的步驟 id（照課程順序）；e2e／截圖腳本用 ?course=&step= 走
    ;(window as unknown as { __BCI_COURSES__: Record<string, string[]> }).__BCI_COURSES__ = Object.fromEntries(available.map((c) => [c.id, stepsOf(c.id).map((st) => st.id)]))
    ;(window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__ = available.flatMap((c) =>
      stepsOf(c.id).flatMap((st) => (st.until ? [{ id: st.id, control: st.until.control, min: st.until.min }] : [])),
    )
    ;(window as unknown as { __BCI_DEGRADE__?: () => void }).__BCI_DEGRADE__ = () => useQuality.getState().degrade()
  }
}

if (import.meta.env.DEV && eventPreview) {
  void import('./scene/events/EventPreview').then(({ mountEventPreview }) => {
    if (!mountEventPreview(document.getElementById('root')!)) document.body.textContent = `unknown eventPreview kind`
  })
} else {
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
}
