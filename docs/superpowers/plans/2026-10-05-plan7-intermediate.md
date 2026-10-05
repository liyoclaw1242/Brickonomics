# 積木城市 Plan 7：中階新內容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 中階加入「怎麼比」的新觀念：最大跌幅（🌋 地震）、本益比（🫧 泡泡）、利率翹翹板（❄️ 寒流）、定期定額（🌤 晴天大樹）、通膨（☀️ 熱浪），並用 Fable 人物（32 歲上班族）測試修正。

**Architecture:** 每個新事件＝一個純時間軸模組＋一個元件＋事件註冊（照 `src/scene/events/index.ts` 的說明）；每個觀念＝一個純計算函式（`src/sim/`，含 guard 檢查）＋一個舞台＋步驟資料。新步驟放進 `COURSES` 的中階章節。

**規格：** `docs/superpowers/specs/2026-10-05-three-tiers-design.md` §2.2、§4、§5、§6

## Global Constraints

- 規格 §5 全部適用（寫作規則、3b1b、數字由資料／模擬計算、標示自動推導、不談稅、TypeScript strict 無 any、字串位置規則）。
- 新觀念的數字一律是**舉例**（≈，`mark: 'illustrative'`），除非使用已查證資料；舉例參數集中在一個常數物件並在「多說一點」寫明是舉例。
- 事件統一規則（規格 §4）：鏡頭停下才發生、一次只變一件事、打擊只一次（≤ 1 次閃光）、減少動態→靜態結果、低畫質簡化、主題色、只在動畫期間連續渲染、純時間軸測試「結束＝最終狀態」。
- 新事件先用 DEV 預覽頁（`?eventPreview=<kind>`，只在 DEV）單獨截圖驗收（黃昏、白天、手機、低畫質、減少動態），再放進課程。
- 工作規則：`.superpowers/sdd/p6-common.md`（分支 feat/plan7-intermediate）。

---

### Task 1：四個新事件（地震、泡泡、寒流、晴天大樹）＋熱浪

**Files:** `src/scene/events/{quake,bubble,freeze,sunnyTree,heatwave}.ts`(+tests)、對應 `.tsx` 元件、`src/scene/events/index.ts` 註冊、DEV 預覽頁（例如 `src/scene/events/EventPreview.tsx`＋main.tsx 的 DEV 參數）

- 🌋 **quake**：地面震動（一次，短）→ 裂出坑，坑深＝參數 `depth`（0–1）；結束時坑保留。
- 🫧 **bubble**：目標被半透明泡泡包住、浮起（`lift`）；`phase: 'float' | 'pop'`，pop 時泡泡一次破掉、目標落回（只一次，不閃）。
- ❄️ **freeze**：寒風吹過，目標表面結霜（顏色往冰藍混、霜厚度＝參數 `amount`）；長的目標霜更厚（給 Plan 8 存續期間用）。
- 🌤 **sunnyTree**：天空轉晴、光線變暖；目標像樹一樣隨時間軸長高（由舞台驅動高度，事件只負責天氣與光線）。
- ☀️ **heatwave**：熱浪扭曲（簡化：暖色霧＋輕微上升的熱氣線），目標金幣逐漸縮小（`melt` 0–1）。
- 每個 kind：純時間軸＋測試（結束＝最終狀態、只閃一次或不閃）；預覽頁五種情境截圖並 Read。

- [ ] 實作 → tsc/test/build → 預覽截圖驗收 → Commit（每個事件一個 commit）

### Task 2：股票章——最大跌幅、本益比

**Files:** `src/sim/drawdown.ts`(+test)、`src/sim/valuation.ts`(+test)、新舞台元件、`src/tour/levels.ts`（新步驟）、`src/tour/courses.ts`（中階股票章）

- **最大跌幅（新步 `s-dd`）**：舉例價格路徑（常數，例：100→140→84→120），純函式 `maxDrawdown(path)` 回傳 `{ peakIndex, troughIndex, pct }`。畫面：方塊高度時間線（一排柱），拖「時間軸」走到谷底時 🌋 地震、地面裂坑，坑深＝跌幅；大數字「最多曾經少掉 40%」（計算）。line 例：「拖**時間軸**。看最多**少掉多少**」。
- **本益比（新步 `s-pe`）**：兩棟舉例大樓，價格一樣、每年吐的金幣不同；純函式 `yearsToPayBack(price, earnings) = price / earnings`。畫面：金幣一年一年疊到和方塊一樣高，數年數；60 年那棟被 🫧 泡泡包住浮起（`float`），步驟結尾一次 `pop`（可選，或留在高階）。大數字「15 年 vs 60 年」。標 ≈；多說一點說明本益比＝股價÷每股盈餘、年數越多越貴、不代表一定會跌。
- 兩步都 `mark: 'illustrative'`；寫作規則測試全綠。

- [ ] RED → 實作 → GREEN → 截圖 → Commit

### Task 3：債券章——利率翹翹板、通膨

**Files:** `src/sim/bondPrice.ts`(+test)、新舞台、levels/courses

- **利率翹翹板（新步 `b-rate`）**：純函式 `bondPrice({ coupon, years, rate })`（年付息現值，面額 100）。畫面：翹翹板一端是「市場利率」、一端是「舊借據價格」；拖「市場利率」拉桿（例 2%→5%），❄️ 寒流讓舊借據結霜、價格那端往下（價格由函式算）。大數字「舊借據變 ~XX 元」。舉例 ≈。
- **通膨（新步 `b-infl`，可選，時間不夠就跳過並記錄）**：利息金幣 vs ☀️ 熱浪融化；純函式 `realReturn(nominal, inflation)`；大數字「真正賺到約 X%」。

- [ ] RED → 實作 → GREEN → 截圖 → Commit

### Task 4：ETF 章——定期定額

**Files:** `src/sim/dca.ts`(+test)、新舞台、levels/courses

- **定期定額（新步 `e-dca`）**：舉例 12 個月價格路徑；每月固定金額；純函式 `dca(prices, amount)` 回傳每月買到的單位、總單位、平均成本（＝總金額÷總單位，應 ≤ 價格平均）。畫面：每月一小堆方塊（便宜的月份堆比較高），🌤 晴天大樹讓塔隨月份長高；大數字「平均成本 X 元（比平均價格低）」。舉例 ≈；多說一點提醒：不保證賺錢，只是讓成本平均。

- [ ] RED → 實作 → GREEN → 截圖 → Commit

### Task 5：中階結尾更新、e2e、走查

- 中階 `m-fin` 口訣加入新觀念（仍 4 句，可改寫）；中階課程步數更新（開場卡、e2e）。
- e2e：中階從頭走到結尾（含新步驟的 until 閘門）。
- 走查：中階黃昏桌機全步驟、手機抽查新步驟。

- [ ] 實作 → tsc/test/build/e2e → Commit

### Task 6：Fable 人物測試（中階）與修正

- 人物：32 歲上班族，在定期定額 0050 但不懂原理；看得懂一般文字但沒耐心看長篇；想知道「怎麼比較、怎麼選」。
- 用 `scripts/usertest-shots.mjs` 拍中階全步驟（含拉桿後），Fable agent 扮演並寫報告（每步：看到什麼、懂了什麼、卡住、耐心分數；最後：用自己的話說每個新觀念、會不會誤解成投資建議）。
- 依報告修正一輪，再測一輪。
