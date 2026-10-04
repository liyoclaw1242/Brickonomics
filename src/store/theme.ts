import { create } from 'zustand'
import type { ThemeId } from '../scene/theme'

const KEY = 'block-city-invest:theme'

export function parseThemeParam(search: string): ThemeId | null {
  const t = new URLSearchParams(search).get('theme')
  return t === 'day' || t === 'dusk' ? t : null
}

function loadTheme(): ThemeId {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'day' ? 'day' : 'dusk'
  } catch {
    return 'dusk'
  }
}

function saveTheme(t: ThemeId) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // 只是方便功能
  }
}

type ThemeState = {
  theme: ThemeId
  labels: boolean
  legend: boolean
  setTheme: (t: ThemeId) => void
  toggleTheme: () => void
  toggleLabels: () => void
  toggleLegend: () => void
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: 'dusk',
  labels: true,
  legend: false,
  setTheme: (t) => {
    saveTheme(t)
    set({ theme: t })
  },
  toggleTheme: () => get().setTheme(get().theme === 'dusk' ? 'day' : 'dusk'),
  toggleLabels: () => set({ labels: !get().labels }),
  toggleLegend: () => set({ legend: !get().legend }),
}))

export { loadTheme }
