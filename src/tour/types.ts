import type { SliceAxis } from '../scene/layout/voxels'
import type { Picked } from '../store/sandbox'
import type { Sector } from '../scene/layout/underground'
import type { Mark } from '../ui/marks'
import type { FeeRaceRow } from '../sim/feeRace'

export type { Mark }

export type CameraPresetId = 'sky' | 'overview' | 'tw' | 'us' | 'exchange' | 'exchangeWide' | 'exchangeSide' | 'plaza' | 'plazaNear' | 'underground'

export type Motion = 'still' | 'up' | 'down' | 'shake'
export type HeldItem = { assetId: string; motion: Motion; amplitude?: number }

/** 每一步在畫面上的教學視覺 */
export type Stage =
  | { kind: 'none' }
  | { kind: 'held'; items: HeldItem[] }
  | { kind: 'exdiv'; outcome: 'fill' | 'gap' }
  /** ranks：每張借據下面寫「穩不穩、利息多少」 */
  | { kind: 'bonds'; stressed: boolean; ranks?: boolean }
  /** other：另一位經理人（怪手換顏色、標註不同） */
  | { kind: 'excavator'; meter: boolean; other?: boolean }
  /** etf false：只比同一檔基金的前收、後收兩座塔（導覽在 ETF 那一章之前，還沒教 0050）；預設 true（三座） */
  | { kind: 'feeRace'; etf?: boolean }
  | { kind: 'accumulate' }
  | { kind: 'principalTrap' }
  | { kind: 'ticker' }
  | { kind: 'shock'; active: boolean }
  | { kind: 'overlap'; a: string; b: string }
  | { kind: 'underground'; show: 'strata' | 'cores' | 'dig' | 'veins' | 'gold'; cores?: [string, string] }

export type StageKind = Stage['kind']

/** 舞台用的拉桿值（由導覽 store 持有） */
export type StageValues = { years: number; periods: number; phase: number; frontLoad: number }
export type ValueKey = keyof StageValues
export type Control = 'slice' | 'explode' | ValueKey
/** 要讓「下一步」可按，control 的值必須 ≥ min */
export type Condition = { control: Control; min: number }
export type TourValues = StageValues & { slice: number; explode: number }

/** 進入一步時套用的場景；未填的 slice/explode/picked/sliceAxis 會重設為預設值，product 未填則不變 */
export type SceneDirective = {
  camera: CameraPresetId
  /** 進入時先把鏡頭放到這裡再移動（序章從雲端降落用） */
  cameraFrom?: CameraPresetId
  product?: string | null
  slice?: number
  sliceAxis?: SliceAxis
  explode?: number
  picked?: Picked
  stage?: Stage
  values?: Partial<StageValues>
  /** 城市大樓名稱標籤，預設 true */
  cityLabels?: boolean
}

/** 課程文字需要的資料查詢；數字一律即時計算，不寫死 */
export type TextContext = {
  weightPct: (productId: string, holdingId: string) => number
  shock: (productId: string) => number
  sectorPct: (productId: string, sector: Sector) => number
  /** 每年內扣費用（小數，例如 0.002）；資料沒有時為 undefined */
  expenseRatio: (productId: string) => number | undefined
  /** 兩檔籃子前幾大持股的重疊比例（0–1） */
  overlapShared: (a: string, b: string) => number
  /** 籃子裡股票（含「其他美股」這類股票彙總桶）或借據（各種債券）的權重合計（%）；現金不算 */
  assetClassPct: (productId: string, kind: 'stock' | 'bond') => number
  /** 持有 years 年後賣出的遞延手續費率（出門費，小數）；超出資料表為 0 */
  exitFee: (productId: string, years: number) => number
  /** 同一檔基金的前收、後收（投入 100＝100 萬、報酬 0，只比費用）；進門費、出門費另外拆出來 */
  fundFeeRows: (years: number, frontLoad: number) => FeeRaceRow[]
}

/** 大數字卡：value 已格式化；fraction（0–1）畫色條；colorKey 對應物體顏色；note＝標籤下一行白話補充（例如為什麼是「至少」） */
export type BigNumber = { value: string; label: string; fraction?: number; mark?: Mark; colorKey?: string; note?: string }

/** 帶引線的標註：錨在籃子裡的某個持股，或城市裡的某棟大樓 */
export type CalloutSpec = {
  anchor: { kind: 'holding'; holdingId: string } | { kind: 'building'; id: string }
  title: string | ((c: TextContext) => string)
  sub?: string | ((c: TextContext) => string)
  /** 拉桿到這個值才顯示（例如拆開之後才標出每一層的名字） */
  when?: Condition
}

/** 課程最後的回顧：一個圖示＋一句短話 */
export type RecapLine = { icon: string; text: string }

export type LessonText = string | ((c: TextContext) => string)

export type Step = {
  id: string
  /** 短標題（≤ 8 字） */
  title: string
  /** 一句話（≤ 20 字，不含 **）；`**詞**` 強調，`**詞|鍵**` 加顏色連結 */
  line: LessonText
  /** 多說一點（預設收起） */
  more: LessonText
  /** 文字版（沒有 3D）專用的一句話；未填則沿用 line */
  fallbackLine?: LessonText
  /** 文字版（沒有 3D）專用的多說一點；未填則沿用 more */
  fallbackMore?: LessonText
  mark?: 'illustrative' | 'assumption'
  /** 回傳 undefined 時不顯示大數字（例如資料沒有內扣費用）；values＝導覽目前的拉桿值（跟著拉桿即時變） */
  bigNumber?: (c: TextContext, values: Readonly<StageValues>) => BigNumber | undefined
  focus?: { holdings?: string[] }
  /** 面板上的回顧清單（最後一步用；文字版也顯示） */
  recap?: RecapLine[]
  callouts?: CalloutSpec[]
  scene: SceneDirective
  controls?: Control[]
  /** 這一步拉桿可拖的範圍（未填用預設範圍）；例如 s-6 的時間軸只到配發那一刻 */
  ranges?: Partial<Record<Control, [number, number]>>
  until?: Condition
}

export type Level = { id: string; title: string; steps: Step[] }

/** 三門獨立的課（初階／中階／高階） */
export type CourseId = 'beginner' | 'intermediate' | 'advanced'
/** 課程裡的一章：id 在同一門課內唯一；stepIds＝步驟池裡的步驟 id（照課程順序） */
export type CourseChapter = { id: string; icon: string; name: string; stepIds: readonly string[] }
/** available false＝還沒開放（開場卡、換階選單、網址都不能進入） */
export type Course = { id: CourseId; name: string; tagline: string; chapters: readonly CourseChapter[]; available: boolean }
/** 舊版（Plan 5 以前）的絕對位置：LEVELS 的章與步；只剩存檔／網址遷移在用 */
export type Position = { level: number; step: number }
/** 課程裡的位置：index＝課內扁平索引（0 起） */
export type CoursePosition = { course: CourseId; index: number }
/** 進度（每門課分開記）；sandboxUnlocked：上完任一門課就解鎖自由玩 */
export type Progress = {
  /** 目前選的課；null＝還沒選（第一次來，顯示開場卡） */
  course: CourseId | null
  /** 存檔時所在步驟的 id（找回位置用） */
  stepId?: string
  /** 每門課已完成的章（章 id） */
  completed: Record<CourseId, string[]>
  /** 上完（走過結尾步）的課 */
  finished: CourseId[]
  sandboxUnlocked: boolean
  /** 每門課最後停的步驟 id：換階回到還沒上完的課時從這裡繼續 */
  lastStep?: Partial<Record<CourseId, string>>
}
