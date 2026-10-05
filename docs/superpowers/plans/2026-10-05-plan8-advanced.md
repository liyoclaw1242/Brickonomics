# 積木城市 Plan 8：高階 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 開放高階課程（怎麼組合、怎麼控風險）：組合塔、相關性、當沖成本、存續期間、主動 vs 被動 30 年、槓桿 ETF 耗損、反向 ETF 對沖、再平衡；新增 🌊 大浪事件；用 Fable 人物（45 歲、略過度自信）測試修正。

**規格：** `docs/superpowers/specs/2026-10-05-three-tiers-design.md` §2.3、§4、§5、§6

## Global Constraints

- 規格 §5 全部適用；只用現有四種商品（**不談期貨、選擇權、融資融券**）；槓桿／反向 ETF 用通用名稱（「2 倍槓桿 ETF」「反向 ETF」），不放真實代號；舉例數字一律 ≈。
- **不得鼓勵當沖或槓桿**：當沖只講成本、風險、為什麼多數人賠；槓桿／反向只講機制與耗損；對沖講「損失變小但平時一直付代價」。研究數據必須附出處並照查證規則（`docs/data-sources.md`）。
- 事件統一規則（規格 §4）；新事件先 DEV 預覽驗收。
- 寫作規則（ASD-STE100 中文版）與 3b1b；高階讀者讀得較快，但仍一步一觀念、一句話 ≤ 20 字。
- 工作規則：`.superpowers/sdd/p8-common.md`（分支 feat/plan8-advanced）。

---

### Task 1：高階模擬（純函式＋測試）

`src/sim/` 新增（guard.ts 檢查輸入、每個有測試、數字寫出公式）：
- `portfolio.ts`：`stressTest({ stockPct, scenario })` → 風暴下組合塔剩多少（股票跌 X%、債券跌／漲 Y%，舉例情境常數）。
- `correlation.ts`：兩條舉例報酬路徑＋組合；`volatility(path)`、`combine(a, b, w)`；展示「一上一下」組合波動較小。
- `dayTrade.ts`：`dayTradeDrain({ trades, costPerTrade, winRate, avgWin, avgLoss })` → 期望值與 N 天後本金（勝率 50%、輸贏對稱時，成本把本金磨掉）。
- `duration.ts`：沿用 Plan 7 `bondPrice`；`priceChange(years, rateFrom, rateTo)`，比較 2 年 vs 20 年借據。
- `feeDrag.ts`：30 年複利，`grow(principal, grossReturn, fee, years)`，1.88% vs 0.14%（用已查證費率，報酬率舉例）。
- `leverage.ts`：每日重設：`leveragedPath(path, k)`；漲跌來回（+10%／−10% 重複 n 次）一般塔 vs 2 倍塔 vs 反向塔。
- `hedge.ts`：0050 部位＋一部分反向 ETF；⚡ 打下時與平時（每天費用、市場上漲時反向虧損）兩種情境的結果。
- `rebalance.ts`：目標股債比、漂移後比例、剪高補低後比例。

- [ ] RED → GREEN → Commit（可分多個 commit）

### Task 2：🌊 大浪事件

`src/scene/events/wave.ts`(+test)、`Wave.tsx`、註冊；浪一上一下（次數＝參數），每次浪打到目標時目標高度由舞台依 `leveragedPath` 更新（事件參數靜態、舞台映射數值，照 events/index.ts 規則）；不閃；減少動態→最終；DEV 預覽截圖驗收。

- [ ] 實作 → 預覽截圖 → Commit

### Task 3：當沖研究數據查證

研究 agent：找台灣當沖者長期獲利比例的一手研究（例如 Barber, Lee, Liu, Odean 的台灣當沖研究）與出處；寫入 `docs/data-sources.md` 與一個資料常數（含出處、年份、查證狀態）；只有一手出處明載的數字才標已查證，否則畫面顯示「資料待更新」。

- [ ] 研究 → 資料＋文件 → Commit

### Task 4：高階步驟（含開放高階）

`src/tour/levels.ts`、`src/tour/courses.ts`、新舞台；高階章節（規格 §2.3）：
- 開頭：`a-0` 中階口訣複習、`a-port` 自己蓋組合塔（股債比例拉桿，🌪 測試，大數字「這座塔在風暴裡少掉 X%」）
- 股票：`a-corr` 相關性（彈簧連兩顆方塊，⚡ 打一顆）、`a-dt` 當沖成本（每次進出跳表，勝率五五波仍被成本磨光；研究數據卡）
- 債券：`a-dur` 存續期間（❄️ 寒流，短板 vs 長板翹翹板）
- 基金：`a-fee30` 主動 vs 被動 30 年（🌤 兩棵樹）
- ETF：`a-lev` 槓桿耗損（🌊 大浪）、`a-hedge` 反向 ETF 對沖（天平＋⚡；平時的代價也要畫出來）、`a-rebal` 再平衡（塔長歪了剪高補低）
- 結尾：`a-fin` 高階口訣卡 → 自由玩
- 高階 `available: true`；中階 m-fin 推薦高階；開場卡與換階選單出現高階。
- 每步一個 commit；截圖（黃昏桌機、白天、手機）並 Read；寫作與標示規則測試全綠；e2e 加高階走完。

- [ ] 實作 → tsc/test/build/e2e → Commit

### Task 5：Fable 人物測試（高階）與修正

人物：`.superpowers/usertest/persona-adv.md`（張先生 45 歲）。拍高階全步驟，Fable agent 報告；重點：有沒有被誤導成鼓勵當沖／槓桿、風險有沒有講太輕、哪裡太淺或數字不對。依報告修一輪、再測一輪。
