/** 所有介面文字（繁體中文）。新增文字一律加在這裡。 */
/** 基金那一章的錢：投入 100＝100 萬（和計費表同一個底），所以 1＝1 萬。一位小數、去掉「.0」：98.5 → '98.5 萬'、1.958 → '2 萬' */
const wan = (v: number): string => `${Number(Math.max(0, v).toFixed(1))} 萬`

export const T = {
  appTitle: '積木城市',
  brand: '積 木 城 市',
  sandboxTitle: '自由探索',
  /** 產品代號一律配一個白話暱稱（3D 標籤與一句話；完整商品名留在多說一點與即時數字表） */
  nick: { '0050': '0050（台灣50大）', QQQ: 'QQQ（那斯達克100）', SPY: 'SPY（美國500大）' },
  /** 資料名稱他不認得的公司，畫面上改用大家熟悉的名字（資料名稱不動） */
  nameNick: { GOOGL: 'Google' },
  chapters: [
    { icon: '🏙', name: '序章' },
    { icon: '🧱', name: '股票' },
    { icon: '📜', name: '債券' },
    { icon: '🚜', name: '基金' },
    { icon: '🧩', name: 'ETF' },
  ],
  /** 課程的開頭章（中階以上：上一階口訣複習）與結尾章（口訣卡）；序章與四個內容章沿用 chapters */
  courseChapters: { review: { icon: '🔁', name: '複習' }, finish: { icon: '🎓', name: '完成' } },
  /** 課程（初階／中階／高階）：開場卡、右上角換階、結尾的下一階 */
  course: {
    startTitle: '從哪一階開始？',
    /** 開場卡上的一句白話＋步數 */
    note: (tagline: string, n: number) => `${tagline}・${n} 步`,
    /** 開場卡上建議的順序（不鎖，任何一階都能先看） */
    order: (i: number) => `第 ${i + 1} 階`,
    later: '右上角隨時可以換階',
    /** 工具列膠囊的無障礙名稱：先念看得到的目前階 */
    switchLabel: (current: string) => `${current}，換階`,
    /** 工具列膠囊上看得到的字：目前階＋下拉記號 */
    pill: (current: string) => `${current} ▾`,
    menuLabel: '選擇課程',
    nextTier: (name: string) => `下一階：${name} →`,
    /** 文字版選階的群組名 */
    pickLabel: '選擇課程',
  },
  /** 研究數據卡（a-dt）：一手出處的研究數字 */
  research: { title: '研究怎麼說', source: (cite: string) => `出處：${cite}` },
  /** 比較步驟的提醒（mid-r1：比較結果一面倒，被讀成投資建議） */
  compareNote: '只是比較，不是叫你買或賣',
  /** 課內的第幾步（mid-r1：章的編號在同一章裡不動，她以為按壞了） */
  stepCount: (i: number, n: number) => `第 ${i} / ${n} 步`,
  chapterCounter: (i: number, n: number) => `${String(i).padStart(2, '0')} / ${String(n - 1).padStart(2, '0')}`,
  shock: { stock: '只買台積電', withLegend: (name: string) => `${name}・紅色＝假設跌掉的部分`, struck: '假設：台積電被打中' },
  overlapLabel: (name: string) => `${name}：兩盒都有`,
  heightNote: '大樓高度為市值的對數比例；籃子裡的方塊數量嚴格依照權重。',
  islands: { TW: '台灣島', US: '美國大陸' },
  regions: { TW: '台灣', US: '美國', GLOBAL: '全球' },
  exchange: '交易所櫃台',
  products: '選擇商品',
  etfs: 'ETF（照藍圖壓縮的混合方塊）',
  funds: '基金（怪手堆的小塔）',
  slice: '雷射刀切割',
  sliceAxis: { x: '直切（左右）', z: '直切（前後）', y: '橫切（上下）', d: '斜切' },
  explode: '拆開',
  explodeHint: '桌機也可以按住空白鍵拆開',
  legend: '組成（依權重）',
  weight: '權重',
  asOf: '資料日期',
  source: '來源',
  aggregateNote: '這是彙總部位，不代表單一公司。',
  partOf: (name: string) => `${name} 的組成`,
  close: '關閉',
  closeGlyph: '×',
  sliceAmount: '切割位置',
  explodeAmount: '拆開程度',
  next: '下一步',
  nextWaiting: '先拉上面的拉桿',
  nextWaitingName: '先拉上面的拉桿，再按下一步',
  prev: '上一步',
  finish: '自由玩',
  skipToSandbox: '跳過導覽，直接自由玩',
  toolbar: { dusk: '☾ 黃昏', day: '☀ 白天', labels: '🏷 標註', legend: '🎨 圖例', replay: '↺ 重看導覽' },
  toolbarLabel: '畫面設定',
  themeNames: { dusk: '黃昏', day: '白天' },
  themeLabel: '切換黃昏／白天',
  /** 主題按鈕的無障礙名稱：先念看得到的文字（WCAG 2.5.3），再說按下會做什麼 */
  themeAction: (current: string, to: string) => `${current}，切換到${to}`,
  chaptersLabel: '章節',
  chapterName: (i: number, name: string) => `${String(i).padStart(2, '0')} ${name}`,
  legendLabel: '產業顏色',
  tryIt: (control: string) => `👉 先拉一下上面的「${control}」`,
  progressLabel: '課程進度',
  recapLabel: '這堂課學到的',
  more: '多說一點',
  marks: {
    illustrative: { icon: '≈', word: '舉例', label: '舉例：為了說明而設計（示意），不是真實數字' },
    assumption: { icon: '✎', word: '假設的數字', label: '假設的數字：不是查到的資料，是拿來算給你看的' },
    /** r3：「還沒查證」讓他不信任整堂課；記號照樣標（誠實），用詞改成資料在等更新，放在一句話後面 */
    unverified: { icon: '？', word: '資料待更新', label: '資料待更新：這個數字還沒有和官方最新資料核對過' },
  },
  controls: {
    years: '持有年數',
    yearsValue: (v: number) => (v === 0 ? '未滿 1 年' : `${v} 年`),
    periods: '經過年數',
    periodsValue: (v: number) => `${v} 年`,
    phase: '時間軸',
    phaseValue: (v: number) => (v < 0.5 ? '發金幣前' : v < 0.55 ? '發金幣那一刻' : '過了一陣子'),
    frontLoad: '假設的前收手續費',
    frontLoadValue: (v: number) => `${(v * 100).toFixed(2)}%`,
    /** s-dd：價格路徑走到第幾年（0＝一開始） */
    tick: '時間軸',
    tickValue: (v: number) => (v === 0 ? '一開始' : `第 ${v} 年`),
    /** b-rate：現在的市場利率 */
    rate: '市場利率',
    rateValue: (v: number) => `${Number((v * 100).toFixed(1))}%`,
    /** e-dca：定期定額買了幾個月 */
    months: '經過月數',
    monthsValue: (v: number) => `${v} 個月`,
    /** a-hedge 看哪一種情境（0 平穩一年、1 慢慢漲一年、2 ⚡ 打下那天） */
    hedgeCase: '情境',
    hedgeCaseValue: (v: number) => (['平穩的一年', '慢慢漲的一年', '⚡ 打下那天'] as const)[Math.round(v)] ?? '',
    /** a-dt 當沖進出了幾次（一次＝買進再賣出） */
    trades: '進出次數',
    tradesValue: (v: number) => `${v} 次`,
    /** a-port 組合塔裡債券佔幾 %（其餘是股票） */
    bondPct: '債券比例',
    bondPctValue: (v: number) => `${v}%`,
  },
  stage: {
    held: '你手上的方塊',
    /** s-4：殘影分得多開（示意） */
    shake: { small: '晃得小', big: '晃得大' },
    bonds: { stock: '股票方塊', gov: '國家債', corp: '公司債', hy: '高收益債' },
    bondRanks: { gov: '最穩・利息少', corp: '中間', hy: '不穩・利息多' },
    /** 借給誰（r5：初階沒有 b-2，三個名字一次出現卻沒說借給誰） */
    bondWho: { gov: '借給政府', corp: '借給體質好的公司', hy: '借給體質弱的公司' },
    bondHurt: (name: string) => `${name}：出問題了`,
    rateNote: '利息快慢為示意',
    /** b-3 龍捲風上的標籤 */
    storm: '經濟風暴',
    exdiv: { block: '方塊', coins: '金幣', lost: (v: number) => `少了 ${v}` },
  },
  /** s-dd 最大跌幅的 3D 標註 */
  dd: {
    peak: (price: number) => `最高 ${price}`,
    drop: (pct: string) => `現在比最高少 ${pct}`,
    pit: (pct: string) => `坑深＝最多少掉 ${pct}`,
  },
  /** s-pe 本益比的 3D 標註：每疊旁邊寫疊了幾年、股價與每年賺多少 */
  pe: {
    /** 綠色薄片＝公司每年賺的錢（mid-r2：綠色疊疊樂沒標、「每年賺」不知道誰賺） */
    years: (n: number) => `${n} 年的獲利`,
    sub: (price: number, earn: number) => `股價 ${price}・公司每年賺 ${earn}`,
    /** 泡泡的意思：只說比較貴（mid-r2：「泡泡」被讀成「泡沫，會破」）；不說會跌 */
    bubble: '比較貴',
    bubbleSub: '不代表一定會跌',
  },
  /** b-rate 利率翹翹板的 3D 標註 */
  seesaw: {
    rate: (v: string) => `市場利率 ${v}`,
    bond: (price: number) => `舊借據 約 ${price} 元`,
    maturity: '借的人沒出問題，到期拿回 100',
    /** 寒流（結霜）的意思（mid-r1：借據變白不知道是什麼） */
    cold: '寒流＝利率漲，舊借據變便宜',
    /** 市場利率是什麼（mid-r2：先講原因） */
    rateIs: '＝新借據給的利息',
  },
  /** e-dca 定期定額的 3D 標註 */
  dca: {
    /** 最高那根小堆（mid-r2：「越高＝越便宜」反直覺，直接寫在上面） */
    cheap: '便宜的月份買到比較多',
    cheapSub: (price: number) => `${price} 元那個月`,
    piles: '粗柱＝那個月買到的單位',
    prices: '細線＝那個月的價格',
    tower: (months: number) => `買了 ${months} 個月`,
    cost: (v: string) => `平均成本 ${v} 元`,
  },
  /** b-infl 通膨的 3D 標註 */
  infl: {
    bond: (pct: string) => `借據：利息 ${pct}`,
    coins: (pct: string) => `利息 ${pct}`,
    real: (pct: string) => `真正賺到約 ${pct}`,
    eaten: (pct: string) => `通膨 ${pct} 融掉了`,
  },
  /** a-port 組合塔的 3D 標註（高階） */
  port: {
    stock: (pct: number) => `股票 ${pct}%`,
    bond: (pct: number) => `債券 ${pct}%`,
    after: (v: string) => `風暴後 ${v}`,
    ghost: '原本 100 萬',
    lost: (pct: string) => `少掉 ${pct}`,
  },
  /** a-corr 兩組用彈簧連著的方塊（高階） */
  corr: {
    together: '一起動',
    opposite: '一上一下',
    /** 各放一半，⚡ 那天合起來 */
    mix: (move: string) => `各一半，合起來 ${move}`,
    /** 方塊頭上的名字；打中之後加上漲跌 */
    a: (move: string) => (move ? `A ${move}` : 'A'),
    b: (move: string) => (move ? `B ${move}` : 'B'),
  },
  /** a-dt 當沖的 3D 標註（高階）：只說「交易成本」 */
  dt: {
    ghost: '原本 100 萬',
    capital: (n: number) => `進出 ${n} 次後的本金`,
    left: (v: string) => `剩 ${v}`,
    cost: '付掉的交易成本',
    chips: '勝率五五波',
    chipsSub: (win: string, loss: string) => `賺 ${win}、賠 ${loss}，各一半`,
  },
  /** a-dur 長短借據的 3D 標註（高階） */
  dur: {
    bond: (years: number) => `${years} 年借據`,
    drop: (pct: string) => `現在值少 ${pct}`,
    rate: (v: string) => `市場利率 ${v}`,
  },
  /** a-fee30 兩棵樹的 3D 標註（高階） */
  fee30: {
    active: '怪手挑（主動型）',
    passive: '照藍圖（指數型）',
    sub: (fee: string, v: string) => `每年 ${fee}・${v}`,
    lost: (v: string) => `費用吃掉 ${v}`,
    base: (gross: string) => `假設扣費前報酬一樣：每年 ${gross}`,
  },
  /** a-lev 三座塔（高階；通用名稱，不是真實商品） */
  lev: {
    plain: '大盤',
    double: '2 倍塔',
    inverse: '反向塔',
    left: (v: string) => `剩 ${v}`,
    start: '起點都是 100',
  },
  /** a-hedge 三座塔（高階；反向 ETF 用通用名稱） */
  hedge: {
    plain: '全押 0050',
    inverse: '0050＋反向',
    cash: '少買 0050＋現金',
    split: (base: number, other: number) => `${base}／${other}`,
  },
  /** 基金那一章的錢：投入 100＝100 萬（和計費表同一個底），一位小數、去掉「.0」 */
  wan,
  /** 元（四捨五入、千分位）：18800 → '18,800 元'（r5：有感的錢，像計費表的「已磨掉約 39,073 元」） */
  yuan: (v: number): string => `${Math.round(v).toLocaleString('zh-TW')} 元`,
  /** 元（一位小數）：39.03 → '39.0 元'（定期定額的平均成本、平均價格） */
  yuan1: (v: number): string => `${v.toFixed(1)} 元`,
  /** 大數字、3D 跌幅標籤用字說漲跌（負號太細，r3 看成正的） */
  move: { down: '跌', up: '漲' },
  towers: {
    lost: '費用扣掉的',
    lostPrincipal: '削掉的本金',
    coins: (v: number) => `領到的金幣 ${wan(v)}`,
    /** 配息陷阱：領到的金幣裡，有多少其實是削下來的本金（r5：91.2 ＋ 54.4 > 100，看起來像賺） */
    coinsFromPrincipal: (v: number) => `其中 ${wan(v)}是本金`,
    entry: (v: number) => `進門費 ${wan(v)}`,
    exit: (v: number) => `出門費 ${wan(v)}`,
    /** 一直在扣：出門費歸零時，後收那座才不會看起來「免費」 */
    held: '每年費用（一直在扣）',
    base: '假設投入 100 萬',
    baseDemo: '假設投入 100 萬（舉例的數字）',
    /** f-6：只算費用（mid-r1：85.7 萬被讀成基金會虧） */
    feesOnly: '只算費用，沒算漲跌',
    value: (v: number) => wan(v),
  },
  feeRaceCaveat: '三者投資內容與風險不同，費用低不代表比較好',
  feeRaceCaveatFunds: '同一檔基金，只差收費方式；前收手續費是假設值',
  /** 費用比一比的塔名（短）；即時數字表用下面的 feeRows（完整） */
  feeTowers: { front: '進門先付', back: '出門才付', etf: '門票便宜' },
  feeTowerNames: { front: '前收', back: '後收', etf: '0050' },
  feeRows: {
    front: (fl: number) => `前收型（假設 ${(fl * 100).toFixed(2)}%）`,
    back: '後收型（U 級別）',
    etf: 'ETF（0050）',
  },
  accumulateRows: { accumulate: '累積型', payout: '配息型' },
  /** f-8 塔的副標：講機制，不講好壞（mid-r2） */
  accumulateSubs: { accumulate: '金幣滾回塔裡', payout: '金幣在你手上' },
  trapRow: '高配息基金',
  excavator: '經理人（怪手）',
  excavatorOther: '另一位經理人（怪手）',
  feeMeter: {
    title: '計費表',
    elapsed: (year: number) => `第 ${year} 年`,
    ground: (amount: number) => `已磨掉約 ${Math.round(amount).toLocaleString('zh-TW')} 元`,
    base: '假設投入 100 萬',
    fastForward: '6 秒＝1 年',
  },
  ticker: { etf: '0050：隨時有價錢', fund: '基金：一天一個價錢' },
  readout: {
    title: '即時數字',
    invested: '投入 100 萬',
    block: '方塊價值',
    coins: '手上的金幣',
    total: '合計',
    remaining: (v: number) => `剩 ${wan(v)}`,
    leader: '費用最少（只比費用）',
    accumulate: '累積型的塔',
    payoutTower: '配息型的塔',
    payoutCash: '配息型領到的金幣',
    payoutTotal: '配息型合計',
    trapValue: '塔的價值',
    trapCash: '已領的金幣',
    trapPrincipal: '其中來自本金',
    expenseRatio: '每年內扣費用',
    overlapTotal: '前幾大持股重疊（至少）',
    atLeast: '（至少）',
    overlapNote: '其餘持股沒有列出，實際重疊更多',
    unverifiedParts: (parts: string) => `資料待更新：${parts}`,
    ddPrice: '現在的價格',
    ddPeak: '到目前的最高價',
    ddDrop: '現在比最高少',
    ddWorst: '最多曾經少掉',
    pePrice: '兩棟的股價',
    rateNow: '現在的市場利率',
    ratePrice: '舊借據現在值',
    rateFace: '到期拿回',
    dcaAmount: '每月投入',
    inflNominal: '利息',
    inflInflation: '通膨',
    inflReal: '真正賺到（約）',
    dcaUnits: '累積的單位',
    dcaCost: '平均成本',
    dcaPrice: '平均價格',
    peYears: (earn: number) => `每年賺 ${earn}：幾年賺回`,
    portStock: '股票那一截',
    portBond: '債券那一截',
    portRemaining: '風暴後整座塔',
    durBond: (years: number) => `${years} 年借據現在值`,
    fee30Years: '經過年數',
    fee30Active: (fee: string) => `怪手挑（每年扣 ${fee}）`,
    fee30Passive: (fee: string) => `照藍圖（每年扣 ${fee}）`,
    fee30NoFee: '完全沒費用的話',
    levPlain: '大盤：來回 5 次後',
    levDouble: '2 倍塔：來回 5 次後',
    levInverse: '反向塔：來回 5 次後',
    hedgeCase: '情境',
    dtTrades: '進出次數',
    dtCost: '每次進出的交易成本',
    dtCapital: '本金剩',
    dtPaid: '付掉的交易成本',
    corrAlone: '只放 A：平常晃多大',
    corrTogether: 'A＋一起動的，各一半',
    corrOpposite: 'A＋一上一下的，各一半',
  },
  feeParts: { expenseRatio: '內扣費用', distributionFee: '分銷費', cdsc: '遞延手續費', trading: '交易成本' },
  qualityNotice: '畫面有點卡，已自動切換成省電畫質。',
  dismiss: '知道了',
  fallbackIntro: '你的瀏覽器無法顯示 3D 畫面，以下是文字版課程。課文中提到的 3D 畫面與互動（拖曳、切開、拉桿）在文字版中省略，只保留文字與當下的數字。',
  underground: {
    goldVein: '黃金礦脈',
    unclassifiedStub: (pct: number) => `其他 ${pct.toFixed(0)}%`,
    /** 地底各層合計（mid-r2：63＋31 不是 100） */
    classified: (pct: number) => `各產業層合計 ${pct.toFixed(0)}%`,
    dig: '產業型 ETF',
    veins: '高股息型 ETF',
  },
  sectors: {
    semiconductor: '半導體',
    electronics: '電子',
    software: '軟體',
    internet: '網路',
    auto: '汽車',
    finance: '金融',
    unclassified: '其他',
  },
} as const
