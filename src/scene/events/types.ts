import type { Vec3 } from '../camera'
import type { Quality } from '../quality'

/**
 * 事件元件庫的共用型別（純 TS）。新增事件種類的步驟見 ./index.ts。
 * 一種金融事件只對應一種自然現象：tornado＝經濟衰退／金融風暴、lightning＝單一公司出事、quake＝股市崩盤／最大跌幅、
 * bubble＝泡沫／太貴、freeze＝升息、sunnyTree＝長期成長／複利、heatwave＝通膨、wave＝劇烈來回震盪。
 */

/** 閃電的階段：gather＝烏雲聚集（還沒打）、strike＝打一次 */
export type LightningPhase = 'gather' | 'strike'

/** 泡泡的階段：float＝被泡泡包住浮起（停在空中）、pop＝泡泡破掉一次、目標落回地面 */
export type BubblePhase = 'float' | 'pop'

/** 事件作用的目標（舞台上的方塊）：at＝底部中心（相對廣場中心）、size＝寬（x）、高（y）、深（z） */
export type EventTarget = { at: Vec3; size: Vec3 }

/** 寒流的目標：length＝「多長」（例如借據的年期；預設 size[0]），越長霜越厚 */
export type FreezeTarget = EventTarget & { length?: number }

/**
 * 步驟資料用 `scene.event` 叫用事件。每種事件一個分支（依 kind 區分），各自的參數在自己的分支裡檢查型別。
 * 位置參數一律相對廣場中心（與 lightningBolt 相同；元件再加 atPlaza）。
 */
export type EventSpec =
  /** 🌪 龍捲風（經濟衰退、金融風暴）：numberAtX＝面板大數字等龍捲風掃到這個 x（相對廣場中心）才數（a-port）；沒給＝一進來就數（b-3） */
  | { kind: 'tornado'; numberAtX?: number }
  | { kind: 'lightning'; phase: LightningPhase }
  /**
   * 🌋 地震＋地裂（股市崩盤、最大跌幅）：地面震一次 → 裂出一個坑，坑深＝depth（0–1，乘 QUAKE.maxDepth）；終點坑保留。
   * at：坑中心（相對廣場中心的 x、z，預設 [0, 0]）；width：坑的寬度（預設 QUAKE.width）。
   */
  | { kind: 'quake'; depth: number; at?: [number, number]; width?: number }
  /**
   * 🫧 泡泡（泡沫、太貴）：float＝目標被半透明泡泡包住、浮起 lift（預設 BUBBLE.lift）後停在空中；
   * pop＝（接在 float 後面）泡泡破一次、目標落回地面（不閃）。目標本身由舞台畫，舞台用 bubbleAt 讀浮起高度。
   */
  | { kind: 'bubble'; phase: BubblePhase; target: EventTarget; lift?: number }
  /**
   * ❄️ 寒流（升息）：一陣寒風吹過，目標表面結霜（往冰藍混、上面積雪、邊緣掛冰柱）；終點霜保留。
   * amount（0–1）＝霜有多厚；每個目標再乘 length ÷ 最長的 length（長的霜更厚）。目標本身由舞台畫，舞台用 freezeTint 往冰藍混色。
   */
  | { kind: 'freeze'; amount: number; targets: readonly FreezeTarget[] }
  /**
   * 🌤 晴天＋大樹（長期成長、複利）：雲散開、太陽出來、光線變暖（warmth 0–1，預設 1）；終點維持晴天。
   * sun：太陽最後停的位置（相對廣場中心；預設 SKY.sun，要在舞台鏡頭的畫面上緣以內）。
   * 目標像樹一樣長高由舞台負責（高度可跟著拉桿；也可用 treeGrowAt 的時間軸），樹冠用 SunnyTree.tsx 匯出的 TreeCrown。
   */
  | { kind: 'sunnyTree'; warmth?: number; sun?: Vec3 }
  /**
   * ☀️ 熱浪（通膨）：烈日、暖色的霧、從地面往上飄的熱氣線；目標金幣慢慢融化變小，melt（0–1）＝最後少掉的比例（0.3＝剩 70%）。
   * coins：金幣（堆）的底部中心（相對廣場中心），事件在它們下面畫融化的金色水窪；金幣本身由舞台畫，舞台用 coinScaleAt 縮小。
   */
  | { kind: 'heatwave'; melt: number; coins?: readonly Vec3[]; coinRadius?: number }
  /**
   * 🌊 大浪（劇烈來回震盪）：一片水圍住目標的底部，浪湧起再退下 waves 次（一上一下）；終點水面平靜。
   * 浪頭打到＝跌一步（槓桿塔被打矮一截）、退下＝漲一步，舞台用 waveStepAt 讀走到第幾步，塔高沿自己算的 leveragedPath 取（事件不知道數值）。
   * at：水面中心（相對廣場中心的 x、z，預設 [0, 0]）；size：水面寬（x）、深（z）（預設 WAVE.width、WAVE.depth）；
   * targets：浪頭打到時在這些目標旁噴浪花（不閃）。
   */
  | { kind: 'wave'; waves: number; at?: [number, number]; size?: [number, number]; targets?: readonly EventTarget[] }

export type EventKind = EventSpec['kind']

/** 某一種事件的 spec（例如 SpecOf<'lightning'>） */
export type SpecOf<K extends EventKind> = Extract<EventSpec, { kind: K }>

/** 每種事件的時間軸摘要：共用時鐘（useEventClock）、面板、讀數與城市只透過它認識事件 */
export type EventTimeline<S extends EventSpec = EventSpec> = {
  /** 從鏡頭停下起算，走到終點（＝最終狀態）的秒數；0＝靜態畫面，不跑動畫 */
  duration: (spec: S) => number
  /** 終點之後是否仍每幀重繪（例如龍捲風停在旁邊原地轉）；false＝到終點就停止持續繪製 */
  lingers: (spec: S) => boolean
  /** 面板大數字等幾秒才開始數（例如等閃電打中）；0＝不等 */
  numberDelay: (spec: S) => number
  /** 這一步的終點有沒有「事件造成的後果」（損傷、跌幅）：沒有 3D 的地方（讀數、文字版）與城市用它決定要不要顯示結果 */
  aftermath: (spec: S) => boolean
}

/**
 * 事件時鐘（useEventClock 回傳；舞台與事件元件共用同一個）。
 * t.current：從鏡頭停下起算的秒數；null＝還沒開始；Infinity＝直接在終點（減少動態或靜態事件）。
 * t 每幀更新、不觸發 re-render；需要離散狀態（例如「打中了沒」）用 useEventValue。
 */
export type EventClock = {
  spec: EventSpec | undefined
  t: { readonly current: number | null }
  /** 已走到終點 */
  done: boolean
  /** prefers-reduced-motion：直接顯示終點的靜態畫面 */
  reduced: boolean
  /** 每次重新開始（換步驟、換事件、鏡頭停下）都會變：useEventValue 用它立刻重算 */
  epoch: string
}

/** 每個事件元件收到的 props（spec 已縮小到自己的那一種） */
export type EventProps<S extends EventSpec = EventSpec> = { spec: S; clock: EventClock; quality: Quality }
