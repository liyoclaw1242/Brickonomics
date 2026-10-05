import type { StageValues } from './types'

/** 拉桿的預設值；放在獨立檔，levels.ts 才不必 import engine（engine 依賴 courses → levels，會循環） */
export const DEFAULT_VALUES: StageValues = { years: 1, periods: 0, phase: 0, frontLoad: 0.015, tick: 0, rate: 0.02, months: 1, bondPct: 0, trades: 0 }
