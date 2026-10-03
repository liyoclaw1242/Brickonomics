import { create } from 'zustand'
import type { Quality } from '../scene/quality'

type QualityState = {
  quality: Quality
  /** 剛因幀率過低降級，顯示提示 */
  degraded: boolean
  /** 由網址指定畫質時鎖定，不做自動降級 */
  pinned: boolean
  setQuality: (q: Quality) => void
  degrade: () => void
  dismissNotice: () => void
}

export const useQuality = create<QualityState>()((set, get) => ({
  quality: 'high',
  degraded: false,
  pinned: false,
  setQuality: (q) => set({ quality: q }),
  degrade: () => {
    if (get().pinned || get().quality === 'low') return
    set({ quality: 'low', degraded: true })
  },
  dismissNotice: () => set({ degraded: false }),
}))
