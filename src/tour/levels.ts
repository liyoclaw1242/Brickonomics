import type { Level } from './types'
import { pct0, signedPct } from './context'

/** 課程內文。數字一律由 TextContext 即時計算。示意參數必須在文中標「示意」。 */
export const LEVELS: Level[] = [
  {
    id: 'prologue',
    title: '歡迎來到積木城市',
    steps: [
      {
        id: 'p-1',
        text: '歡迎來到積木城市！這裡的每一棟大樓都是一家公司，大樓是由一顆顆方塊疊起來的。',
        scene: { camera: 'overview', cameraFrom: 'sky', product: null },
      },
      {
        id: 'p-2',
        text: '左邊是台灣島，右邊是美國大陸。大樓越高，代表公司市值越大（用對數比例縮放，太大的公司才不會把別人完全擋住）。',
        scene: { camera: 'tw', product: null },
      },
      {
        id: 'p-3',
        text: '美國大陸上有輝達、蘋果、微軟這些巨型公司。接下來，我們一步一步看懂股票、債券、基金和 ETF 的差別。',
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
        text: '買一張股票，就像從大樓抽出一顆方塊放進口袋：你成了這家公司的小股東，擁有它的一小部分。',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'still' }] } },
      },
      {
        id: 's-2',
        text: '假設公司變得更值錢，大樓長高，你手上的方塊也跟著變大。（示意）',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'up' }] } },
      },
      {
        id: 's-3',
        text: '反過來，假設公司價值下跌，方塊也會縮小。股票的價格，跟著公司走。（示意）',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'down' }] } },
      },
      {
        id: 's-4',
        text: '左邊是台積電，右邊是特斯拉。單一股票的價格常常上上下下，這叫「波動」；有些公司晃得特別厲害。（晃動幅度為示意，不代表真實數字）',
        scene: {
          camera: 'plazaNear',
          product: null,
          stage: { kind: 'held', items: [{ assetId: '2330', motion: 'shake', amplitude: 0.12 }, { assetId: 'TSLA', motion: 'shake', amplitude: 0.45 }] },
        },
      },
      {
        id: 's-5',
        text: '有些公司賺了錢會發「股利」，就是金幣。拖動下方的時間軸，看看配發的那一刻發生了什麼事。（示意）',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 0 } },
        controls: ['phase'],
        until: { control: 'phase', min: 0.55 },
      },
      {
        id: 's-6',
        text: '方塊縮小的部分，剛好等於你拿到的金幣：方塊價值＋金幣＝不變。這叫「除息」。之後方塊如果慢慢長回原本大小，叫「填息」。（示意）',
        scene: { camera: 'plazaNear', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 0.5 } },
        controls: ['phase'],
      },
      {
        id: 's-7',
        text: '方塊也可能長不回去，甚至更小，這叫「貼息」。所以配息不是白送的錢，真正要看的是「方塊＋金幣」加起來的總報酬。（示意）',
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
        text: '債券是你「借錢」給別人，換到一張借據方塊。它不會跟著大樓長高，而是固定滴出金幣（利息），到期再把本金還你。（金幣快慢為示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', stressed: false } },
      },
      {
        id: 'b-2',
        text: '借給政府的是國家債：像鑽石一樣堅固，但利息通常最少。借給公司的是公司債：金屬材質。借給體質較弱公司的是高收益債：玻璃材質，利息通常比較多，也比較容易裂。（利息快慢為示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', stressed: false } },
      },
      {
        id: 'b-3',
        text: '假設遇上一場經濟風暴：股票方塊大幅縮水，體質弱的公司借據（高收益債）裂開、停止滴金幣，國家債通常比較穩。報酬比較高的，風險通常也比較高。（示意）',
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
        text: '基金是把錢交給經理人，由他（就是這台怪手）去挑方塊，堆成一座小塔。這是駿利亨德森平衡基金。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-2',
        text: '拖動「拆開」拉桿，看看這座塔裡裝了什麼。',
        scene: { camera: 'exchangeWide', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false }, cityLabels: false },
        controls: ['explode'],
        until: { control: 'explode', min: 0.6 },
      },
      {
        id: 'f-3',
        text: '塔裡有輝達、微軟這些股票方塊，也有美國公債的鑽石借據。同時持有股票和債券的基金，叫「多重資產」或「平衡型」。',
        scene: { camera: 'exchangeWide', product: 'JH_BALANCED', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-4',
        text: (c) =>
          `同樣叫多重資產，安聯收益成長的內容就很不一樣：依目前快照，可轉債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'CONVERTIBLE_US'))}%、高收益債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'US_HIGH_YIELD'))}%。名稱一樣，裡面不一定一樣。`,
        scene: { camera: 'exchangeWide', product: 'ALLIANZ_INCOME_GROWTH', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-5',
        text: '怪手不是免費的。塔上的計費表一直在跑：管理費等內扣費用，每天都會從塔上磨掉一點點。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: true }, cityLabels: false },
      },
      {
        id: 'f-6',
        text: '買基金還有「入口門」和「出口門」。比較同一檔施羅德債券基金的前收型（手續費是假設值，可以自己調）、後收 U 級別，以及 0050 這檔 ETF。拖動持有年數看看。',
        scene: { camera: 'plaza', product: null, stage: { kind: 'feeRace' }, values: { years: 0 } },
        controls: ['years', 'frontLoad'],
        until: { control: 'years', min: 3 },
      },
      {
        id: 'f-7',
        text: '後收型不是免費：買的時候不收手續費，但前幾年每年多收分銷費，提早賣出還要付遞延手續費（越早賣越貴）。誰比較划算，要看你打算持有多久。',
        scene: { camera: 'plaza', product: null, stage: { kind: 'feeRace' }, values: { years: 3 } },
        controls: ['years', 'frontLoad'],
      },
      {
        id: 'f-8',
        text: '同一檔基金常有兩種級別：配息型把金幣放進你的口袋；累積型把金幣熔回方塊、繼續投資。拖動經過年數，看看差距怎麼長出來。（示意參數）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'accumulate' }, values: { periods: 0 } },
        controls: ['periods'],
        until: { control: 'periods', min: 8 },
      },
      {
        id: 'f-9',
        text: '最後一個陷阱：如果塔產出的金幣不夠配，怪手會把塔上的方塊削下來熔成金幣發給你。你拿到錢很開心，塔卻越來越矮。這就是「配息可能來自本金」。（示意基金，不代表任何真實商品）',
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
        text: 'ETF 照一張藍圖（指數）自動挑方塊，壓縮成一顆混合方塊，放在交易所櫃台上買賣。這是元大台灣50（0050）。',
        scene: { camera: 'exchange', product: '0050', cityLabels: false },
      },
      {
        id: 'e-2',
        text: '拿起雷射刀，把它切開看看。',
        scene: { camera: 'exchangeSide', product: '0050', sliceAxis: 'x', cityLabels: false },
        controls: ['slice'],
        until: { control: 'slice', min: 0.4 },
      },
      {
        id: 'e-3',
        text: (c) =>
          `看到那層特別厚的藍色了嗎？那是台積電，佔了約 ${pct0(c.weightPct('0050', '2330'))}%。第二名聯發科只佔約 ${pct0(c.weightPct('0050', '2454'))}%，差距很大。`,
        scene: { camera: 'exchangeSide', product: '0050', slice: 0.5, sliceAxis: 'x', cityLabels: false },
      },
      {
        id: 'e-4',
        text: 'ETF 在交易所開盤時隨時都有成交價，可以像股票一樣買賣；一般基金則是每天收盤後才算出一個淨值。（價格跳動為示意）',
        scene: { camera: 'exchange', product: '0050', stage: { kind: 'ticker' }, cityLabels: false },
      },
      {
        id: 'e-5',
        text: '美國的 QQQ 和 SPY（標普500）也是 ETF。照藍圖自動配置、不需要怪手挑股，在目前快照裡，它們的費用率（每年從資產內扣的費用比例）都比本課的基金低。不過費用低不代表一定比較好，策略也不同。',
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
        text: '來做個假設：如果台積電下跌 30%，會發生什麼事？左邊只買台積電，中間是 0050，右邊是 SPY。',
        scene: { camera: 'plaza', product: null, stage: { kind: 'shock', active: false } },
      },
      {
        id: 'c-2',
        text: (c) =>
          `只買台積電：${signedPct(-0.3)}。0050：約 ${signedPct(c.shock('0050'))}，因為台積電佔了一半以上。SPY 裡沒有台積電，這個假設對它沒有直接影響（${signedPct(c.shock('SPY'))}）。分散，也有程度之分。`,
        scene: { camera: 'plaza', product: null, stage: { kind: 'shock', active: true } },
      },
      {
        id: 'c-3',
        text: '再看「重疊」：把 QQQ 和 SPY 一起拆開，發光的線連起同一家公司。兩檔都押了輝達、蘋果、微軟——買兩檔，不等於分散兩倍。',
        scene: { camera: 'plaza', product: null, stage: { kind: 'overlap', a: 'QQQ', b: 'SPY' }, cityLabels: false },
      },
      {
        id: 'c-4',
        text: '恭喜完成！沙盒模式已經解鎖：所有商品都能自由切開、拆開、比較。進階章節「鑽進地底」即將推出。',
        scene: { camera: 'overview', product: '0050' },
      },
    ],
  },
]
