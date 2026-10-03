import { create } from 'zustand'
import type { Quality } from '../scene/quality'

type QualityState = {
  quality: Quality
  /** 剛因幀率過低降級，顯示提示 */
  degraded: boolean
  setQuality: (q: Quality) => void
  degrade: () => void
  dismissNotice: () => void
}

export const useQuality = create<QualityState>()((set, get) => ({
  quality: 'high',
  degraded: false,
  setQuality: (q) => set({ quality: q }),
  degrade: () => {
    if (get().quality === 'low') return
    set({ quality: 'low', degraded: true })
  },
  dismissNotice: () => set({ degraded: false }),
}))
