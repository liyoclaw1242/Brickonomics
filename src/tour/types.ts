import type { SliceAxis } from '../scene/layout/voxels'
import type { Picked } from '../store/sandbox'
import type { Sector } from '../scene/layout/underground'
import type { Mark } from '../ui/marks'
import type { FeeRaceRow } from '../sim/feeRace'
import type { HedgeExample } from '../sim/hedge'
import type { EventSpec } from '../scene/events/types'
import type { FundCheckup } from '../data/fundCheckup'

export type { Mark }

export type CameraPresetId = 'sky' | 'overview' | 'tw' | 'us' | 'exchange' | 'exchangeWide' | 'exchangeSide' | 'plaza' | 'plazaNear' | 'underground'

export type Motion = 'still' | 'up' | 'down' | 'shake'
export type HeldItem = { assetId: string; motion: Motion; amplitude?: number }

/** 每一步在畫面上的教學視覺 */
export type Stage =
  | { kind: 'none' }
  | { kind: 'held'; items: HeldItem[] }
  | { kind: 'exdiv'; outcome: 'fill' | 'gap' }
  /** ranks：每張借據下面寫「穩不穩、利息多少」；受損程度由 scene.event（tornado）決定 */
  | { kind: 'bonds'; ranks?: boolean }
  /** other：另一位經理人（怪手換顏色、標註不同） */
  | { kind: 'excavator'; meter: boolean; other?: boolean }
  /** etf false：只比同一檔基金的前收、後收兩座塔（導覽在 ETF 那一章之前，還沒教 0050）；預設 true（三座） */
  | { kind: 'feeRace'; etf?: boolean }
  | { kind: 'accumulate' }
  | { kind: 'principalTrap' }
  | { kind: 'ticker' }
  /** 台積電跌 30% 的比較；烏雲與閃電由 scene.event（lightning gather／strike）決定 */
  | { kind: 'shock' }
  /** s-dd 最大跌幅：一排柱子＝每年的價格，跟著 tick 拉桿長；拖到谷底時地震（scene.event quake＋eventWhen） */
  | { kind: 'drawdown' }
  /** s-pe 本益比：兩棟股價一樣的大樓＋每年賺的錢一年一片疊起來（periods 拉桿）；數滿時太貴那棟被泡泡包住（scene.event bubble＋eventWhen） */
  | { kind: 'pe' }
  /** b-rate 利率翹翹板：市場利率（rate 拉桿）vs 舊借據價格；拉到 5% 時舊借據結霜（scene.event freeze＋eventWhen） */
  | { kind: 'seesaw' }
  /** e-dca 定期定額：每月一小堆（months 拉桿）＋累積的塔像樹一樣長高；天氣是 scene.event sunnyTree */
  | { kind: 'dca' }
  /** b-infl 通膨：借據＋一排利息金幣；熱浪讓金幣融化變小（scene.event heatwave） */
  | { kind: 'inflation' }
  /** a-port 組合塔：股票＋債券疊成一座塔（bondPct 拉桿）；🌪 龍捲風（scene.event tornado）掃過時股票那截縮掉 */
  | { kind: 'portfolio' }
  /** a-corr 兩組用彈簧連著的方塊（一起動、一上一下）；⚡ 閃電（scene.event lightning＋targets）打兩組的 A */
  | { kind: 'correlation' }
  /** a-dt 當沖：本金塔＋一堆付掉的交易成本（trades 拉桿）；前面一排賺、賠各一半的小圓片 */
  | { kind: 'dayTrade' }
  /** a-dur 長短借據：前面 2 年短板、後面 20 年長板（rate 拉桿）；拉到 3% 時 ❄️ 寒流（scene.event freeze＋eventWhen） */
  | { kind: 'duration' }
  /** a-fee30 主動 vs 被動 30 年：兩座塔像兩棵樹（periods 拉桿；天氣是 scene.event sunnyTree）；紅帽子＝費用吃掉的 */
  | { kind: 'feeTrees' }
  /** a-lev 槓桿的耗損：大盤、2 倍塔、反向塔站在水裡；🌊 大浪（scene.event wave）每道浪一跌一漲 */
  | { kind: 'leverage' }
  /** a-hedge 反向來對沖：三座塔（全押、加反向、少買＋現金；hedgeCase 拉桿換情境）；大跌那天 🌋 地震（scene.event quake＋eventWhen） */
  | { kind: 'hedge' }
  /** a-rebal 剪高補低：一座組合塔＋目標線（rebal 拉桿：一開始、股票漲了、剪高補低） */
  | { kind: 'rebalance' }
  /** x-cc 掩護性買權：一座塔＋天花板虛線（ccMove 拉桿）；漲超過天花板的部分賣掉（空框），換到的權利金是塔旁一枚金幣；上漲時 🌤（scene.event sunnyTree＋eventWhen） */
  | { kind: 'coveredCall' }
  | { kind: 'overlap'; a: string; b: string }
  | { kind: 'underground'; show: 'strata' | 'cores' | 'dig' | 'veins' | 'gold'; cores?: [string, string] }

export type StageKind = Stage['kind']

/** 舞台用的拉桿值（由導覽 store 持有） */
/** tick＝價格路徑上的第幾個點（s-dd）；rate＝市場利率（b-rate）；months＝定期定額買了幾個月（e-dca） */
/** bondPct：a-port 組合塔裡債券佔幾 %（其餘是股票） */
/** trades：a-dt 當沖進出了幾次（一次＝買進再賣出） */
/** hedgeCase：a-hedge 看哪一種情境（0 來回晃的一年、1 大漲那年、2 🌋 大跌那天） */
/** rebal：a-rebal 走到哪一步（0 一開始、1 股票漲了一年、2 剪高補低） */
/** storm：a-port 選哪一種示意風暴（0 股跌債漲、1 股債一起跌） */
/** feeDiscount：a-dt 券商手續費打幾折（1＝公告費率不打折） */
/** winRate：a-dt 每次進出賺錢的機率（示意） */
/** ccMove：x-cc 股票這段期間漲跌幾 %（整數，負的＝跌） */
export type StageValues = { years: number; periods: number; phase: number; frontLoad: number; tick: number; rate: number; months: number; bondPct: number; trades: number; hedgeCase: number; rebal: number; storm: number; feeDiscount: number; winRate: number; ccMove: number }
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
  /** 這一步發生的事件（龍捲風、閃電…；src/scene/events）：鏡頭停下後才發生，舞台讀它的進度 */
  event?: EventSpec
  /**
   * 事件只在這個條件成立時發生（例如 s-dd 拖到谷底才地震、b-rate 拖到 5% 才寒流）：不成立時當作沒有事件，成立的那一刻事件從頭播一次。
   * 事件參數仍然固定（不跟著拉桿變），所以條件成立後再拖拉桿不會重播；見 src/scene/events/index.ts 的規則。
   */
  eventWhen?: Condition
  values?: Partial<StageValues>
  /** 城市大樓名稱標籤，預設 true */
  cityLabels?: boolean
  /** 背景城市淡到接近背景色（教具在廣場或交易所、城市不是主角時；mid-r1） */
  cityDim?: boolean
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
  /** 每年的分銷費（小數）與收幾年；資料沒有時為 undefined */
  distributionFee: (productId: string) => { rate: number; years: number } | undefined
  /** a-hedge 的對沖舉例（sim/hedge；0050 的費用從資料讀） */
  hedge: () => HedgeExample
  /** 實戰課：一檔真基金的體檢資料（data/fundCheckup）；沒有這檔時丟錯。讀了哪些欄位由 ui/marks 記下來，沒查證就標 ？ */
  checkup: (id: string) => FundCheckup
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

/** 研究數據卡（a-dt）：一手出處的研究數字；mark 'unverified'＝這個數字沒查證（？，從資料推出來） */
export type ResearchRow = { value: string; text: string; mark?: Mark; /** 這一列的短出處（作者、年份、樣本） */ source?: string }
/** refs＝完整出處（論文原文名稱＋DOI），放在多說一點與文字版 */
export type ResearchCard = { rows: ResearchRow[]; cite: string; refs?: { citation: string; doi: string }[] }

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
  /**
   * 比較步驟（兩種商品／做法並排、或一面倒的數字）：面板一直顯示一行「只是比較，不是叫你買或賣」（T.compareNote），
   * 不藏在多說一點（mid-r1：她把 387 萬 vs 180 萬讀成「選累積型」）
   */
  compare?: boolean
  /** 回傳 undefined 時不顯示大數字（例如資料沒有內扣費用）；values＝導覽目前的拉桿值（跟著拉桿即時變） */
  bigNumber?: (c: TextContext, values: Readonly<StageValues>) => BigNumber | undefined
  focus?: { holdings?: string[] }
  /** 研究數據卡（附出處；過了門檻才顯示，文字版一直顯示） */
  research?: (c: TextContext) => ResearchCard
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
export type CourseId = 'beginner' | 'intermediate' | 'advanced' | 'practice'
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
