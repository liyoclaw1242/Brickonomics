import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useThemeStore } from '../store/theme'
import { useTour } from '../store/tour'
import { availableCourses } from '../tour/courses'
import { courseById } from '../tour/engine'
import type { CourseId } from '../tour/types'
import { T } from './strings'

/** 右上工具列：換階、主題（重繪由 Lighting 訂閱主題後 invalidate）、標註、圖例；沙盒另有「重看導覽」。 */
export function Toolbar() {
  const theme = useThemeStore((s) => s.theme)
  const labels = useThemeStore((s) => s.labels)
  const legend = useThemeStore((s) => s.legend)
  const mode = useTour((s) => s.mode)
  const course = useTour((s) => s.course)
  const { toggleTheme, toggleLabels, toggleLegend } = useThemeStore.getState()
  return (
    <nav className="toolbar" aria-label={T.toolbarLabel}>
      {mode === 'sandbox' && (
        <button className="pill" onClick={() => useTour.getState().restartCourse()}>
          {T.toolbar.replay}
        </button>
      )}
      {/* 換階：膠囊顯示目前階，點開選單。還沒選課（開場卡）時不顯示 */}
      {course !== null && <CourseSwitcher current={course} />}
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

const MENU_ID = 'course-menu'

/**
 * 換階選單（menu button 模式）：Enter／空白／↓ 打開並聚焦目前階，↑↓ Home End 移動，Enter 選，
 * Escape 或 Tab 關閉、焦點回到膠囊；點選單外面也會關。
 */
function CourseSwitcher({ current }: { current: CourseId }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const wrap = useRef<HTMLDivElement>(null)
  const courses = availableCourses()
  const name = courseById(current).name

  useEffect(() => {
    if (!open) return
    const i = Math.max(0, courses.findIndex((c) => c.id === current))
    items.current[i]?.focus()
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
    // 只在打開時聚焦一次（current 變了選單會關上）
  }, [open])

  const close = (focusTrigger: boolean) => {
    setOpen(false)
    if (focusTrigger) trigger.current?.focus()
  }
  const choose = (id: CourseId) => {
    close(true)
    if (id !== current || useTour.getState().mode === 'sandbox') useTour.getState().switchCourse(id)
  }
  const onMenuKey = (e: KeyboardEvent) => {
    const n = courses.length
    const at = items.current.findIndex((el) => el === document.activeElement)
    const move = (i: number) => {
      e.preventDefault()
      items.current[((i % n) + n) % n]?.focus()
    }
    if (e.key === 'ArrowDown') move(at + 1)
    else if (e.key === 'ArrowUp') move(at - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(n - 1)
    else if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'Tab') close(false)
  }

  return (
    <div className="course-switch" ref={wrap}>
      <button
        ref={trigger}
        className="pill course-switch__pill"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? MENU_ID : undefined}
        aria-label={T.course.switchLabel(name)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        {T.course.pill(name)}
      </button>
      {open && (
        <div className="course-switch__menu" role="menu" id={MENU_ID} aria-label={T.course.menuLabel} onKeyDown={onMenuKey}>
          {courses.map((c, i) => (
            <button
              key={c.id}
              ref={(el) => {
                items.current[i] = el
              }}
              role="menuitemradio"
              aria-checked={c.id === current}
              tabIndex={-1}
              className="course-switch__item"
              onClick={() => choose(c.id)}
            >
              <span className="course-switch__name">{c.name}</span>
              <span className="course-switch__note">{c.tagline}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
