import type { BigNumber, Level, RecapLine, Step, TextContext } from './types'
import { movePct, pct0, SHOCK_2330, signedPct, wan } from './context'
import { DEFAULT_VALUES } from './values'
import { EXDIV, exDivTimeline, principalTrap, TRAP_DEMO } from '../scene/layout/stages'
import { T } from '../ui/strings'

/**
 * 課程內文。數字一律由 TextContext 即時計算。
 * 寫作規則（ASD-STE100 中文版，見 glossary.ts）：標題 ≤ 8 字；一句話 ≤ 20 字、最多兩句、每句 ≤ 16 字；
 * 多說一點最多 4 句、每句 ≤ 25 字；一詞一義；不用「被」；有 until 的步驟用動作詞開頭。
 * 示意步驟的 more 必須寫「示意」。
 */

const SHOCK_PCT = -SHOCK_2330['2330']! // 0.3
const pctOf = (er: number): string => `${(er * 100).toFixed(2)}%`
const n0 = (v: number): string => v.toFixed(0)
/** 0.015 → '1.5%' */
const pct1 = (r: number): string => `${Number((r * 100).toFixed(2))}%`
const NICK = T.nick
/** f-6 的後收級別（出門費＝遞延手續費 CDSC） */
const BACKLOAD = 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD'
/** 持有滿幾年後出門費歸零（從資料找第一個 0） */
const exitFreeYears = (c: TextContext): number => {
  let y = 0
  while (c.exitFee(BACKLOAD, y) > 0 && y < 50) y++
  return y
}

/** f-5 計費表的那檔基金；e-5 拿它和 0050 比（r5：同樣用「100 萬一年扣多少元」比） */
const METER_FUND = 'JH_BALANCED'
/** 100 萬放一年要扣的內扣費用（元） */
const perMillion = (er: number): string => T.yuan(er * 1_000_000)

/** 時間軸上「發金幣那一刻」的位置；s-5 拉到這裡為止（大數字只算到這一刻，合計永遠不變） */
export const EXDIV_AFTER_PHASE = 0.5

/** 初階口訣：初階結尾（u-6）與中階開頭的複習（m-0）用同一份 */
const BEGINNER_RECAP: RecapLine[] = [
  { icon: '🧱', text: '股票＝拿一顆方塊' },
  { icon: '📜', text: '債券＝借據，固定給金幣' },
  { icon: '🚜', text: '基金＝怪手幫你挑（要收費）' },
  { icon: '🧩', text: 'ETF＝照藍圖挑（通常較便宜）' },
]

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
        callouts: [{ anchor: { kind: 'building', id: '2330' }, title: '台積電：最高' }],
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
        title: '有的晃很兇',
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
        title: '發金幣那一刻',
        line: '拖**時間軸**。**金幣|coin**從方塊來，總數**不變**',
        fallbackLine: '**金幣|coin**從方塊來，總數**不變**',
        more: '有些公司賺了錢，會發配息給你。配息＝金幣。金幣是從方塊挖出來的：方塊變小，合起來不變。這叫除息，數字是示意。',
        mark: 'illustrative',
        // 跟著即時時間軸，但只到配發那一刻：發之前 100 ＋ 0，發的那一刻 95 ＋ 5，合計永遠不變
        bigNumber: (_c, v) => {
          const e = exDivTimeline(Math.min(v.phase, EXDIV_AFTER_PHASE), 'fill')
          return { value: n0(e.blockValue + e.cash), label: `方塊 ${n0(e.blockValue)}＋金幣 ${n0(e.cash)}`, mark: 'illustrative' }
        },
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 0 } },
        controls: ['phase'],
        // 時間軸停在配發那一刻：方塊不會「長回來」，卡片和 3D 標籤永遠一致；要拉到那一刻才能下一步
        ranges: { phase: [0, EXDIV_AFTER_PHASE] },
        until: { control: 'phase', min: EXDIV_AFTER_PHASE },
      },
      {
        id: 's-6',
        title: '方塊沒長回來',
        // 先鋪陳「會長回來」是可能的，「沒長回來」才有意思（r3）；不說「通常」：填息不是保證
        line: '方塊**有時會長回來**，這次**沒有|loss**',
        more: () => {
          const e = exDivTimeline(1, 'gap')
          return `發完金幣後，方塊有時會慢慢長回去，這次沒有。方塊 ${n0(e.blockValue)}＋金幣 ${n0(e.cash)}＝${n0(e.blockValue + e.cash)}，比原來少。長回去叫填息，沒長回去叫貼息。配息不是白送的錢，要看總報酬，這是示意。`
        },
        mark: 'illustrative',
        // 不用再拉：一進來就是「過了一陣子」的結果（95 ＋ 5 → 92 ＋ 5）。卡片只放一個數字：少了多少
        bigNumber: (_c, v) => {
          const e = exDivTimeline(Math.max(v.phase, EXDIV_AFTER_PHASE), 'gap')
          return { value: `少 ${n0(EXDIV.price - (e.blockValue + e.cash))}`, label: '方塊＋金幣，合起來變少', colorKey: 'loss', mark: 'illustrative' }
        },
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'gap' }, values: { phase: 1 } },
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
        // r5：「滴」金幣要想一下；三張借據的標籤下面寫借給誰（bondSub）
        line: '債券＝**借據**，固定給**金幣|coin**',
        more: '債券＝借錢給別人，換一張借據方塊。它不跟著大樓長高，只固定給你利息。到期時，本金還給你。金幣快慢是示意。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds' } },
      },
      {
        id: 'b-2',
        title: '三種借據',
        line: '越**穩**的，利息通常**越少**',
        more: '國家債＝借給政府，像鑽石一樣堅固，利息通常最少。公司債＝借給體質好的公司，金屬材質。高收益債＝借給體質弱的公司，玻璃材質。它利息通常較多，也較容易裂（利息快慢是示意）。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', ranks: true } },
      },
      {
        id: 'b-3',
        title: '經濟風暴',
        line: '利息高的，比較**容易裂**',
        // 初階沒有 b-2（三種借據，在中階），所以這裡自己說高收益債是什麼
        more: '高收益債＝借給體質弱的公司，利息較多。假設遇上一場經濟風暴。股票方塊大幅縮水，高收益債裂開、停付利息（紅色）。國家債通常比較穩，這是示意。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds' }, event: { kind: 'tornado' } },
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
        line: '基金＝**怪手**（經理人）幫你挑方塊',
        more: '基金＝把錢交給經理人。經理人就是這台怪手。他挑方塊，堆成一座小塔。這是駿利亨德森平衡基金。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-2',
        title: '拆開看看',
        line: '拖**拆開**。看裡面有什麼',
        more: (c) =>
          `拖「拆開」拉桿，看看這座塔裡裝了什麼。股票方塊約 ${pct0(c.assetClassPct('JH_BALANCED', 'stock'))}%，最下面幾層是輝達、微軟等大公司。借據約 ${pct0(c.assetClassPct('JH_BALANCED', 'bond'))}%，剩下一點是現金。`,
        // 拆開之後才標名字。兩個標註就要說完每一層（r3：只標兩層、底下紅綠紫三層沒名字，30%＋38% 不到一百）：
        // 錨在最大的兩層，寫的是整類的比例——股票（含最下面幾層大公司）、借據
        callouts: [
          { anchor: { kind: 'holding', holdingId: 'OTHER_US_STOCK' }, title: '股票方塊', sub: (c) => `約 ${pct0(c.assetClassPct('JH_BALANCED', 'stock'))}%・含輝達等`, when: { control: 'explode', min: 0.6 } },
          { anchor: { kind: 'holding', holdingId: 'BOND_MIXED_US' }, title: '借據', sub: (c) => `約 ${pct0(c.assetClassPct('JH_BALANCED', 'bond'))}%`, when: { control: 'explode', min: 0.6 } },
        ],
        scene: { camera: 'exchangeWide', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false }, cityLabels: false },
        controls: ['explode'],
        until: { control: 'explode', min: 0.6 },
      },
      {
        id: 'f-3',
        title: '股票＋債券',
        line: '方塊＋借據都有，叫**平衡型**',
        more: '塔裡有輝達、微軟這些股票方塊。也有美國公債的鑽石借據。同時有股票和債券的基金，叫多重資產或平衡型。',
        focus: { holdings: ['NVDA', 'US_TREASURY'] },
        callouts: [
          { anchor: { kind: 'holding', holdingId: 'NVDA' }, title: '輝達' },
          { anchor: { kind: 'holding', holdingId: 'US_TREASURY' }, title: '美國公債', sub: '借錢給美國政府' },
        ],
        scene: { camera: 'exchangeWide', product: 'JH_BALANCED', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-4',
        title: '另一台怪手',
        line: '同樣股票＋借據，**比例差很多**',
        // 純看圖：換一台怪手，股票和借據的多少整個反過來；專有名詞（可轉債、高收益債）只在多說一點
        more: (c) =>
          `這是安聯收益成長基金，也是股票＋借據。前一座約 ${pct0(c.assetClassPct('JH_BALANCED', 'stock'))}% 是股票，這座只有約 ${pct0(c.assetClassPct('ALLIANZ_INCOME_GROWTH', 'stock'))}%。整座塔裡，可轉債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'CONVERTIBLE_US'))}%，高收益債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'US_HIGH_YIELD'))}%。可轉債＝能換成股票的借據；名稱像，裡面不一定一樣。`,
        // 借據那幾層亮、股票那幾層暗：一眼看出這座塔大半是借據
        focus: { holdings: ['CONVERTIBLE_US', 'US_HIGH_YIELD'] },
        callouts: [
          { anchor: { kind: 'holding', holdingId: 'OTHER_US_STOCK' }, title: '股票', sub: (c) => `約 ${pct0(c.assetClassPct('ALLIANZ_INCOME_GROWTH', 'stock'))}%` },
          { anchor: { kind: 'holding', holdingId: 'CONVERTIBLE_US' }, title: '借據', sub: (c) => `約 ${pct0(c.assetClassPct('ALLIANZ_INCOME_GROWTH', 'bond'))}%` },
        ],
        // 另一位經理人：怪手換一個顏色（r3：一模一樣的怪手，他不信是「另一台」）
        scene: { camera: 'exchangeWide', product: 'ALLIANZ_INCOME_GROWTH', explode: 1, stage: { kind: 'excavator', meter: false, other: true }, cityLabels: false },
      },
      {
        id: 'f-5',
        title: '計費表在跑',
        line: '**內扣費用**每天磨掉一點',
        more: '怪手不是免費的。塔上的計費表一直在跑。內扣費用每天從塔上磨掉一點點。',
        // r6：「已磨掉 37,856 元」才有感但它一直在跳；大數字改成穩定的「100 萬一年約扣多少元」（和 e-5 同一檔基金、同一個算法）
        bigNumber: (c) => {
          const er = c.expenseRatio(METER_FUND)
          return er === undefined ? undefined : { value: perMillion(er), label: '100 萬放一年，約扣', note: `每年內扣費用 ${pctOf(er)}` }
        },
        scene: { camera: 'exchange', product: METER_FUND, stage: { kind: 'excavator', meter: true }, cityLabels: false },
      },
      {
        id: 'f-6',
        title: '進門費、出門費',
        line: '拖**持有年數**。前收**進門**扣，後收**早出門|loss**才扣',
        fallbackLine: '前收**進門**先扣；後收**早出門|loss**才扣',
        more: (c) =>
          `兩座都是施羅德環球收息債券，只差收費方式。前收型買時先付進門費，這裡假設 ${pct1(DEFAULT_VALUES.frontLoad)}。後收型未滿 1 年賣，出門費 ${n0(c.exitFee(BACKLOAD, 0) * 100)}%，滿 ${exitFreeYears(c)} 年不收。兩座每年都還在扣費用，後收前幾年扣得更多。`,
        mark: 'assumption',
        // 只放兩座基金塔：0050 等到 ETF 那一章才出場。大數字＝後收「現在賣」要付的出門費（和 3D 的出門費標籤同一個數字）
        bigNumber: (c, v) => {
          const rows = c.fundFeeRows(v.years, v.frontLoad)
          const back = rows.find((r) => r.id === 'back')!
          const first = c.fundFeeRows(0, v.frontLoad).find((r) => r.id === 'back')!.exit
          return {
            value: wan(back.exit),
            label: '後收現在賣的出門費',
            fraction: first > 0 ? back.exit / first : 0,
            colorKey: 'loss',
            // 金額用到還沒查證的內扣費用（拆項見多說一點的數字表）
            ...(back.unverified.length > 0 ? { mark: 'unverified' as const } : {}),
          }
        },
        scene: { camera: 'plaza', product: null, stage: { kind: 'feeRace', etf: false }, values: { years: 0 } },
        controls: ['years'],
        // 拉到出門費歸零（滿 3 年）才能下一步
        until: { control: 'years', min: 3 },
      },
      {
        id: 'f-8',
        title: '配息或累積',
        line: '拖**經過年數**。看**金幣滾回去**的塔',
        more: '同一檔基金常有兩種級別。配息型把金幣放進你的口袋。累積型把金幣熔回方塊，繼續投資。拖經過年數，看差距怎麼長出來（示意參數）。',
        mark: 'illustrative',
        scene: { camera: 'plaza', product: null, stage: { kind: 'accumulate' }, values: { periods: 0 } },
        controls: ['periods'],
        until: { control: 'periods', min: 8 },
      },
      {
        id: 'f-9',
        title: '配息陷阱',
        // r5：領到 91.2 ＋ 剩 54.4 ＞ 100，陳伯伯以為賺了、看不到陷阱。重點改成「領到的錢，有一部分是你自己的本金」：
        // 一句話說它、大數字算出它（跟著拉桿）、3D 金幣堆標註也寫「其中 X 萬是本金」。
        // 不說「賠」：示意基金每年真的賺 3%，合計本來就比 100 多；陷阱是配 6% 看起來像賺 6%
        line: '拖**經過年數**。配息裡有些是**你的本金|loss**',
        fallbackLine: '配息裡有些是**你的本金|loss**',
        // 初階沒有 s-5、f-8（在中階），第一次聽到配息就在這裡，所以先說配息是什麼
        more: () =>
          `配息＝基金發給你的金幣。這檔每年配${pct0(TRAP_DEMO.payoutRate * 100)}%，但只賺${pct0(TRAP_DEMO.incomeYield * 100)}%，不夠的怪手削方塊來補。領到的錢有一部分是你的本金，叫配息來自本金。這是示意基金，不代表任何真實商品。`,
        mark: 'illustrative',
        // 領到的錢裡，有多少是削下來的本金；色條＝佔領到的錢的比例
        bigNumber: (_c, v) => {
          const st = principalTrap(v.periods)
          // r6：還沒拉時「0 萬，領的錢裡是你的本金」看不懂 → 拉了才出現（面板上的拉桿提示已經叫他拉）
          if (st.fromPrincipal <= 0) return undefined
          return {
            value: wan(st.fromPrincipal),
            label: '領的錢裡是你的本金',
            fraction: st.cashReceived > 0 ? st.fromPrincipal / st.cashReceived : 0,
            colorKey: 'loss',
            mark: 'illustrative',
          }
        },
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
        line: 'ETF＝照**藍圖**自動挑，不用怪手',
        more: 'ETF＝照一張藍圖自動挑方塊。藍圖＝指數。挑好的方塊壓成一顆混合方塊，在交易所櫃台買賣。這是元大台灣50（0050）。',
        callouts: [
          { anchor: { kind: 'holding', holdingId: '2330' }, title: '台積電', sub: '最大的一層' },
          { anchor: { kind: 'holding', holdingId: 'OTHER_TW_STOCK' }, title: '其他台股', sub: '很多家小公司' },
        ],
        scene: { camera: 'exchange', product: '0050', cityLabels: false },
      },
      {
        id: 'e-2',
        title: '拿起雷射刀',
        line: `拖**雷射刀**。切開 ${NICK['0050']}`,
        more: '0050＝元大台灣50，裝台灣市值前 50 大公司。拿起雷射刀，把它切開看看。',
        scene: { camera: 'exchangeSide', product: '0050', sliceAxis: 'x', cityLabels: false },
        controls: ['slice'],
        // 雷射刀不切到底：至少留下四成，切面上一直看得到每一層（含台積電那層）
        ranges: { slice: [0, 0.6] },
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
        line: 'ETF 像股票，**隨時能買賣**',
        more: 'ETF 開盤時隨時有成交價，可以像股票一樣買賣。一般基金每天收盤後才算出一個價錢，叫淨值。價格跳動是示意。',
        mark: 'illustrative',
        scene: { camera: 'exchange', product: '0050', stage: { kind: 'ticker' }, cityLabels: false },
      },
      {
        id: 'e-5',
        title: 'ETF 通常較省',
        // r5：突然換成 QQQ、只給 0.18%，陳伯伯差點關掉。改成同一個 0050、和計費表那檔基金比，用「100 萬一年扣多少元」
        line: (c) => {
          const er = c.expenseRatio(METER_FUND)
          return er === undefined ? '基金每年都在扣**內扣費用**' : `100 萬一年。基金扣 **${perMillion(er)}**`
        },
        more: (c) => {
          const etf = c.expenseRatio('0050')
          const fund = c.expenseRatio(METER_FUND)
          return [
            ...(etf !== undefined ? [`0050 每年的內扣費用約 ${pctOf(etf)}。`] : []),
            ...(fund !== undefined ? [`前面計費表那檔基金約 ${pctOf(fund)}。`] : []),
            `美股的 ${NICK.QQQ} 也很低。`,
            '費用低不代表比較好，投資內容和風險也不同。',
          ].join('')
        },
        // 大數字＝0050 的；費用低≠比較好，一直寫在卡片上
        bigNumber: (c) => {
          const er = c.expenseRatio('0050')
          return er === undefined ? undefined : { value: perMillion(er), label: '0050 一年約扣', note: '費用低，不代表比較好' }
        },
        scene: { camera: 'exchange', product: '0050', cityLabels: false },
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
        more: () => `來做個假設：台積電跌 ${pct0(SHOCK_PCT * 100)}%。左邊只買台積電，中間是 0050（台灣50大）。右邊是 SPY（美國500大）。`,
        scene: { camera: 'plaza', product: null, stage: { kind: 'shock' }, event: { kind: 'lightning', phase: 'gather' } },
      },
      {
        id: 'c-2',
        title: '分散有程度',
        line: (c) => `0050 跟著跌約 **${(Math.abs(c.shock('0050')) * 100).toFixed(1)}%**`,
        more: (c) =>
          `只買台積電：${signedPct(SHOCK_2330['2330']!)}。0050：約 ${signedPct(c.shock('0050'))}。因為台積電佔了一半以上。SPY 沒有台積電，沒有直接影響（${signedPct(c.shock('SPY'))}）。`,
        bigNumber: (c) => {
          const s = c.shock('0050')
          return { value: movePct(s), label: '假設下的 0050', fraction: Math.abs(s) / SHOCK_PCT }
        },
        scene: { camera: 'plaza', product: null, stage: { kind: 'shock' }, event: { kind: 'lightning', phase: 'strike' } },
      },
      {
        id: 'c-3',
        title: '買到同一家',
        line: '兩個盒子裡有**一樣的公司**',
        more: '買兩檔不等於分散兩倍。QQQ 和 SPY 都有輝達、蘋果、微軟。發光的線連起同一家公司。只列前幾大持股，實際重疊更多。',
        bigNumber: (c) => {
          const o = c.overlapShared('QQQ', 'SPY')
          return { value: `至少 ${(o * 100).toFixed(1)}%`, label: '兩盒一樣的部分', fraction: o, note: '只算前幾大公司，實際更多' }
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
        title: '直直往下鑽',
        line: (c) => `0050：**半導體|semiconductor**至少 **${pct0(c.sectorPct('0050', 'semiconductor'))}%**`,
        more: (c) =>
          `市值型 ETF＝直直往下鑽的岩芯，粗細＝產業比例。左邊 0050：至少約 ${pct0(c.sectorPct('0050', 'semiconductor'))}% 在半導體層。地面上的灰色＝其他，快照沒有細分。細桿＝這層沒列到，不代表完全沒有。`,
        bigNumber: (c) => {
          const sp = c.sectorPct('0050', 'semiconductor')
          return { value: `至少 ${pct0(sp)}%`, label: '0050 的半導體', fraction: sp / 100, colorKey: 'semiconductor', note: '只算列出的公司，實際更多' }
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
        line: '學完了！按**自由玩**到處看',
        fallbackLine: '課程**完成**了',
        more: '恭喜完成課程！自由玩已經解鎖。所有商品都能自由切開、拆開、比較。',
        fallbackMore: '恭喜完成課程！在支援 3D 的瀏覽器上，還可以自由玩。自由玩裡能切開、拆開、比較。',
        recap: BEGINNER_RECAP,
        scene: { camera: 'overview', product: '0050' },
      },
    ],
  },
]

/**
 * 課程專用的新步驟（不在 LEVELS 裡，只由 courses.ts 排進課程）：
 * m-0＝中階開頭的初階口訣複習；m-fin＝中階結尾的口訣卡（高階還沒開放，所以推薦自由玩）。
 */
export const COURSE_STEPS: Step[] = [
  {
    id: 'm-0',
    title: '初階口訣複習',
    line: '先複習**初階**的四句話',
    more: '這四句是初階學到的重點。中階每一章都多看一點細節。',
    recap: BEGINNER_RECAP,
    scene: { camera: 'overview', product: null },
  },
  {
    id: 'm-fin',
    title: '中階口訣卡',
    line: '學完中階！按**自由玩**到處看',
    fallbackLine: '中階課程**完成**了',
    more: '恭喜完成中階！自由玩已經解鎖。所有商品都能自由切開、拆開、比較。',
    fallbackMore: '恭喜完成中階！在支援 3D 的瀏覽器上，還可以自由玩。自由玩裡能切開、拆開、比較。',
    recap: [
      { icon: '🧱', text: '股票看總報酬：方塊＋金幣' },
      { icon: '📜', text: '越穩的借據，利息通常越少' },
      { icon: '🚜', text: '基金費用：進門、出門、每年' },
      { icon: '🧩', text: 'ETF 拆開看：重疊、產業、配息型' },
    ],
    scene: { camera: 'overview', product: null },
  },
]
