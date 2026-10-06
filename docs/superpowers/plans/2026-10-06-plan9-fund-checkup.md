# 積木城市 Plan 9：實戰——拆解一檔真基金 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第四門課「實戰」，用 9 步拆解摩根多重收益基金（LU2347655073），資料全部來自一手來源快照並標示查證狀態，結尾體檢表即樣板。

**規格：** `docs/superpowers/specs/2026-10-06-fund-checkup-design.md`

## Global Constraints

- 規格全部適用；三階規格 §4（事件規則）、§5（不變的規則）；Plan 5 寫作規則（ASD-STE100 中文版）與 3b1b。
- 只用一手來源資料；第三方基金網站不得出現在資料、出處或畫面。數字一律由快照計算；未查證→？（自動推導）；查不到→不顯示並在多說一點說明。
- 不推薦、不唱衰：比較只用基金自己的指標指數（一手來源有才放）；體檢表附「只是體檢，不是叫你買或賣」與資料日期。
- 初階詞彙（方塊、借據、怪手、金幣）；中高階觀念在該步一句話＋畫面講完。
- 工作規則：`.superpowers/sdd/p9-common.md`（分支 feat/plan9-practice）。

---

### Task 1：資料快照與 schema

- `src/data/fundCheckup.ts`：zod schema `FundCheckup`（欄位見規格 §3；每欄 `{ value, source:{url,doc,date}, verified }`，value 可為 null）。
- `src/data/snapshot/practice/LU2347655073.json`：由研究結果（`.superpowers/sdd/p9-lu2347655073-research.md`／`p9-lu2347655073-draft.json`）填入；載入時 schema 驗證；`docs/data-sources.md` 加一節。
- 純函式（`src/sim/checkup.ts`）：費用合計、資產大類排序、區域排序、一年配息合計、同期淨值變化、年度報酬序列、（若有）配息組成比例、與指標指數的差額。
- 測試：schema、每個函式（公式寫在測試註解）、未查證欄位推導 ？。

### Task 2：CoveredCallStage 與 NavPayoutStage

- `src/sim/coveredCall.ts`：`coveredCall({ move, cap, premium })` → 一般 vs 掩護的報酬；測試大漲、平盤、下跌三情境。
- `CoveredCallStage`：塔＋天花板虛線；拉桿「漲幅」；切下的部分變金幣；上漲沿用 🌤 sunnyTree 事件（不新增事件種類）；≈。
- `NavPayoutStage`：近 12 個月淨值柱＋每月配息金幣堆；有配息組成時金幣兩色（收益／本金，本金用 loss 色）；大數字由 Task 1 函式計算。
- 截圖（黃昏、白天、手機）並 Read。

### Task 3：實戰課程與 9 步

- `courses.ts` 新增 `practice`（名稱「實戰」、tagline 例「拆解一檔真基金」、available）；開場卡與換階選單出現；章節：名片、拆開、配息、費用、績效、體檢表。
- 9 步（x-card、x-mix、x-where、x-hy、x-cc、x-pay、x-fee、x-perf、x-fin）照規格 §2；Basket 改吃快照資產大類（或新增 `checkup` 籃子資料轉接）；x-where 用城市島嶼亮度；x-hy 重用龍捲風；x-fee 重用計費表；x-perf 時間線（跌的年份 🌋）。
- 體檢表：5–6 行（例：怪手挑的平衡型／一半以上不是股票／有容易裂的借據／每月配息，看塔有沒有變矮／每年先扣約 X%／近 N 年報酬…），每行附資料日期。
- 寫作規則、標示、無「稅」測試全綠；e2e 從開場卡選「實戰」走完。
- 截圖每步（黃昏桌機＋手機抽查）並 Read。

### Task 4：人物測試（林小姐）與修正

- 拍實戰全步驟；Fable agent 以 `.superpowers/usertest/persona-mid.md` 扮演林小姐並加問：「看完你會覺得這檔是好還是不好？為什麼？」「月配和本金的關係你怎麼理解？」
- 依報告修一輪。
