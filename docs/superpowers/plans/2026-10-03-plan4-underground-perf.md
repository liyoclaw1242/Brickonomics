# 積木城市 Plan 4：地底章節、效能、備案與端到端測試 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 補上第 6 關「鑽進地底」（產業地層、市值型岩芯、產業型水平挖、高股息礦脈、黃金礦脈），改成畫面靜止就不重繪、依幀率自動降畫質，加上 WebGL 不支援時的文字版課程、續看進度、端到端測試，並把 0050 改用元大官方數據。

**Architecture:** 延續 Plan 3：純函式（`src/scene/layout/underground.ts`、`src/ui/fallback.ts`、`src/ui/webgl.ts`）負責所有計算並有單元測試；R3F 元件只負責畫。`<Canvas frameloop="demand">`：需要持續動畫的元件用 `useContinuousRender()` 在掛載期間要求下一幀。畫質放進 zustand（`src/store/quality.ts`），drei `<PerformanceMonitor>` 幀率過低時降級並提示。端到端測試用 `@playwright/test`，實際點「下一步」走完導覽。

**Tech Stack:** 沿用 Plan 1–3；新增 devDependency `@playwright/test`。

**規格：** `docs/superpowers/specs/2026-10-03-block-city-invest-design.md`
**必讀：** `docs/superpowers/plans/plan3-carryover.md` 最後一段（Plan 4 事項）

**路線圖：** Plan 1–3 完成；Plan 4（本檔）；Plan 5：視覺風格改版（深色黃昏風格、字距加寬的標題、圖示膠囊按鈕、帶引線的標註、底部章節時間軸，參考使用者提供的建築 X 光截圖）。**本計畫不改視覺風格**，新介面元件沿用現有樣式即可。

## Global Constraints

（同 Plan 3，全部仍然有效）
- 介面外框文字只在 `src/ui/strings.ts`；課程內文只在 `src/tour/levels.ts`。
- 免責聲明固定顯示；介面文字不可出現「稅」；示意參數在畫面上標「示意」；假設情境寫成「假設」；未驗證顯示「待驗證」（一律用 `isVerified`）；課程數字由資料即時計算。
- 籃子方塊數嚴格依權重；一種材質一個 InstancedMesh。
- 純 TypeScript 模組清單加上：`src/scene/layout/underground.ts`、`src/ui/fallback.ts`、`src/ui/webgl.ts`。
- 新增 drei `<Html>` 等 `useAfterFirstTick()`。
- TypeScript strict，不可以使用 `any`。
- 共用工作規則：`.superpowers/sdd/p3-common.md`（dev server 只用精確 PID 關閉、截圖要 Read、commit 結尾附 Co-Authored-By）。

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `src/data/snapshot/etfs.json`（改）、`docs/data-sources.md`（改） | 0050 改用元大官方持股 |
| `src/scene/useContinuousRender.ts` | demand 模式下持續動畫 |
| `src/scene/FrameCounter.tsx` | 開發模式的幀數計數（測試用） |
| `src/store/quality.ts` | 畫質狀態與降級 |
| `src/ui/QualityNotice.tsx` | 降級提示 |
| `src/ui/webgl.ts`、`src/ui/fallback.ts`、`src/ui/FallbackApp.tsx` | WebGL 偵測與文字版課程 |
| `src/scene/layout/underground.ts` | 產業分組、地層、岩芯分段 |
| `src/scene/stage/UndergroundStage.tsx` | 地底舞台 |
| `src/tour/*`（改） | 第 6 關內容、`TextContext.sectorPct`、`Stage` 新種類、續看位置 |
| `playwright.config.ts`、`e2e/*.spec.ts` | 端到端測試 |
| `scripts/walkthrough.mjs`（改） | 改用就緒訊號 |

---

### Task 1：0050 改用元大官方數據

**Files:**
- Modify: `src/data/snapshot/etfs.json`, `docs/data-sources.md`，以及依賴 0050 數字的測試（見 Step 4）

**Interfaces:**
- Consumes: 既有快照與 schema
- Produces: 0050 的 `holdings`（前四大個股 + `OTHER_TW_STOCK`，總和 100 ± 0.5）、`asOf`、`source`、`verified.holdings`、`notes`

- [ ] **Step 1：查證**

用網路搜尋（ToolSearch `select:WebSearch,WebFetch`）到元大投信官網找 0050 最新公告的持股權重（目標：2026-10 初）。記下前四大個股（預期為 2330、2454、2308、2317，若不同照實記錄）、各自權重與資料日期。查不到官方頁面就**不要改數字**，在報告說明並結束本任務（BLOCKED 以外的 DONE_WITH_CONCERNS）。

- [ ] **Step 2：更新 `etfs.json` 的 0050**

前四大照官方數字；`OTHER_TW_STOCK = 100 − 前四大合計`（四捨五入到 0.01，確保總和在 100 ± 0.5）。`asOf` 改成官方資料日期；`source` 換成元大官網網址；`verified.holdings: true`；`notes` 寫明資料來源與日期，刪掉「日後改用元大」的字樣。若前四大個股 id 不在 `stocks.json`，新增該個股（含市值查證規則同 Plan 2 Task 2；查不到市值就不填）。

- [ ] **Step 3：更新 `docs/data-sources.md` 的 0050 列**

- [ ] **Step 4：重算依賴 0050 數字的測試**

以下測試寫死了舊數字，逐一用新數字**手算**後更新（寫出算式）：
- `src/data/snapshot.test.ts`：`weightOf('0050', '2330')`
- `src/sim/scenario.test.ts`、`src/tour/context.test.ts`：`shock('0050')` = −0.3 × 新權重/100
- `src/tour/context.test.ts`：`pct0(57.35)` 這行是格式測試，保留不動；`weightPct('0050','2330')` 改新值
- `src/tour/levels.test.ts`：e-3 的「57%」、c-2 的「−17.2%」
- `src/ui/readout.test.ts`：衝擊列
- `src/ui/model.test.ts`：圖例第一列、`pickInfo` 的權重與 `asOf`
- `src/scene/layout/basket.test.ts`：2330 方塊數 = 最大餘數法分配結果（用新權重手算，或用 `allocateBlocks` 算出後**另以手算核對**）

`src/sim/allocate.test.ts`、`src/scene/layout/voxels.test.ts` 用的是寫死的示範權重，與資料無關，不要改。

- [ ] **Step 5：測試**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected：全部通過。

- [ ] **Step 6：Commit**

```bash
git add src/data/snapshot docs/data-sources.md src
git commit -m "data: 0050 holdings from Yuanta official data"
```

---

### Task 2：畫面靜止不重繪（frameloop demand）

**Files:**
- Create: `src/scene/useContinuousRender.ts`, `src/scene/FrameCounter.tsx`
- Modify: `src/App.tsx`, `src/scene/Scene.tsx`, `src/scene/materials.tsx`, `src/scene/CameraRig.tsx`, `src/scene/VoxelInstances.tsx`, `src/scene/CoinDrip.tsx`, `src/scene/stage/HeldBlocks.tsx`, `src/scene/stage/Excavator.tsx`, `src/scene/ViewFraming.tsx`

**Interfaces:**
- Produces:
  - `useContinuousRender(active?: boolean): void`：`active` 為 true 時，每次 `useFrame` 都呼叫 `invalidate()`
  - 開發模式 `window.__BCI_FRAMES__: number`（每渲染一幀 +1）

- [ ] **Step 1：建立 `src/scene/useContinuousRender.ts`**

```ts
import { useFrame, useThree } from '@react-three/fiber'

/** frameloop="demand" 下讓持續動畫繼續跑：active 時每幀要求下一幀 */
export function useContinuousRender(active = true) {
  const invalidate = useThree((s) => s.invalidate)
  useFrame(() => {
    if (active) invalidate()
  })
}
```

- [ ] **Step 2：建立 `src/scene/FrameCounter.tsx`**

```tsx
import { useFrame } from '@react-three/fiber'

type W = { __BCI_FRAMES__?: number }

/** 開發／測試用：統計實際渲染的幀數，用來驗證靜止時不重繪 */
export function FrameCounter() {
  useFrame(() => {
    const w = window as unknown as W
    w.__BCI_FRAMES__ = (w.__BCI_FRAMES__ ?? 0) + 1
  })
  return null
}
```

- [ ] **Step 3：各處改成按需渲染**

- `App.tsx`：`<Canvas frameloop="demand" ...>`。
- `Scene.tsx`：`{import.meta.env.DEV && <FrameCounter />}`。
- `HeldBlocks.tsx`（`HeldBlock`）、`Excavator.tsx`：呼叫 `useContinuousRender()`。
- `CoinDrip.tsx`：`useContinuousRender(active)`（依元件現有的 active／guard 判斷）。
- `CameraRig.tsx`：在兩個設定 `active.current = true` 的 effect 末尾呼叫 `invalidate()`（從 `useThree((s) => s.invalidate)` 取得）；`useFrame` 內若 `active.current` 仍為 true，於結尾呼叫 `invalidate()`。
- `VoxelInstances.tsx`（`KindMesh`）：設定 `dirty = true` 與更新顏色的 layout effect 內呼叫 `invalidate()`；`useFrame` 內若尚未到位（`Math.abs(explode − a.explode) ≥ 1e-3`）呼叫 `invalidate()`。
- `materials.tsx`（`EnvMetal`）：`useFrame` 內若 `scene.environment` 尚未存在就 `invalidate()`；指派 `envMap` 後也 `invalidate()` 一次，之後不再呼叫。
- `ViewFraming.tsx`：設定或清除 view offset 後呼叫 `invalidate()`。
- 其他有 `useFrame` 且會改畫面的元件（用 `grep -rn useFrame src`）逐一確認是否需要 `invalidate()`，在報告列出判斷。

- [ ] **Step 4：驗證靜止時不重繪**

寫 scratch Playwright 腳本（scratchpad 目錄）：
1. 開 `/?mode=sandbox`，等 3 秒，讀 `window.__BCI_FRAMES__` 得 f1；再等 2 秒讀 f2。**預期 f2 − f1 ≤ 2**。
2. 開 `/?level=1&step=3`（晃動的方塊），等 3 秒讀 f1、再 2 秒讀 f2。**預期 f2 − f1 ≥ 60**（持續動畫）。
3. 開 `/?mode=sandbox`，用滑鼠拖曳畫面 1 秒，確認幀數在拖曳期間增加。

- [ ] **Step 5：回歸截圖**

執行 `npm run walkthrough`（dev server 在 5174），抽看 L0-S0、L1-S3、L1-S5、L2-S1、L3-S2、L3-S5、L4-S2、L5-S2，確認畫面與 Plan 3 一致（金屬材質不發黑、標籤都在、拆開動畫到位）。

- [ ] **Step 6：測試並 Commit**

Run: `npx tsc --noEmit && npm test && npm run build`

```bash
git add src
git commit -m "perf(scene): render on demand; continuous render only while animating"
```

---

### Task 3：畫質放進 store，依幀率自動降級

**Files:**
- Create: `src/store/quality.ts`, `src/ui/QualityNotice.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`, `src/ui/strings.ts`, `src/ui/ui.css`
- Test: `src/store/quality.test.ts`

**Interfaces:**
- Produces:
  - `useQuality`：state `quality: Quality`、`degraded: boolean`；actions `setQuality(q)`、`degrade()`（high → low 並設 `degraded = true`；已是 low 則不變）、`dismissNotice()`（`degraded = false`）
  - `T.qualityNotice`、`T.dismiss`

- [ ] **Step 1：撰寫失敗的測試 `src/store/quality.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useQuality } from './quality'

beforeEach(() => useQuality.setState(useQuality.getInitialState()))

describe('useQuality', () => {
  it('degrades from high to low once and raises the notice', () => {
    useQuality.getState().setQuality('high')
    useQuality.getState().degrade()
    expect(useQuality.getState()).toMatchObject({ quality: 'low', degraded: true })
  })

  it('does nothing when already low', () => {
    useQuality.getState().setQuality('low')
    useQuality.getState().degrade()
    expect(useQuality.getState()).toMatchObject({ quality: 'low', degraded: false })
  })

  it('dismisses the notice', () => {
    useQuality.getState().setQuality('high')
    useQuality.getState().degrade()
    useQuality.getState().dismissNotice()
    expect(useQuality.getState().degraded).toBe(false)
  })
})
```

- [ ] **Step 2：確認失敗後實作 `src/store/quality.ts`**

```ts
import { create } from 'zustand'
import type { Quality } from '../scene/quality'

type QualityState = {
  quality: Quality
  /** 剛因幀率過低降級，顯示提示 */
  degraded: boolean
  setQuality: (q: Quality) => void
  degrade: () => void
  dismissNotice: () => void
}

export const useQuality = create<QualityState>()((set, get) => ({
  quality: 'high',
  degraded: false,
  setQuality: (q) => set({ quality: q }),
  degrade: () => {
    if (get().quality === 'low') return
    set({ quality: 'low', degraded: true })
  },
  dismissNotice: () => set({ degraded: false }),
}))
```

- [ ] **Step 3：strings 與提示元件**

`T` 加入：
```ts
  qualityNotice: '畫面有點卡，已自動切換成省電畫質。',
  dismiss: '知道了',
```
`src/ui/QualityNotice.tsx`：
```tsx
import { useQuality } from '../store/quality'
import { T } from './strings'

export function QualityNotice() {
  const degraded = useQuality((s) => s.degraded)
  const dismiss = useQuality((s) => s.dismissNotice)
  if (!degraded) return null
  return (
    <div className="notice" role="status">
      {T.qualityNotice}
      <button className="link" onClick={dismiss}>
        {T.dismiss}
      </button>
    </div>
  )
}
```
`ui.css`：
```css
.notice {
  position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
  display: flex; gap: 10px; align-items: center; padding: 8px 14px; border-radius: 12px;
  background: var(--surface); border: 1px solid var(--border); font-size: 13px; z-index: 5;
}
@media (max-width: 720px) { .notice { bottom: auto; top: 56px; } }
```

- [ ] **Step 4：接上 App 與 main**

- `main.tsx`：`useQuality.getState().setQuality(detectQuality(readEnv()))`（在 render 之前）。
- `App.tsx`：`const quality = useQuality((s) => s.quality)` 取代 `useMemo`；Canvas 內加 `<PerformanceMonitor onDecline={() => useQuality.getState().degrade()} />`（從 `@react-three/drei` import）；`dpr={cfg.dpr}` 隨畫質變；加入 `<QualityNotice />`。
- 確認 `Scene`／`BasketView` 的 key 含 quality（已有），降級時會重建籃子。

- [ ] **Step 5：驗證**

`npx tsc --noEmit && npm test && npm run build`。scratch Playwright：開 `/?mode=sandbox`，在 console 執行 `useQuality` 降級不易從外部觸發，改用開發模式暴露的 `window.__BCI_DEGRADE__ = () => useQuality.getState().degrade()`（只在 `import.meta.env.DEV` 設定），呼叫後截圖 `p4t3-degraded.png`：看到提示框，籃子改成 7×7×7。Read 並描述。

- [ ] **Step 6：Commit**

```bash
git add src
git commit -m "feat: quality in store with FPS-based degrade and notice"
```

---

### Task 4：WebGL 不支援時的文字版課程

**Files:**
- Create: `src/ui/webgl.ts`, `src/ui/fallback.ts`, `src/ui/FallbackApp.tsx`
- Modify: `src/main.tsx`, `src/ui/strings.ts`, `src/ui/ui.css`
- Test: `src/ui/webgl.test.ts`, `src/ui/fallback.test.ts`

**Interfaces:**
- Consumes: `LEVELS`、`textOf`、`makeTextContext`、`stageReadout`、`DEFAULT_VALUES`、`sandboxPatchFor`
- Produces:
  - `hasWebGL(createCanvas: () => { getContext: (id: string) => unknown }): boolean`
  - `type FallbackStep = { id: string; text: string; rows: ReadoutRow[] }`；`type FallbackLevel = { label: string; title: string; steps: FallbackStep[] }`
  - `fallbackLevels(levels, u): FallbackLevel[]`
  - `FallbackApp()`；網址 `?fallback=1` 可強制顯示

- [ ] **Step 1：撰寫失敗的測試**

`src/ui/webgl.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { hasWebGL } from './webgl'

const canvas = (ok: string[]) => () => ({ getContext: (id: string) => (ok.includes(id) ? {} : null) })

describe('hasWebGL', () => {
  it('accepts webgl2 or webgl', () => {
    expect(hasWebGL(canvas(['webgl2']))).toBe(true)
    expect(hasWebGL(canvas(['webgl']))).toBe(true)
  })

  it('rejects when neither context exists or creation throws', () => {
    expect(hasWebGL(canvas([]))).toBe(false)
    expect(
      hasWebGL(() => {
        throw new Error('no canvas')
      }),
    ).toBe(false)
  })
})
```

`src/ui/fallback.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { fallbackLevels } from './fallback'

describe('fallbackLevels', () => {
  const out = fallbackLevels(LEVELS, universe)

  it('has every level and step with rendered text', () => {
    expect(out).toHaveLength(LEVELS.length)
    out.forEach((l, i) => {
      expect(l.steps).toHaveLength(LEVELS[i]!.steps.length)
      for (const s of l.steps) expect(s.text.length).toBeGreaterThan(10)
    })
    expect(out[0]!.label).toBe('序章')
  })

  it('includes the live numbers each step would show', () => {
    const shock = out.flatMap((l) => l.steps).find((s) => s.id === 'c-2')!
    expect(shock.rows).toHaveLength(3)
    const exdiv = out.flatMap((l) => l.steps).find((s) => s.id === 's-6')!
    expect(exdiv.rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
  })
})
```

- [ ] **Step 2：確認失敗後實作**

`src/ui/webgl.ts`：
```ts
/** 能否建立 WebGL（2 或 1）；建立失敗或拋錯都視為不支援 */
export function hasWebGL(createCanvas: () => { getContext: (id: string) => unknown }): boolean {
  try {
    const c = createCanvas()
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}
```

`src/ui/fallback.ts`：
```ts
import type { Universe } from '../data/universe'
import { makeTextContext } from '../tour/context'
import { DEFAULT_VALUES, sandboxPatchFor, textOf } from '../tour/engine'
import type { Level } from '../tour/types'
import { stageReadout, type ReadoutRow } from './readout'
import { T } from './strings'

export type FallbackStep = { id: string; text: string; rows: ReadoutRow[] }
export type FallbackLevel = { label: string; title: string; steps: FallbackStep[] }

/** 文字版課程：每一步的課文與該步驟預設狀態下的即時數字 */
export function fallbackLevels(levels: readonly Level[], u: Universe): FallbackLevel[] {
  const ctx = makeTextContext(u)
  return levels.map((level, i) => ({
    label: T.levelLabel(i),
    title: level.title,
    steps: level.steps.map((step) => {
      const patch = sandboxPatchFor(step.scene)
      const values = { ...DEFAULT_VALUES, ...step.scene.values, slice: patch.slice ?? 0, explode: patch.explode ?? 0 }
      const productId = step.scene.product ?? null
      return {
        id: step.id,
        text: textOf(step, ctx),
        rows: stageReadout(step.scene.stage ?? { kind: 'none' }, values, u, productId),
      }
    }),
  }))
}
```

`T` 加入：
```ts
  fallbackIntro: '你的瀏覽器無法顯示 3D 畫面，以下是文字版課程。',
```

`src/ui/FallbackApp.tsx`：
```tsx
import { useMemo } from 'react'
import { universe } from '../data'
import { LEVELS } from '../tour/levels'
import { Disclaimer } from './Disclaimer'
import { fallbackLevels } from './fallback'
import { T } from './strings'
import './ui.css'

export function FallbackApp() {
  const levels = useMemo(() => fallbackLevels(LEVELS, universe), [])
  return (
    <main className="fallback">
      <Disclaimer />
      <h1>{T.appTitle}</h1>
      <p className="hint">{T.fallbackIntro}</p>
      {levels.map((l) => (
        <section key={l.title} className="fallback__level">
          <h2>
            {l.label}・{l.title}
          </h2>
          <ol>
            {l.steps.map((s) => (
              <li key={s.id}>
                <p>{s.text}</p>
                {s.rows.length > 0 && (
                  <table className="readout">
                    <tbody>
                      {s.rows.map((r, i) => (
                        <tr key={`${r.label}-${i}`}>
                          <th scope="row">
                            {r.label}
                            {r.unverified && <span className="badge">{T.unverified}</span>}
                            {r.note && <small className="readout__note">{r.note}</small>}
                          </th>
                          <td>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  )
}
```

`ui.css`：
```css
.fallback { max-width: 720px; margin: 0 auto; padding: 72px 16px 40px; color: var(--text); background: var(--bg); line-height: 1.75; }
.fallback h2 { font-size: 18px; margin: 28px 0 8px; }
.fallback ol { padding-left: 20px; }
.fallback li { margin-bottom: 14px; }
```

- [ ] **Step 3：`main.tsx` 決定要不要 3D**

```ts
import { hasWebGL } from './ui/webgl'
import { FallbackApp } from './ui/FallbackApp'

const forceFallback = new URLSearchParams(window.location.search).get('fallback') === '1'
const webgl = !forceFallback && hasWebGL(() => document.createElement('canvas'))
```
render 時 `webgl ? <App /> : <FallbackApp />`（導覽與沙盒的初始化只在 `webgl` 時執行）。

- [ ] **Step 4：測試、截圖、Commit**

`npx tsc --noEmit && npm test && npm run build`。截圖 `/?fallback=1` 桌機與手機（`p4t4-fallback.png`、`p4t4-fallback-mobile.png`，等待 1000ms），Read：看得到序章到最後一關的文字與數字表、免責聲明、無橫向捲動。

```bash
git add src
git commit -m "feat: text-only course when WebGL is unavailable"
```

---

### Task 5：地底的純函式（產業分組、地層、岩芯）

**Files:**
- Create: `src/scene/layout/underground.ts`
- Modify: `src/tour/types.ts`, `src/tour/context.ts`, `src/ui/strings.ts`
- Test: `src/scene/layout/underground.test.ts`, `src/tour/context.test.ts`

**Interfaces:**
- Consumes: `flatten`（sim）、`Universe`
- Produces:
  - `SECTORS = ['semiconductor', 'electronics', 'software', 'internet', 'auto', 'finance'] as const`；`type Sector = (typeof SECTORS)[number] | 'unclassified'`
  - `LAYER_THICKNESS = 2.5`；`GROUND_TOP = -0.6`
  - `strataLayout(): { sector: Sector; top: number; bottom: number }[]`（依 `SECTORS` 由上往下）
  - `goldVein(): { top: number; bottom: number }`（最下層之下，厚 1，間隔 0.4）
  - `sectorBreakdown(u, productId): { sector: Sector; weightPct: number }[]`（依 `SECTORS` 順序，`unclassified` 最後，去掉 0）
  - `coreSegments(rows, height): { sector: Sector; top: number; bottom: number }[]`（相對座標，0 往下為負，依比例分段，總長 = height）
  - `TextContext.sectorPct(productId, sector): number`
  - `T.sectors: Record<Sector, string>`

規則：持股攤平後，`type === 'stock'` 且 `sector` 在 `SECTORS` 內 → 該產業；其他（彙總桶、債券、現金、未知產業）→ `unclassified`。

- [ ] **Step 1：撰寫失敗的測試 `src/scene/layout/underground.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { parseUniverse } from '../../data/universe'
import { SECTORS, LAYER_THICKNESS, GROUND_TOP, strataLayout, goldVein, sectorBreakdown, coreSegments } from './underground'

describe('strataLayout', () => {
  it('stacks one layer per sector from the ground down', () => {
    const s = strataLayout()
    expect(s.map((l) => l.sector)).toEqual([...SECTORS])
    expect(s[0]!.top).toBe(GROUND_TOP)
    expect(s[0]!.bottom).toBeCloseTo(GROUND_TOP - LAYER_THICKNESS)
    expect(s[5]!.bottom).toBeCloseTo(GROUND_TOP - 6 * LAYER_THICKNESS) // -15.6
  })

  it('puts the gold vein below the last layer', () => {
    const g = goldVein()
    expect(g.top).toBeCloseTo(GROUND_TOP - 6 * LAYER_THICKNESS - 0.4) // -16.0
    expect(g.bottom).toBeCloseTo(g.top - 1)
  })
})

describe('sectorBreakdown', () => {
  it('groups QQQ named holdings by sector and leaves the rest unclassified', () => {
    // NVDA 8.33 + MU 5.02 = 13.35 半導體；AAPL 7.35 電子；MSFT 5.76 軟體；TSLA 2.82 汽車；其他 70.72
    expect(sectorBreakdown(universe, 'QQQ')).toEqual([
      { sector: 'semiconductor', weightPct: expect.closeTo(13.35, 6) },
      { sector: 'electronics', weightPct: expect.closeTo(7.35, 6) },
      { sector: 'software', weightPct: expect.closeTo(5.76, 6) },
      { sector: 'auto', weightPct: expect.closeTo(2.82, 6) },
      { sector: 'unclassified', weightPct: expect.closeTo(70.72, 6) },
    ])
  })

  it('treats bonds, cash and unknown sectors as unclassified', () => {
    const u = parseUniverse([
      { id: 'A', name: 'A', type: 'stock', sector: 'semiconductor', asOf: '2026-10-03', source: [] },
      { id: 'B', name: 'B', type: 'stock', sector: 'mystery', asOf: '2026-10-03', source: [] },
      { id: 'G', name: 'G', type: 'govBond', asOf: '2026-10-03', source: [] },
      { id: 'F', name: 'F', type: 'fund', holdings: [{ id: 'A', weightPct: 50 }, { id: 'B', weightPct: 20 }, { id: 'G', weightPct: 30 }], asOf: '2026-10-03', source: ['x'] },
    ])
    expect(sectorBreakdown(u, 'F')).toEqual([
      { sector: 'semiconductor', weightPct: expect.closeTo(50, 6) },
      { sector: 'unclassified', weightPct: expect.closeTo(50, 6) },
    ])
  })
})

describe('coreSegments', () => {
  it('splits the core height by weight from the top down', () => {
    expect(coreSegments([{ sector: 'semiconductor', weightPct: 60 }, { sector: 'unclassified', weightPct: 40 }], 10)).toEqual([
      { sector: 'semiconductor', top: 0, bottom: -6 },
      { sector: 'unclassified', top: -6, bottom: -10 },
    ])
  })

  it('normalises when weights do not sum to 100', () => {
    const seg = coreSegments([{ sector: 'auto', weightPct: 1 }, { sector: 'finance', weightPct: 3 }], 8)
    expect(seg[0]!.bottom).toBeCloseTo(-2)
    expect(seg[1]!.bottom).toBeCloseTo(-8)
  })
})
```

在 `src/tour/context.test.ts` 加入：
```ts
  it('reports sector weights for a product', () => {
    expect(c.sectorPct('QQQ', 'semiconductor')).toBeCloseTo(13.35, 6)
    expect(c.sectorPct('QQQ', 'finance')).toBe(0)
  })
```

- [ ] **Step 2：確認失敗後實作 `src/scene/layout/underground.ts`**

```ts
import type { Universe } from '../../data/universe'
import { flatten } from '../../sim/holdings'

export const SECTORS = ['semiconductor', 'electronics', 'software', 'internet', 'auto', 'finance'] as const
export type Sector = (typeof SECTORS)[number] | 'unclassified'

export const LAYER_THICKNESS = 2.5
export const GROUND_TOP = -0.6
const VEIN_GAP = 0.4
const VEIN_THICKNESS = 1

const isSector = (s: string | undefined): s is (typeof SECTORS)[number] => (SECTORS as readonly string[]).includes(s ?? '')

export function strataLayout(): { sector: Sector; top: number; bottom: number }[] {
  return SECTORS.map((sector, i) => ({
    sector,
    top: GROUND_TOP - i * LAYER_THICKNESS,
    bottom: GROUND_TOP - (i + 1) * LAYER_THICKNESS,
  }))
}

export function goldVein(): { top: number; bottom: number } {
  const top = GROUND_TOP - SECTORS.length * LAYER_THICKNESS - VEIN_GAP
  return { top, bottom: top - VEIN_THICKNESS }
}

/** 商品攤平後依產業加總；彙總桶、債券、現金、未知產業 → 未細分 */
export function sectorBreakdown(u: Universe, productId: string): { sector: Sector; weightPct: number }[] {
  const sums = new Map<Sector, number>()
  for (const [id, f] of flatten(u, productId)) {
    const a = u.get(id)
    const sector: Sector = a?.type === 'stock' && isSector(a.sector) ? a.sector : 'unclassified'
    sums.set(sector, (sums.get(sector) ?? 0) + f * 100)
  }
  const order: Sector[] = [...SECTORS, 'unclassified']
  return order.filter((s) => (sums.get(s) ?? 0) > 0).map((s) => ({ sector: s, weightPct: sums.get(s)! }))
}

/** 岩芯分段：依權重比例由上往下切，總長 height（相對座標，往下為負） */
export function coreSegments(rows: { sector: Sector; weightPct: number }[], height: number): { sector: Sector; top: number; bottom: number }[] {
  const total = rows.reduce((s, r) => s + r.weightPct, 0)
  let y = 0
  return rows.map((r) => {
    const len = total > 0 ? (r.weightPct / total) * height : 0
    const seg = { sector: r.sector, top: y, bottom: y - len }
    y -= len
    return seg
  })
}
```

（若 `toEqual` 因浮點（例如 `-0`）失敗，測試改用 `toBeCloseTo` 逐欄比較，並說明。）

- [ ] **Step 3：`TextContext` 加 `sectorPct`**

`src/tour/types.ts` 的 `TextContext` 加入：
```ts
  sectorPct: (productId: string, sector: Sector) => number
```
（`import type { Sector } from '../scene/layout/underground'`。）
`src/tour/context.ts` 的 `makeTextContext` 加入：
```ts
    sectorPct: (productId, sector) => sectorBreakdown(u, productId).find((r) => r.sector === sector)?.weightPct ?? 0,
```
其他建立 `TextContext` 的地方（例如 `engine.test.ts` 的假 ctx）補上 `sectorPct: () => 0`。

- [ ] **Step 4：strings**

```ts
  sectors: {
    semiconductor: '半導體',
    electronics: '電子',
    software: '軟體',
    internet: '網路',
    auto: '汽車',
    finance: '金融',
    unclassified: '未細分',
  },
```

- [ ] **Step 5：測試並 Commit**

Run: `npx vitest run src/scene/layout/underground.test.ts src/tour && npx tsc --noEmit && npm test`

```bash
git add src
git commit -m "feat(scene): sector breakdown, strata and core layout for the underground level"
```

---

### Task 6：第 6 關「鑽進地底」

**Files:**
- Create: `src/scene/stage/UndergroundStage.tsx`
- Modify: `src/tour/types.ts`, `src/tour/levels.ts`, `src/tour/levels.test.ts`, `src/scene/camera.ts`, `src/scene/camera.test.ts`, `src/scene/stage/StageView.tsx`, `src/ui/readout.ts`, `src/ui/readout.test.ts`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: Task 5 全部、`SECTOR_COLORS`、`BlockMaterial`、`CoinPile`、`labelStyle`、`useAfterFirstTick`
- Produces:
  - `Stage` 新增 `{ kind: 'underground'; show: 'strata' | 'cores' | 'dig' | 'veins' | 'gold'; cores?: [string, string] }`
  - `CameraPresetId` 新增 `'underground'`：`position: [0, -8, 64]`、`target: [0, -8, 24]`
  - `LEVELS` 新增 id `'underground'`（標題「鑽進地底：ETF 的種類」），放在 `scenario` 之後；`c-4` 改成過場文字，最後一步移到地底關
  - readout：`underground` 的 `cores` 顯示兩個商品的產業比例；其他 show 為空

地底舞台的幾何（世界座標）：
- 地層：寬 44、深 30、中心 z = 24；每層 `top..bottom` 來自 `strataLayout()`；顏色 `SECTOR_COLORS[sector]`，霧面、略降飽和（`opacity` 1，顏色可用 `Color.lerp` 向 `#5d4037` 混 0.25 營造土層感，在元件內處理）。
- 每層左側 Html 標籤：`T.sectors[sector]`，位置 `[-24, (top + bottom) / 2, 39.5]`。
- 黃金礦脈：`goldVein()` 的高度，寬 30、深 4、中心 `[4, ·, 36]`，`BlockMaterial kind="gold"`，標籤「黃金礦脈」。
- 岩芯（`cores`）：兩根圓柱，x = −9 與 +9、z = 41（在地層前面），總長 = `6 × LAYER_THICKNESS`，頂端在 `GROUND_TOP`；分段來自 `coreSegments(sectorBreakdown(u, id), 15)`，顏色 `SECTOR_COLORS`，未細分用 `#cfd8dc`；頂端上方標籤：商品名稱。
- 水平挖（`dig`）：半導體層內一條發光通道（`meshBasicMaterial`，`#ffd54f`，透明 0.45），寬 40、高 1.2、深 2、中心 `[0, 該層中線, 40]`；標籤「產業型 ETF（示意）」。
- 礦脈（`veins`）：在半導體、金融、電子三層的前緣各放一排 `CoinPile`（5～8 枚）表示「會冒金幣的礦脈」，標籤「高股息型 ETF（示意）」。
- `gold`：黃金礦脈加強顯示（其他地層變淡：`opacity 0.35`）。

- [ ] **Step 1：型別、鏡頭、strings**

`types.ts` 的 `Stage` 加入 underground 分支；`CameraPresetId` 加 `'underground'`。`camera.ts` 加入預設值；`camera.test.ts` 的預設清單加入 `'underground'`。

strings 加入：
```ts
  underground: {
    goldVein: '黃金礦脈',
    dig: '產業型 ETF（示意）',
    veins: '高股息型 ETF（示意）',
  },
```

- [ ] **Step 2：課程內容（`levels.ts`）**

`c-4` 改為：
```ts
      {
        id: 'c-4',
        text: '接下來，我們鑽到城市底下，看看 ETF 還分成哪些種類。',
        scene: { camera: 'overview', product: null },
      },
```
在 `scenario` 之後新增：
```ts
  {
    id: 'underground',
    title: '鑽進地底：ETF 的種類',
    steps: [
      {
        id: 'u-1',
        text: '鏡頭往下鑽：城市底下的土層，就是「產業分類」。每一層是一種產業：半導體、電子、軟體、網路、汽車、金融。',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'strata' }, cityLabels: false },
      },
      {
        id: 'u-2',
        text: (c) =>
          `市值型 ETF 像一根垂直鑽下去的岩芯。左邊是 0050：依目前快照，約 ${pct0(c.sectorPct('0050', 'semiconductor'))}% 在半導體層。右邊是 QQQ：前幾大持股分屬半導體、電子、軟體、汽車等好幾種產業。灰色是快照裡沒有細分的部分。`,
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'cores', cores: ['0050', 'QQQ'] }, cityLabels: false },
      },
      {
        id: 'u-3',
        text: '產業型或主題型 ETF 則是沿著同一層水平挖，例如只挖半導體層。挖得越集中，那一層的好壞對它影響越大。（示意，不代表任何真實商品）',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'dig' }, cityLabels: false },
      },
      {
        id: 'u-4',
        text: '高股息型 ETF 專挑會冒金幣（配息比較多）的礦脈。但別忘了第 1 關：配息不是白送的，要看「方塊＋金幣」的總報酬。（示意）',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'veins' }, cityLabels: false },
      },
      {
        id: 'u-5',
        text: '最底下這條是黃金礦脈。黃金不是公司，不會配股利，也沒有利息；它的價格取決於市場願意用多少錢買它。（示意）',
        scene: { camera: 'underground', product: null, stage: { kind: 'underground', show: 'gold' }, cityLabels: false },
      },
      {
        id: 'u-6',
        text: '恭喜完成全部課程！沙盒模式已經解鎖：所有商品都能自由切開、拆開、比較。',
        scene: { camera: 'overview', product: '0050' },
      },
    ],
  },
```

`levels.test.ts`：關卡 id 清單加入 `'underground'`；示意檢查把 `underground` 的 `dig`／`veins`／`gold` 納入（`strata`、`cores` 是真實資料，不需要示意）；`assetsIn` 對 underground 回傳 `cores ?? []`；新增測試：u-2 文字包含由 `sectorPct('0050','semiconductor')` 算出的整數百分比。

- [ ] **Step 3：readout（純函式）**

`stageReadout` 加入：
```ts
    case 'underground': {
      if (stage.show !== 'cores' || !stage.cores) return []
      return stage.cores.flatMap((id) =>
        sectorBreakdown(u, id).map((r) => ({
          label: `${u.get(id)!.name}・${T.sectors[r.sector]}`,
          value: `${r.weightPct.toFixed(1)}%`,
        })),
      )
    }
```
`readout.test.ts` 加測：`{ kind: 'underground', show: 'cores', cores: ['QQQ', 'SPY'] }` 的第一列是 `Invesco QQQ・半導體`、`13.4%`；`show: 'strata'` 回傳 `[]`。

- [ ] **Step 4：建立 `src/scene/stage/UndergroundStage.tsx`**

依上面的幾何實作，元件結構：
```tsx
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { Color } from 'three'
import { universe } from '../../data'
import { T } from '../../ui/strings'
import { CoinPile } from '../CoinPile'
import { labelStyle } from '../labelStyle'
import { BlockMaterial } from '../materials'
import { SECTOR_COLORS } from '../palette'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { coreSegments, goldVein, GROUND_TOP, LAYER_THICKNESS, sectorBreakdown, SECTORS, strataLayout, type Sector } from '../layout/underground'

type Show = 'strata' | 'cores' | 'dig' | 'veins' | 'gold'
const CENTER_Z = 24
const WIDTH = 44
const DEPTH = 30
const FRONT_Z = CENTER_Z + DEPTH / 2
const SOIL = new Color('#5d4037')
const UNCLASSIFIED = '#cfd8dc'
const CORE_HEIGHT = SECTORS.length * LAYER_THICKNESS
const colorOf = (s: Sector) => (s === 'unclassified' ? UNCLASSIFIED : SECTOR_COLORS[s] ?? UNCLASSIFIED)

export function UndergroundStage({ show, cores, quality }: { show: Show; cores?: [string, string]; quality: Quality }) {
  const ready = useAfterFirstTick()
  const layers = useMemo(() => strataLayout().map((l) => ({ ...l, color: `#${new Color(colorOf(l.sector)).lerp(SOIL, 0.25).getHexString()}` })), [])
  const vein = goldVein()
  const faded = show === 'gold'
  const coreData = useMemo(
    () => (cores ?? []).map((id, i) => ({ id, x: i === 0 ? -9 : 9, segs: coreSegments(sectorBreakdown(universe, id), CORE_HEIGHT) })),
    [cores],
  )
  // …地層（每層一個 box，faded 時 transparent opacity 0.35）、左側標籤、黃金礦脈、
  //   show === 'cores' 時畫岩芯（每段一個 cylinder，半徑 1.3，位置 [x, GROUND_TOP + (top+bottom)/2, FRONT_Z + 2]），
  //   show === 'dig' 時畫半導體層的發光通道，show === 'veins' 時在三層前緣放 CoinPile，
  //   標籤一律 ready 後才掛載。
}
```
（把註解中的部分寫成完整 JSX；每段圓柱 `cylinderGeometry args={[1.3, 1.3, top - bottom, 24]}`。地層與礦脈 mesh 不需要 InstancedMesh（數量少）。）

`StageView.tsx` 加入：
```tsx
      {stage.kind === 'underground' && <UndergroundStage show={stage.show} cores={stage.cores} quality={quality} />}
```

- [ ] **Step 5：測試、截圖**

`npx tsc --noEmit && npm test && npm run build`。截圖 `/?level=6&step=0` 到 `step=5`（等待 3500ms，或 Task 8 之後改用就緒訊號），Read 每張：
- u-1：六層彩色地層，左側有產業名稱，上方看得到城市
- u-2：兩根岩芯，0050 大部分是半導體色，QQQ 分段較多、灰色（未細分）較長；面板數字表列出兩檔的產業比例
- u-3：半導體層有一條發光通道與「示意」標籤
- u-4：三層前緣有金幣，標「示意」
- u-5：黃金礦脈突顯、其他地層變淡
- u-6：回到總覽，按鈕是「進入沙盒」

不符就修正後重拍；鏡頭看不清楚可微調 `underground` 預設值並說明。

- [ ] **Step 6：Commit**

```bash
git add src
git commit -m "feat(tour): level 6 underground — strata, cores, sector dig, dividend veins, gold"
```

---

### Task 7：續看進度

**Files:**
- Modify: `src/tour/types.ts`, `src/tour/engine.ts`, `src/tour/engine.test.ts`, `src/store/tour.ts`, `src/store/tour.test.ts`, `src/main.tsx`

**Interfaces:**
- Produces: `Progress` 新增 `pos?: Position`；`parseProgress` 驗證 `pos`（兩個非負整數，否則略過）；`enterStep` 在導覽模式保存目前位置；`main.tsx` 在沒有網址位置、且尚未解鎖沙盒時，從 `progress.pos` 續看（位置無效就從頭）

- [ ] **Step 1：撰寫失敗的測試**

`engine.test.ts`：
```ts
  it('round-trips a saved position and drops invalid ones', () => {
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"pos":{"level":2,"step":1}}').pos).toEqual({ level: 2, step: 1 })
    expect(parseProgress('{"completed":[],"sandboxUnlocked":false,"pos":{"level":-1,"step":"x"}}').pos).toBeUndefined()
  })
```
`tour.test.ts`：
```ts
  it('remembers the current position', () => {
    useTour.getState().enterStep({ level: 1, step: 2 })
    expect(useTour.getState().progress.pos).toEqual({ level: 1, step: 2 })
  })
```

- [ ] **Step 2：實作**

- `types.ts`：`Progress = { completed: string[]; sandboxUnlocked: boolean; pos?: Position }`。
- `engine.ts` `parseProgress`：讀 `rec.pos`，若是物件且 `level`、`step` 皆為非負整數則保留。
- `store/tour.ts` `enterStep`：`const progress = { ...get().progress, pos }`，`saveProgress(progress)`，`set({ ..., progress })`。
- `main.tsx`：`enterStep(tq.pos ?? (progress.pos && isValidPosition(LEVELS, progress.pos) ? progress.pos : { level: 0, step: 0 }))`。

- [ ] **Step 3：測試並 Commit**

`npx tsc --noEmit && npm test`

```bash
git add src
git commit -m "feat(tour): resume from the last step"
```

---

### Task 8：端到端測試與就緒訊號

**Files:**
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/tour.spec.ts`, `e2e/sandbox.spec.ts`, `e2e/fallback.spec.ts`
- Modify: `package.json`, `src/scene/CameraRig.tsx`, `scripts/walkthrough.mjs`, `vite.config.ts`（確認 vitest 不會收到 `e2e/`）

**Interfaces:**
- Produces:
  - `document.body.dataset.cameraSettled`：鏡頭到位為 `'true'`，移動中為 `'false'`（CameraRig 設定）
  - `npm run e2e`

- [ ] **Step 1：安裝與設定**

```bash
npm install -D @playwright/test
```
`playwright.config.ts`：
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:5175',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: { command: 'npx vite --port 5175 --strictPort', url: 'http://localhost:5175', reuseExistingServer: false, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
})
```
`package.json` scripts：`"e2e": "playwright test"`。`vite.config.ts` 的 vitest `include` 維持 `src/**`（確認 `e2e/` 不被收錄）。

- [ ] **Step 2：鏡頭就緒訊號**

`CameraRig.tsx`：開始移動時 `document.body.dataset.cameraSettled = 'false'`，到位（`a.done && b.done`）或使用者接手時設為 `'true'`；初始 mount 也設 `'false'` 直到第一次到位。

- [ ] **Step 3：`e2e/helpers.ts`**

```ts
import { expect, type Page } from '@playwright/test'

/** 等鏡頭到位 */
export async function settled(page: Page) {
  await expect(page.locator('body')).toHaveAttribute('data-camera-settled', 'true', { timeout: 15_000 })
}

/** 設定 range input（React 監聽 input 事件，需用原生 setter） */
export async function setRange(page: Page, label: string, value: number) {
  const input = page.getByLabel(label, { exact: false }).first()
  await input.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}
```

- [ ] **Step 4：`e2e/tour.spec.ts`——實際點完整個導覽**

```ts
import { test, expect } from '@playwright/test'
import { setRange, settled } from './helpers'

// 需要先操作才能前進的步驟：按課程設定的控制項與門檻
const GATES: Record<string, { label: string; value: number }> = {
  's-5': { label: '時間軸', value: 0.6 },
  'f-2': { label: '拆開', value: 0.7 },
  'f-6': { label: '持有年數', value: 3 },
  'f-8': { label: '經過年數', value: 8 },
  'f-9': { label: '經過年數', value: 5 },
  'e-2': { label: '雷射刀切割', value: 0.5 },
}

test('walks the whole tour by clicking 下一步 and unlocks the sandbox', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  const next = page.getByRole('button', { name: /下一步|進入沙盒/ })
  const ids = await page.evaluate(() => (window as unknown as { __BCI_STEP_IDS__: string[] }).__BCI_STEP_IDS__)
  for (const id of ids) {
    await settled(page)
    const gate = GATES[id]
    if (gate) {
      await expect(next).toBeDisabled()
      await setRange(page, gate.label, gate.value)
    }
    await expect(next).toBeEnabled()
    await next.click()
  }
  await expect(page.getByRole('button', { name: '重看導覽' })).toBeVisible()
})

test('resumes from the last step after reload', async ({ page }) => {
  await page.goto('/?level=2&step=1')
  await settled(page)
  await page.goto('/')
  await expect(page.getByText('第 2 關', { exact: false })).toBeVisible()
})
```
在 `main.tsx` 的開發區塊加入 `__BCI_STEP_IDS__ = LEVELS.flatMap((l) => l.steps.map((s) => s.id))`。若控制項的可及名稱與表中 label 不同，以實際的 aria-label／label 文字為準更新表格，並在報告說明。

- [ ] **Step 5：`e2e/sandbox.spec.ts` 與 `e2e/fallback.spec.ts`**

```ts
// sandbox.spec.ts
import { test, expect } from '@playwright/test'

test('sandbox stays idle when nothing moves', async ({ page }) => {
  await page.goto('/?mode=sandbox')
  await page.waitForTimeout(3000)
  const f1 = await page.evaluate(() => (window as unknown as { __BCI_FRAMES__: number }).__BCI_FRAMES__)
  await page.waitForTimeout(2000)
  const f2 = await page.evaluate(() => (window as unknown as { __BCI_FRAMES__: number }).__BCI_FRAMES__)
  expect(f2 - f1).toBeLessThanOrEqual(2)
})

test('switching products updates the legend', async ({ page }) => {
  await page.goto('/?mode=sandbox')
  await page.getByRole('button', { name: 'Invesco QQQ' }).click()
  await expect(page.getByText('輝達')).toBeVisible()
})
```
```ts
// fallback.spec.ts
import { test, expect } from '@playwright/test'

test('text-only course renders every level', async ({ page }) => {
  await page.goto('/?fallback=1')
  await expect(page.getByText('你的瀏覽器無法顯示 3D 畫面')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(7)
})
```

- [ ] **Step 6：walkthrough 改用就緒訊號**

`scripts/walkthrough.mjs`：`goto` 後改為等待 `body[data-camera-settled="true"]`（最多 15 秒，逾時才退回固定等待 3500ms），再額外等 500ms 讓動畫穩定後截圖。

- [ ] **Step 7：執行**

```bash
npx playwright install chromium
npm run e2e
```
Expected：desktop 與 mobile 兩個 project 全部通過。失敗時先判斷是測試寫錯還是程式錯，修正後重跑；不可為了通過而刪除斷言。

- [ ] **Step 8：Commit**

```bash
git add playwright.config.ts e2e package.json package-lock.json src scripts vite.config.ts
git commit -m "test(e2e): click through the whole tour; idle sandbox; text-only fallback"
```

---

### Task 9：走查第 6 關與全站回歸

**Files:**
- Modify：依截圖結果

- [ ] **Step 1：桌機與手機 walkthrough**

背景啟動 `npx vite --port 5174 --strictPort`，執行 `npm run walkthrough` 與 `npm run walkthrough -- http://localhost:5174 .superpowers/sdd/shots/walk-mobile 390 844`。Read 第 6 關每一步（L6-S0～S5）的桌機與手機截圖，並抽看 L0-S0、L1-S5、L2-S1、L3-S5、L4-S2、L5-S1、L5-S2 確認 demand 模式沒有造成畫面缺漏。依 Plan 3 Task 14 的檢查清單修正（物件在畫面內、不被面板擋、標籤不重疊、示意標示、面板數字）。

- [ ] **Step 2：全部檢查**

`npx tsc --noEmit && npm test && npm run build && npm run e2e`；只用精確 PID 關閉 dev server。

- [ ] **Step 3：Commit**

```bash
git add src scripts
git commit -m "chore: level 6 and regression walkthrough fixes"
```
