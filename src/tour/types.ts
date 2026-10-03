import type { SliceAxis } from '../scene/layout/voxels'
import type { Picked } from '../store/sandbox'
import type { Sector } from '../scene/layout/underground'

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
}

export type Step = {
  id: string
  text: string | ((c: TextContext) => string)
  scene: SceneDirective
  controls?: Control[]
  until?: Condition
}

export type Level = { id: string; title: string; steps: Step[] }
export type Position = { level: number; step: number }
export type Progress = { completed: string[]; sandboxUnlocked: boolean; pos?: Position }
