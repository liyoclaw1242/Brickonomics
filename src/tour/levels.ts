import type { BigNumber, Level, TextContext } from './types'
import { pct0, SHOCK_2330, signedPct } from './context'
import { exDivTimeline } from '../scene/layout/stages'

/**
 * 課程內文。數字一律由 TextContext 即時計算。
 * 寫作規則（ASD-STE100 中文版，見 glossary.ts）：標題 ≤ 8 字；一句話 ≤ 20 字、最多兩句、每句 ≤ 16 字；
 * 多說一點最多 4 句、每句 ≤ 25 字；一詞一義；不用「被」；有 until 的步驟用動作詞開頭。
 * 示意步驟的 more 必須寫「示意」。
 */

const SHOCK_PCT = -SHOCK_2330['2330']! // 0.3
const pctOf = (er: number): string => `${(er * 100).toFixed(2)}%`
const n0 = (v: number): string => v.toFixed(0)

/** 內扣費用大數字；資料沒有時不顯示 */
const expenseNumber = (c: TextContext, productId: string, label: string): BigNumber | undefined => {
  const er = c.expenseRatio(productId)
  return er === undefined ? undefined : { value: pctOf(er), label }
}

export const LEVELS: Level[] = [
  {
    id: 'prologue',
    title: '歡迎來到積木城市',
    steps: [
      {
        id: 'p-1',
        title: '歡迎來到積木城市',
        line: '**一棟大樓**＝**一家公司**',
        more: '這裡每一棟大樓＝一家公司。大樓用一顆顆方塊疊起來。',
        callouts: [{ anchor: { kind: 'building', id: '2330' }, title: '台積電', sub: '一棟大樓＝一家公司' }],
        scene: { camera: 'overview', cameraFrom: 'sky', product: null },
      },
      {
        id: 'p-2',
        title: '樓高＝公司大小',
        line: '樓越**高**，公司越**大**',
        more: '左邊是台灣島，右邊是美國大陸。樓越高，公司市值越大。高度用對數比例縮放。因為這樣，大公司才不會擋住別人。',
        callouts: [{ anchor: { kind: 'building', id: '2330' }, title: '最高' }],
        scene: { camera: 'tw', product: null },
      },
      {
        id: 'p-3',
        title: '巨人在美國',
        line: '**輝達**、**蘋果**、**微軟**都在這',
        more: '美國大陸有輝達、蘋果、微軟這些巨型公司。接下來一步一步看懂股票、債券、基金和 ETF。',
        callouts: [{ anchor: { kind: 'building', id: 'NVDA' }, title: '輝達' }],
        scene: { camera: 'us', product: null },
      },
    ],
  },
  {
    id: 'stock',
    title: '拿走一顆方塊：股票',
    steps: [
      {
        id: 's-1',
        title: '拿走一顆方塊',
        line: '買股票＝擁有**一小塊**公司',
        more: '買一張股票，像從大樓抽出一顆方塊。你成了這家公司的小股東。你擁有公司的一小部分。',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'still' }] } },
      },
      {
        id: 's-2',
        title: '公司變值錢',
        line: '樓長高，你的方塊**變大**',
        more: '假設公司變得更值錢。大樓長高，你的方塊也變大。這是示意。',
        mark: 'illustrative',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'up' }] } },
      },
      {
        id: 's-3',
        title: '公司變不值錢',
        line: '樓縮水，你的方塊**變小**',
        more: '假設公司價值跌了。方塊也跟著縮小。股票的價格跟著公司走。這是示意。',
        mark: 'illustrative',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'down' }] } },
      },
      {
        id: 's-4',
        title: '晃動＝波動',
        line: '有些股票晃得**特別兇**',
        more: '左邊是台積電，右邊是特斯拉。波動＝價格常常上上下下。有些公司晃得特別厲害。晃動幅度是示意，不是真實數字。',
        mark: 'illustrative',
        scene: {
          camera: 'plazaNear',
          product: null,
          stage: { kind: 'held', items: [{ assetId: '2330', motion: 'shake', amplitude: 0.12 }, { assetId: 'TSLA', motion: 'shake', amplitude: 0.45 }] },
        },
      },
      {
        id: 's-5',
        title: '發金幣',
        line: '拖**時間軸**。看**配息|coin**那一刻',
        more: '有些公司賺了錢，會發配息給你。配息＝金幣。拖時間軸，看發金幣那一刻發生什麼事。這是示意。',
        mark: 'illustrative',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 0 } },
        controls: ['phase'],
        until: { control: 'phase', min: 0.55 },
      },
      {
        id: 's-6',
        title: '除息',
        line: '方塊＋金幣＝**不變**',
        more: '方塊縮小的部分，剛好等於你拿到的金幣。這叫除息：方塊價值＋金幣＝不變。之後方塊慢慢長回原本大小，叫填息。數字是示意。',
        mark: 'illustrative',
        bigNumber: () => {
          const e = exDivTimeline(0.5, 'fill')
          return { value: n0(e.blockValue + e.cash), label: `方塊 ${n0(e.blockValue)} ＋ 金幣 ${n0(e.cash)}`, mark: 'illustrative' }
        },
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 0.5 } },
        controls: ['phase'],
      },
      {
        id: 's-7',
        title: '貼息',
        line: '要看**方塊＋金幣**的總和',
        more: '配息不是白送的錢。方塊可能長不回去，甚至更小，這叫貼息。所以要看方塊＋金幣的總報酬。這是示意。',
        mark: 'illustrative',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'gap' }, values: { phase: 1 } },
        controls: ['phase'],
      },
    ],
  },
  {
    id: 'bond',
    title: '借錢給大樓：債券',
    steps: [
      {
        id: 'b-1',
        title: '借錢給大樓',
        line: '債券＝**借據**，固定滴**金幣|coin**',
        more: '債券＝借錢給別人，換一張借據方塊。它不跟著大樓長高，只固定滴出利息。到期時，本金還給你。金幣快慢是示意。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', stressed: false } },
      },
      {
        id: 'b-2',
        title: '三種借據',
        line: '越**穩**的，利息通常**越少**',
        more: '國家債＝借給政府，像鑽石一樣堅固，利息通常最少。公司債＝借給公司，金屬材質。高收益債＝借給體質弱的公司，玻璃材質。它利息通常較多，也較容易裂（利息快慢是示意）。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', stressed: false } },
      },
      {
        id: 'b-3',
        title: '經濟風暴',
        line: '利息高的，比較**容易裂**',
        more: '報酬較高的，風險通常也較高。假設遇上一場經濟風暴。股票方塊大幅縮水，高收益債裂開、停付利息。國家債通常比較穩，這是示意。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', stressed: true } },
      },
    ],
  },
  {
    id: 'fund',
    title: '怪手的小塔：基金',
    steps: [
      {
        id: 'f-1',
        title: '怪手幫你挑',
        line: '基金＝**經理人**幫你挑方塊',
        more: '基金＝把錢交給經理人。經理人就是這台怪手。他挑方塊，堆成一座小塔。這是駿利亨德森平衡基金。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-2',
        title: '拆開看看',
        line: '拖**拆開**。看裡面有什麼',
        more: '拖「拆開」拉桿。看看這座塔裡裝了什麼。',
        scene: { camera: 'exchangeWide', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false }, cityLabels: false },
        controls: ['explode'],
        until: { control: 'explode', min: 0.6 },
      },
      {
        id: 'f-3',
        title: '股票＋債券',
        line: '兩種都有，叫**平衡型**',
        more: '塔裡有輝達、微軟這些股票方塊。也有美國公債的鑽石借據。同時有股票和債券的基金，叫多重資產或平衡型。',
        focus: { holdings: ['NVDA', 'US_TREASURY'] },
        callouts: [
          { anchor: { kind: 'holding', holdingId: 'NVDA' }, title: '輝達' },
          { anchor: { kind: 'holding', holdingId: 'US_TREASURY' }, title: '美國公債' },
        ],
        scene: { camera: 'exchangeWide', product: 'JH_BALANCED', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-4',
        title: '同名不同料',
        line: '也叫多重資產，裡面**不一樣**',
        more: (c) =>
          `同樣叫多重資產，安聯收益成長很不一樣。依目前快照，可轉債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'CONVERTIBLE_US'))}%。高收益債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'US_HIGH_YIELD'))}%。名稱一樣，裡面不一定一樣。`,
        bigNumber: (c) => {
          const w = c.weightPct('ALLIANZ_INCOME_GROWTH', 'CONVERTIBLE_US')
          return { value: `可轉債 ${pct0(w)}%`, label: '安聯收益成長', fraction: w / 100, colorKey: 'CONVERTIBLE_US' }
        },
        focus: { holdings: ['CONVERTIBLE_US'] },
        scene: { camera: 'exchangeWide', product: 'ALLIANZ_INCOME_GROWTH', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-5',
        title: '計費表在跑',
        line: '**內扣費用**每天磨掉一點',
        more: '怪手不是免費的。塔上的計費表一直在跑。內扣費用每天從塔上磨掉一點點。',
        bigNumber: (c) => expenseNumber(c, 'JH_BALANCED', '每年內扣費用'),
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: true }, cityLabels: false },
      },
      {
        id: 'f-6',
        title: '入口門、出口門',
        line: '拖**持有年數**。比較費用',
        more: '買基金有入口門和出口門。比較施羅德債券基金前收型、後收 U 級別。再和 ETF 0050 比一比。前收手續費是假設值，可以自己調。',
        mark: 'assumption',
        scene: { camera: 'plaza', product: null, stage: { kind: 'feeRace' }, values: { years: 0 } },
        controls: ['years', 'frontLoad'],
        until: { control: 'years', min: 3 },
      },
      {
        id: 'f-7',
        title: '後收不是免費',
        line: '越**早賣**，扣得越多',
        more: '後收型不是免費。買時免手續費，前幾年每年多收分銷費。越早賣，遞延手續費越貴。划不划算，要看你持有多久。',
        scene: { camera: 'plaza', product: null, stage: { kind: 'feeRace' }, values: { years: 3 } },
        controls: ['years', 'frontLoad'],
      },
      {
        id: 'f-8',
        title: '配息或累積',
        line: '拖滑桿。看**再投資**的塔',
        more: '同一檔基金常有兩種級別。配息型把金幣放進你的口袋。累積型把金幣熔回方塊，繼續投資。拖經過年數，看差距怎麼長出來（示意參數）。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'accumulate' }, values: { periods: 0 } },
        controls: ['periods'],
        until: { control: 'periods', min: 8 },
      },
      {
        id: 'f-9',
        title: '配息陷阱',
        line: '拖滑桿。配息削掉**本金|loss**',
        more: '塔越來越矮。因為金幣不夠配，怪手削下方塊熔成金幣。這叫配息來自本金。這是示意基金，不代表任何真實商品。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'principalTrap' }, values: { periods: 0 } },
        controls: ['periods'],
        until: { control: 'periods', min: 5 },
      },
    ],
  },
  {
    id: 'etf',
    title: '照藍圖壓縮：ETF',
    steps: [
      {
        id: 'e-1',
        title: '照藍圖組合',
        line: 'ETF＝照**指數**自動挑',
        more: 'ETF＝照一張藍圖自動挑方塊。藍圖＝指數。挑好的方塊壓成一顆混合方塊，在交易所櫃台買賣。這是元大台灣50（0050）。',
        scene: { camera: 'exchange', product: '0050', cityLabels: false },
      },
      {
        id: 'e-2',
        title: '拿起雷射刀',
        line: '拖**雷射刀**。切開 0050',
        more: '拿起雷射刀。把 0050 切開看看。',
        scene: { camera: 'exchangeSide', product: '0050', sliceAxis: 'x', cityLabels: false },
        controls: ['slice'],
        until: { control: 'slice', min: 0.4 },
      },
      {
        id: 'e-3',
        title: '台積電一大塊',
        line: (c) => `**台積電|2330**佔了約 **${pct0(c.weightPct('0050', '2330'))}%**`,
        more: (c) =>
          `最下面那層特別厚的藍色＝台積電。它佔了約 ${pct0(c.weightPct('0050', '2330'))}%。第二名聯發科只佔約 ${pct0(c.weightPct('0050', '2454'))}%。差距很大。`,
        bigNumber: (c) => {
          const w = c.weightPct('0050', '2330')
          return { value: `${pct0(w)}%`, label: '台積電在 0050', fraction: w / 100, colorKey: '2330' }
        },
        focus: { holdings: ['2330'] },
        callouts: [{ anchor: { kind: 'holding', holdingId: '2330' }, title: '台積電', sub: '最厚的一層' }],
        scene: { camera: 'exchangeSide', product: '0050', slice: 0.5, sliceAxis: 'x', cityLabels: false },
      },
      {
        id: 'e-4',
        title: '隨時有價格',
        line: 'ETF 開盤**隨時能買賣**',
        more: 'ETF 開盤時隨時有成交價。它可以像股票一樣買賣。一般基金每天收盤後才算出一個淨值。價格跳動是示意。',
        mark: 'illustrative',
        scene: { camera: 'exchange', product: '0050', stage: { kind: 'ticker' }, cityLabels: false },
      },
      {
        id: 'e-5',
        title: '內扣費用低',
        line: 'QQQ、SPY **內扣費用**低',
        more: 'QQQ 和 SPY（標普500）是美國的 ETF。它們照藍圖自動配置，不用怪手挑股。目前快照裡，它們的內扣費用比本課的基金低。費用低不代表比較好，策略也不同。',
        bigNumber: (c) => expenseNumber(c, 'QQQ', 'QQQ 每年內扣'),
        scene: { camera: 'exchange', product: 'QQQ', cityLabels: false },
      },
    ],
  },
  {
    id: 'scenario',
    title: '假設情境：分散與重疊',
    steps: [
      {
        id: 'c-1',
        title: '假設台積電跌',
        line: () => `假設台積電跌 **${pct0(SHOCK_PCT * 100)}%**`,
        more: () => `來做個假設：台積電跌 ${pct0(SHOCK_PCT * 100)}%。左邊只買台積電。中間是 0050，右邊是 SPY。看看會發生什麼事。`,
        scene: { camera: 'plaza', product: null, stage: { kind: 'shock', active: false } },
      },
      {
        id: 'c-2',
        title: '誰受傷最重',
        line: (c) => `0050 跟著跌約 **${signedPct(c.shock('0050'))}**`,
        more: (c) =>
          `只買台積電：${signedPct(SHOCK_2330['2330']!)}。0050：約 ${signedPct(c.shock('0050'))}，台積電佔了一半以上。SPY 沒有台積電，沒有直接影響（${signedPct(c.shock('SPY'))}）。分散也有程度之分。`,
        bigNumber: (c) => {
          const s = c.shock('0050')
          return { value: signedPct(s), label: '0050', fraction: Math.abs(s) / SHOCK_PCT }
        },
        scene: { camera: 'plaza', product: null, stage: { kind: 'shock', active: true } },
      },
      {
        id: 'c-3',
        title: '重疊',
        line: '買兩檔≠**分散兩倍**',
        more: '買兩檔不等於分散兩倍。QQQ 和 SPY 拆開後，發光的線連起同一家公司。兩檔都有輝達、蘋果、微軟。只列前幾大持股，實際重疊更多。',
        bigNumber: (c) => {
          const o = c.overlapShared('QQQ', 'SPY')
          return { value: `至少 ${(o * 100).toFixed(1)}%`, label: 'QQQ 與 SPY 重疊', fraction: o }
        },
        scene: { camera: 'plaza', product: null, stage: { kind: 'overlap', a: 'QQQ', b: 'SPY' }, cityLabels: false },
      },
      {
        id: 'c-4',
        title: '往地底鑽',
        line: '看看 ETF 還有**哪幾種**',
        more: '接下來鑽到城市底下。看看 ETF 還分成哪些種類。',
        scene: { camera: 'overview', product: null },
      },
    ],
  },
  {
    id: 'underground',
    title: '鑽進地底：ETF 的種類',
    steps: [
      {
        id: 'u-1',
        title: '地層＝產業',
        line: '每一層是**一種產業**',
        more: '城市底下的土層＝產業分類。每一層是一種產業。有半導體、電子、軟體、網路、汽車、金融。',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'strata' }, cityLabels: false },
      },
      {
        id: 'u-2',
        title: '垂直岩芯',
        line: (c) => `0050：**半導體|semiconductor**至少 **${pct0(c.sectorPct('0050', 'semiconductor'))}%**`,
        more: (c) =>
          `市值型 ETF＝垂直岩芯，粗細＝產業比例。左邊 0050：至少約 ${pct0(c.sectorPct('0050', 'semiconductor'))}% 在半導體層。右邊 QQQ 分散在半導體、電子、軟體、汽車。地面上的灰色＝快照沒有細分的部分。`,
        bigNumber: (c) => {
          const sp = c.sectorPct('0050', 'semiconductor')
          return { value: `至少 ${pct0(sp)}%`, label: '0050 的半導體', fraction: sp / 100, colorKey: 'semiconductor' }
        },
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'cores', cores: ['0050', 'QQQ'] }, cityLabels: false },
      },
      {
        id: 'u-3',
        title: '水平挖',
        line: '只挖**一層**＝產業型',
        more: '產業型或主題型 ETF＝沿著同一層水平挖。例如只挖半導體層。挖得越集中，那一層的好壞影響越大。這是示意，不代表任何真實商品。',
        mark: 'illustrative',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'dig' }, cityLabels: false },
      },
      {
        id: 'u-4',
        title: '金幣礦脈',
        line: '高股息：專挑**冒金幣**的',
        more: '高股息型 ETF 專挑會冒金幣的礦脈。冒金幣＝配息比較多。配息不是白送的，要看方塊＋金幣的總報酬。這是示意。',
        mark: 'illustrative',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'veins' }, cityLabels: false },
      },
      {
        id: 'u-5',
        title: '黃金礦脈',
        line: '黃金**不配息**，看市場價',
        more: '最底下這條是黃金礦脈。黃金不是公司，沒有配息，也沒有利息。它的價格看市場願意出多少錢。這是示意。',
        mark: 'illustrative',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'gold' }, cityLabels: false },
      },
      {
        id: 'u-6',
        title: '完成！',
        line: '沙盒**解鎖**了，自由玩',
        fallbackLine: '課程**完成**了',
        more: '恭喜完成全部課程！沙盒模式已經解鎖。所有商品都能自由切開、拆開、比較。',
        fallbackMore: '恭喜完成全部課程！在支援 3D 的瀏覽器上，還可以進入沙盒。在沙盒裡能自由切開、拆開、比較。',
        scene: { camera: 'overview', product: '0050' },
      },
    ],
  },
]
