import type { SliceAxis } from '../scene/layout/voxels'
import type { Picked } from '../store/sandbox'
import type { Sector } from '../scene/layout/underground'
import type { Mark } from '../ui/marks'

export type { Mark }

export type CameraPresetId = 'sky' | 'overview' | 'tw' | 'us' | 'exchange' | 'exchangeWide' | 'exchangeSide' | 'plaza' | 'plazaNear' | 'underground'

export type Motion = 'still' | 'up' | 'down' | 'shake'
export type HeldItem = { assetId: string; motion: Motion; amplitude?: number }

/** 每一步在畫面上的教學視覺 */
export type Stage =
  | { kind: 'none' }
  | { kind: 'held'; items: HeldItem[] }
  | { kind: 'exdiv'; outcome: 'fill' | 'gap' }
  | { kind: 'bonds'; stressed: boolean }
  | { kind: 'excavator'; meter: boolean }
  | { kind: 'feeRace' }
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
}

/** 大數字卡：value 已格式化；fraction（0–1）畫色條；colorKey 對應物體顏色 */
export type BigNumber = { value: string; label: string; fraction?: number; mark?: Mark; colorKey?: string }

/** 帶引線的標註：錨在籃子裡的某個持股，或城市裡的某棟大樓 */
export type CalloutSpec = {
  anchor: { kind: 'holding'; holdingId: string } | { kind: 'building'; id: string }
  title: string | ((c: TextContext) => string)
  sub?: string | ((c: TextContext) => string)
}

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
  callouts?: CalloutSpec[]
  scene: SceneDirective
  controls?: Control[]
  until?: Condition
}

export type Level = { id: string; title: string; steps: Step[] }
export type Position = { level: number; step: number }
export type Progress = { completed: string[]; sandboxUnlocked: boolean; pos?: Position }
