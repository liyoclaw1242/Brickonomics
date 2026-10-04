# 積木城市 Plan 6：三階課程架構與事件系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「簡單版／完整版」兩條路線換成「初階／中階／高階」三門獨立課程（高階先隱藏），每門課四章（股票→債券→基金→ETF）＋開頭／結尾；並把龍捲風、閃電整理成共用事件系統。

**Architecture:** 步驟仍放在既有的 `LEVELS`（當作步驟池）＋少量新步驟；新的純資料 `src/tour/courses.ts` 定義三門課的章節與步驟 id；導航、進度、時間軸、URL、存檔全改成「目前課程」為單位；事件以 `scene.event` 叫用 `src/scene/events/` 下的元件。

**Tech Stack:** 沿用（Vite、React 19、R3F 9、drei 10、zustand 5、Vitest、Playwright）。

**規格：** `docs/superpowers/specs/2026-10-05-three-tiers-design.md`（§2.1、§2.2 Plan 6 欄、§3、§4、§5）

## Global Constraints

- 規格 §5 全部適用：寫作規則（ASD-STE100 中文版）、3b1b、數字由資料計算、示意／假設／資料待更新標示（自動推導）、不談稅、方塊數依權重、一種材質一個 InstancedMesh、Html 等第一幀、TypeScript strict 無 any、UI 字串只在 `src/ui/strings.ts`、課程內容只在 `src/tour/levels.ts` 與 `src/tour/courses.ts`。
- 既有步驟的內容與畫面**不改**（只搬位置／分課）；龍捲風、閃電搬進事件系統後外觀與時序**不變**。
- 高階在 Plan 6 **隱藏**（課程資料可先有空殼，但開場卡、換階選單、網址都不能進入）。
- 純 TS 模組：`src/tour/*`、`src/scene/layout/*`、`src/scene/events/*.ts`（非 tsx）、`src/ui/chapters.ts`。
- 工作規則：`.superpowers/sdd/p5-common.md`（分支名改為 feat/plan6-tiers）。

---

### Task 1：課程資料（courses.ts）與新步驟

**Files:** Create `src/tour/courses.ts`, `src/tour/courses.test.ts`; Modify `src/tour/levels.ts`, `src/tour/types.ts`, `src/tour/levels.test.ts`

**Interfaces（Produces）:**
- `type CourseId = 'beginner' | 'intermediate' | 'advanced'`
- `type CourseChapter = { id: string; icon: string; name: string; stepIds: readonly string[] }`
- `type Course = { id: CourseId; name: string; tagline: string; chapters: readonly CourseChapter[]; available: boolean }`
- `COURSES: readonly Course[]`（順序：初、中、高；高階 `available: false`、章節可為空）
- `STEP_POOL: ReadonlyMap<string, Step>`（所有 LEVELS 步驟＋新步驟）
- `courseSteps(c: Course): Step[]`、`courseOfStep(id): CourseId | undefined`、`availableCourses()`

**內容（照規格 §2.1、§2.2 Plan 6 欄）：**
- 初階：序章 p-1、p-2；股票 s-1、s-2、s-3；債券 b-1、b-3；基金 f-1、f-5、f-9；ETF e-1、e-2、e-3、e-5、c-1、c-2；結尾 **u-6**（口訣卡）。結尾步的口訣與「推薦下一階」文字寫在步驟資料。
- 中階：開頭 **新步 `m-0`「初階口訣複習」**（recap 四句同初階結尾、scene overview）、p-3；股票 s-4、s-5、s-6；債券 b-2；基金 f-2、f-3、f-4、f-6、f-8；ETF e-4、c-3、c-4、u-1、u-2、u-3、u-4、u-5；結尾 **新步 `m-fin`「中階口訣卡」**（四句：例如 🧱 股票要看總報酬（方塊＋金幣）／📜 越穩的借據利息越少／🚜 費用分進門、出門、每年／🧩 ETF 拆開看：重疊、產業、配息型——全部寫在 levels/courses，符合寫作規則），並推薦高階（Plan 6 時高階未開放 → 推薦自由玩）。
- 章節名稱與圖示用既有的 🏙 序章、🧱 股票、📜 債券、🚜 基金、🧩 ETF；開頭／結尾章可用 🔁 複習、🎓 完成（字串進 strings.ts）。
- 新步驟要通過現有 levels 測試的所有寫作／標示規則；levels.test.ts 的規則測試改為遍歷 `STEP_POOL`。

**Tests（courses.test.ts）:** 每個 id 存在於 STEP_POOL；三門課內不重複、初中之間不重複；每門 available 課的前四個內容章依序為 股票、債券、基金、ETF（開頭／結尾章之外）；初階 17 步＝原 simple 清單（順序依新章節）；中階涵蓋原 full 中不在初階的全部步驟（u-6 除外）＋ m-0、m-fin；高階 `available === false`。

- [ ] 寫測試（RED）→ 實作 → GREEN → `npx tsc --noEmit && npm test` → Commit `feat(tour): course data — beginner and intermediate from existing steps, recap and finish steps`

### Task 2：課程導航、進度、URL、存檔遷移

**Files:** Modify `src/tour/engine.ts`(+test), `src/tour/types.ts`, `src/store/tour.ts`(+test), `src/main.tsx`; Remove `ROUTES`/`Route` 相關（或保留僅供遷移）

**Interfaces:**
- `CoursePosition = { course: CourseId; index: number }`
- engine（純）：`stepAtCourse(pos)`, `nextIndex`, `prevIndex`, `progressFractionCourse`, `chapterOfIndex(course, index)`, `firstIndexOfChapter(course, chapter)`, `isValidCoursePos`, `resumeCoursePosition(saved: unknown): CoursePosition | null`（規則見下）, `parseCourseQuery(search): { course?: CourseId; stepId?: string; legacy?: ... }`
- Progress 結構：`{ course: CourseId | null; stepId?: string; completed: Record<CourseId, string[]>（完成的章 id）; finished: CourseId[]; sandboxUnlocked: boolean }`；`sandboxUnlocked` 在任一課完成時為 true。
- store：`course`, `pos`（CoursePosition）, `chooseCourse(id)`, `switchCourse(id)`（跳到新課中「目前步驟若存在就停那步，否則該課第一步」）, `next/prev/enterIndex/restartCourse`。

**遷移規則：**
- `?course=<id>&step=<stepId>` 優先；step 不在該課 → 該課第一步。
- 舊 `?route=simple` → beginner；`?route=full` → 依 step 所在課程（不在任何課 → intermediate 第一步）。舊 `?level=&step=`（絕對位置）→ 找到該步 id → 所在課程（同時存在兩課不可能，因不重複）。
- 舊存檔：有 `stepId` → `courseOfStep`；無 id → 用既有 `resumePosition` 找回步驟再找課程；`route: 'simple'` 且步驟不在初階 → 初階最近的前一步。舊 `completed`（章 id 陣列）→ 對映到含那些章步驟的課程（簡化：若舊存檔已解鎖沙盒則保留 `sandboxUnlocked`）。
- 無效 → `course: null`（顯示開場卡）。

**Tests:** 導航不跨課、進度比例、每課完成獨立（完成初階不會把中階標成完成）、`switchCourse`、所有遷移案例、無效輸入安全退回。

- [ ] RED → 實作 → GREEN → tsc/test → Commit

### Task 3：介面：開場卡、換階、時間軸、結尾推薦、文字版

**Files:** `src/ui/RouteStart.tsx`→`CourseStart.tsx`、`src/ui/Toolbar.tsx`、`src/ui/ChapterTimeline.tsx`、`src/ui/chapters.ts`(+test)、`src/ui/TourPanel.tsx`、`src/ui/panel/*`、`src/ui/FallbackApp.tsx`、`src/ui/fallback.ts`(+test)、`src/ui/strings.ts`、`src/ui/ui.css`

- 開場卡：可用課程的大按鈕（名稱＋一句白話 tagline＋「N 步」），第一次來才顯示；建議順序以視覺排序呈現（不鎖）。
- 工具列「換階」：膠囊顯示目前階（例如「初階」），點開選單列出可用課程（a11y：`aria-haspopup`、可鍵盤操作、Escape 關閉）。
- 時間軸：目前課程的章；章狀態依該課進度。步數計數「NN / NN」以課內章為單位（沿用現有樣式）。
- 結尾步：口訣卡下方「下一階：中階 →」按鈕（下一階不可用時顯示「去自由玩」）。
- 文字版：選階＋依課程章節列出。
- 移除「簡單版／完整版」所有字串與元件。

**Tests:** chapters.test 改課程版；fallback 依課程輸出；開場卡只在 `course === null` 顯示。

- [ ] 實作 → tsc/test/build → 截圖（開場卡、初階 p-1、中階 m-0、中階 u-3、中階 m-fin、換階選單；黃昏桌機＋手機）並 Read → Commit

### Task 4：事件系統（龍捲風、閃電搬入）

**Files:** Create `src/scene/events/EventLayer.tsx`、`src/scene/events/types.ts`、`src/scene/events/index.ts`；Move `src/scene/layout/storm.ts`→`src/scene/events/tornado.ts`、`lightning.ts`→`src/scene/events/lightning.ts`（含測試）、`Tornado.tsx`/`Lightning.tsx`/`StormCloud.tsx` → `src/scene/events/`；Modify `src/tour/types.ts`（`SceneDirective.event?: EventSpec`）、`BondShowcase.tsx`、`ShockStage.tsx`、`StageView.tsx`、`levels.ts`（b-3、c-1、c-2 改用 `scene.event`）

**Interfaces:**
- `type EventKind = 'tornado' | 'lightning'`（Plan 7/8 會擴充）
- `type EventSpec = { kind: EventKind; phase?: 'gather' | 'strike' }`（lightning 的 c-1 gather、c-2 strike；tornado 無 phase）
- 共用 hook：`useEventClock(spec)` 回傳 `{ t, done, reduced }`（鏡頭停下才開始、`prefers-reduced-motion` 直接到結束、動畫期間 `useContinuousRender`）。
- 舞台（BondShowcase、ShockStage）只讀「事件進度」決定受損程度，不再自己內嵌天氣邏輯；事件與舞台之間用純函式（例如 `tornadoHitAt(t, target)`、`strikeAt(t)`）。

**驗收：** b-3、c-1、c-2 的畫面與時序與目前 main 相同（截圖比對 mid／end，黃昏＋白天），測試全綠（含既有 storm/lightning 測試搬家後仍在）。

- [ ] 實作 → tsc/test/build/e2e → 截圖比對 → Commit

### Task 5：e2e、截圖腳本、走查

**Files:** `e2e/*.spec.ts`、`e2e/helpers.ts`、`scripts/usertest-shots.mjs`、`scripts/walkthrough.mjs`

- e2e：第一次來 → 開場卡 → 選初階 → 走完 17 步到結尾 → 結尾按「下一階：中階」→ 中階第一步 m-0；換階選單；舊網址 `?route=simple&level=0&step=0` 轉到初階；舊存檔遷移一例；既有測試改用 `?course=`。
- 截圖腳本與 walkthrough 支援 `course` 參數（按課內順序編號）。
- 走查：初階、中階各黃昏桌機一輪全步驟截圖並 Read；手機抽查開場卡、換階、結尾。

- [ ] 實作 → `npx tsc --noEmit && npm test && npm run build && npm run e2e` → Commit
