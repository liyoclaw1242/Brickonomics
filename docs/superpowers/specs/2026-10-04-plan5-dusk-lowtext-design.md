# 積木城市 Plan 5：黃昏風格與少字教學 — 設計規格

- 日期：2026-10-04
- 狀態：使用者已確認（版面 B、方塊 B、全中文標題、預設黃昏可切白天、移除免責聲明、少字聯想、不需朗讀）
- 參考：使用者提供的建築 X 光截圖（深色黃昏、字距加寬標題、步驟編號、大標題、右上膠囊按鈕、圖例、帶引線標註、底部章節時間軸）

## 1. 受眾與目標

- 內部教學；使用者**看到大量文字會腦霧**。教法以**聯想**為主：圖示、顏色、3D 畫面、一個大數字，文字極少。
- 成功標準：每一步不打開「多說一點」也能看懂重點；畫面風格接近參考圖。

## 2. 範圍

### 納入
- 黃昏主題（預設）與白天主題，右上工具列切換，記住選擇（localStorage）。
- 版面 B：左側**深色玻璃面板**（手機：底部可收合抽屜）＋右上膠囊工具列＋底部章節時間軸＋帶引線標註。
- 標題全中文：「積 木 城 市」（字距加寬）。
- 每一步：短標題（≤ 8 字）、一句話（≤ 20 字，關鍵詞 `**…**` 強調）、大數字卡（可選）、最多 2 個引線標註、「多說一點」（預設收起，收原本的課文與數字表）。
- 固定聯想圖示：🏙 序章、🧱 股票、📜 債券、🚜 基金、🧩 ETF、⚡ 情境、🪨 地底；🪙 配息、🚪 費用。
- 標示改成小圖示（滑過／點一下顯示說明）：≈ 示意、✎ 假設、？ 待驗證。
- 方塊低飽和霧面；正在講解／被選到／拆開時，重點那一組恢復鮮豔並微亮。
- 城市大樓名稱改成很淡的小字，被選到時變亮；標註可由工具列開關。

### 移除
- 免責聲明（元件、字串、CSS 定位）。
- 白色膠囊標籤樣式（`labelStyle`／`dimLabelStyle`）。

### 不變
- 所有資料、計算、教學事實與示意／假設／待驗證的判斷規則（只是呈現方式改成圖示）。
- 籃子方塊數嚴格依權重；一種材質一個 InstancedMesh；Html 等 `useAfterFirstTick`。
- 文字版（WebGL 備案）：改用標題＋一句話＋多說一點。

## 3. 架構

- `src/scene/theme.ts`（純）：`ThemeId = 'dusk' | 'day'`；`THEMES[id]` 含天空／霧／燈光組（主光、補光、環境光顏色與強度）／地面／海／島／櫃台／廣場／土壤／標註色，以及方塊的 `muted(hex)`、`vivid(hex)` 轉換參數。
- `src/store/theme.ts`：zustand，`theme`、`toggleTheme()`、`labels`（標註開關）、`legend`（圖例開關）；localStorage 保存。`<html data-theme>` 同步，CSS 變數分兩組。
- `src/scene/Lighting.tsx`：依主題設定燈光、天空、霧。
- `src/scene/layout/tone.ts`（純）：`groupTone({ group, focus, picked, explode }) → 'vivid' | 'muted'`；`toneColor(hex, tone, theme)`。
- `src/scene/Callout.tsx`：錨點＋引線＋標題／副標＋可選標示圖示；`NameLabel.tsx`：淡色名稱字。
- `src/ui/layoutModel.ts`（純）：依視窗大小回傳面板／工具列／時間軸的佔用邊距與 `mobile`；`ViewFraming` 讀它；CSS 斷點單一來源。
- 面板拆分：`StepHeader`、`OneLine`（`parseEmphasis` 純函式）、`BigNumberCard`、`MoreSection`、`StepControls`、`StepNav`；`Toolbar`；`ChapterTimeline`（`chapterStates` 純函式）；`MarkIcon`。
- 課程資料：`Step` 新增 `title`、`line`、`mark?: 'illustrative' | 'assumption'`、`bigNumber?: (c) => BigNumber`、`focus?: { holdings?: string[] }`、`callouts?: CalloutSpec[]`；原 `text` 改名 `more`。數字一律由 `TextContext` 即時計算。

## 4. 測試與驗證

- 單元測試：主題（兩套都有完整欄位、muted 降飽和、vivid 不變）、`groupTone`、`parseEmphasis`（含字數計算）、`layoutModel`、`chapterStates`、大數字取值。
- 課程規則：每一步有 `title`（≤ 8 字）與 `line`（≤ 20 字，不含 `**`）；示意舞台的步驟 `mark === 'illustrative'`；不含「稅」。
- 現有單元測試與 e2e 全數通過（e2e 改用新按鈕與章節時間軸）。
- 黃昏與白天各做一次 walkthrough（桌機＋手機），逐張檢查。
