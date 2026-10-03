# 積木城市 Plan 3：關卡系統與教學視覺 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把沙盒變成有引導的課程：序章 + 第 1～5 關（股票、債券、基金、ETF、假設情境），每一步由宣告式「場景指令」驅動 3D 畫面，搭配金幣水滴、除息、三道門費用、累積對照配息、配息來自本金、即時價格、崩落情境、重疊連線等教學視覺；破關後解鎖沙盒。另含斜切、手機長按、Plan 2 帶過來的必做事項。

**Architecture:**
- `src/tour/`：純 TypeScript 的關卡型別、課程內容（`levels.ts`）、引擎（前進／後退／條件判斷／把場景指令轉成沙盒狀態）。
- `src/store/tour.ts`：zustand，持有目前關卡位置、各舞台的拉桿值、進度（localStorage）。**關卡只透過 store 下指令**：進入一步時把場景指令套進 `useSandbox`。
- `src/scene/stage/`：每種教學視覺一個元件，由 `StageView` 依目前步驟的 `stage.kind` 切換；數字一律來自 `src/sim/` 與 `src/scene/layout/stages.ts` 的純函式。
- 面板：導覽模式顯示 `TourPanel`（文字、控制項、即時數字、上一步／下一步），沙盒模式顯示原本的 `SandboxPanel`。

**Tech Stack:** 沿用 Plan 1–2；新增 devDependency `jsdom`（只給需要 DOM 的單元測試）。

**規格：** `docs/superpowers/specs/2026-10-03-block-city-invest-design.md`
**必讀：** `docs/superpowers/plans/plan3-carryover.md`（本計畫 Task 1–3 處理其中的 Plan 3 必做事項）

**路線圖：** Plan 1、2 完成；Plan 3（本檔）；Plan 4：第 6 關地底、依幀率降級、`frameloop="demand"`、WebGL 備案、端到端測試、0050 改用元大官方數據。

## Global Constraints

- 介面只用繁體中文。介面「外框文字」（按鈕、標題、單位、提示）集中在 `src/ui/strings.ts`；**課程內文**集中在 `src/tour/levels.ts`。其他檔案不可寫死中文。
- 全站固定顯示：「資料為 2026-10-03 快照，僅供教學，不構成投資建議。」
- 全站不談稅：介面文字不可出現「稅」字；證交稅只以「交易成本」呈現。
- 所有情境寫成「假設⋯⋯」，不做預測；所有示意參數（漲跌、波動、利率、配息、價格跳動、示意基金）必須在畫面上標「示意」。
- 「配息來自本金」只用示意基金演示，不套在任何真實商品上。
- 前收型手續費是**假設值**（可調，畫面標「假設」）；後收型用施羅德 U 級別的真實費率。
- 未驗證的資料顯示「待驗證」，一律用 `isVerified` 判斷。
- 課程內文中的數字（權重、衝擊幅度）必須由資料即時計算，不可寫死。
- 籃子方塊數嚴格依權重；一種材質一個 InstancedMesh。
- `src/sim/`、`src/data/`、`src/tour/`、`src/scene/layout/`、`src/scene/camera.ts`、`src/scene/palette.ts`、`src/ui/model.ts`、`src/ui/readout.ts`、`src/ui/press.ts` 必須是純 TypeScript，不 import React／R3F。
- 新增 drei `<Html>` 一律等 `useAfterFirstTick()` 為 true 才掛載。
- TypeScript strict，不可以使用 `any`。Node ≥ 22.12。

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `src/ui/useExplodeKey.ts`（改） | 空白鍵判斷抽成純函式 `spaceExplodes`；文字輸入永不攔截 |
| `src/store/sandbox.ts`（改） | `resetSandbox()`、`applyScene(patch)`；`SliceAxis` 加入 `'d'` |
| `src/scene/layout/voxels.ts`（改） | 斜切 `'d'`；`coordAlong`；`damagedVoxels` |
| `src/scene/LaserPlane.tsx`（改） | 斜切切面 |
| `src/scene/layout/basket.ts` | `basketSpec`、`basketVoxels`（籃子方塊的唯一來源） |
| `src/scene/Basket.tsx` | 純 props 的籃子元件（可多個同時出現） |
| `src/scene/BasketView.tsx`（改） | 連接 `useSandbox` 的沙盒籃子，內部用 `Basket` |
| `src/tour/types.ts` | 關卡、步驟、場景指令、舞台、條件的型別 |
| `src/tour/engine.ts` | 純函式：導航、條件、指令 → 沙盒 patch、進度、網址解析 |
| `src/tour/context.ts` | 課程文字用的資料查詢（權重、衝擊）與格式化 |
| `src/tour/levels.ts` | 課程內容 |
| `src/store/tour.ts` | 導覽 store 與進度保存 |
| `src/scene/camera.ts` | 鏡頭預設位置、向量趨近 |
| `src/scene/CameraRig.tsx` | 依步驟移動鏡頭 |
| `src/scene/layout/coins.ts` | 金幣飛行與金幣堆的位置 |
| `src/scene/CoinDrip.tsx`、`src/scene/CoinPile.tsx` | 金幣元件 |
| `src/scene/layout/stages.ts` | 舞台用純函式：方塊數、除息時間軸、累積對照配息、示意陷阱、示意價格、層中心、衝擊打掉比例 |
| `src/data/trading.ts` | 台股交易成本（含來源與查證狀態） |
| `src/sim/feeRace.ts` | 三道門比賽：前收（假設）、後收 U、0050 |
| `src/scene/stage/*.tsx` | 舞台元件與 `StageView` |
| `src/ui/readout.ts` | 每個舞台的即時數字（純函式） |
| `src/ui/TourPanel.tsx`、`src/ui/StageControls.tsx` | 導覽面板 |
| `src/ui/press.ts`、`src/scene/useLongPress.ts` | 手機長按 |
| `scripts/walkthrough.mjs` | 走過每一步並截圖 |

---

### Task 1：Plan 2 必做事項（空白鍵、沙盒重設與套用）

**Files:**
- Modify: `src/ui/useExplodeKey.ts`, `src/store/sandbox.ts`, `package.json`
- Test: `src/ui/useExplodeKey.test.ts`, `src/store/sandbox.test.ts`

**Interfaces:**
- Consumes: `useSandbox`（Plan 2）
- Produces:
  - `spaceExplodes(target: EventTarget | null, pointerModality: boolean): boolean`；`TEXT_ENTRY: string`
  - `type SandboxPatch = { productId?: string | null; sliceAxis?: SliceAxis; slice?: number; explode?: number; picked?: Picked }`
  - `useSandbox` 新增 actions：`resetSandbox(): void`、`applyScene(patch: SandboxPatch): void`（不合法的 productId 丟 RangeError；同一商品也會套用，不像 `selectProduct` 會略過）

- [ ] **Step 1：安裝 jsdom**

```bash
npm install -D jsdom
```

- [ ] **Step 2：撰寫失敗的測試 `src/ui/useExplodeKey.test.ts`**

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { spaceExplodes } from './useExplodeKey'

const el = (html: string) => {
  document.body.innerHTML = html
  return document.body.firstElementChild!
}

describe('spaceExplodes', () => {
  it('never steals Space from text entry, whatever the last input was', () => {
    expect(spaceExplodes(el('<input type="text">'), true)).toBe(false)
    expect(spaceExplodes(el('<input>'), false)).toBe(false)
    expect(spaceExplodes(el('<textarea></textarea>'), true)).toBe(false)
    expect(spaceExplodes(el('<select><option>a</option></select>'), true)).toBe(false)
    expect(spaceExplodes(el('<div contenteditable="true"><span>x</span></div>').firstElementChild, true)).toBe(false)
  })

  it('explodes on range sliders, plain elements and mouse-focused buttons', () => {
    expect(spaceExplodes(el('<input type="range">'), false)).toBe(true)
    expect(spaceExplodes(el('<div></div>'), false)).toBe(true)
    expect(spaceExplodes(el('<button>x</button>'), true)).toBe(true)
    expect(spaceExplodes(null, false)).toBe(true)
  })
})
```

- [ ] **Step 3：在 `src/store/sandbox.test.ts` 加入失敗的測試**

```ts
describe('resetSandbox and applyScene', () => {
  it('resetSandbox returns to the initial state', () => {
    const s = useSandbox.getState()
    s.selectProduct('QQQ')
    s.setSlice(0.5)
    s.resetSandbox()
    expect(useSandbox.getState()).toMatchObject({ productId: '0050', slice: 0, explode: 0, picked: null, sliceAxis: 'x' })
  })

  it('applyScene sets fields even for the same product, and clamps', () => {
    const s = useSandbox.getState()
    s.setSlice(0.7)
    s.applyScene({ productId: '0050', slice: 2, explode: 0.5, sliceAxis: 'd', picked: null })
    expect(useSandbox.getState()).toMatchObject({ productId: '0050', slice: 1, explode: 0.5, sliceAxis: 'd' })
  })

  it('applyScene accepts null (no basket) and rejects non-baskets', () => {
    useSandbox.getState().applyScene({ productId: null })
    expect(useSandbox.getState().productId).toBeNull()
    expect(() => useSandbox.getState().applyScene({ productId: '2330' })).toThrow(RangeError)
  })

  it('applyScene leaves fields it does not mention', () => {
    useSandbox.getState().setExplode(0.4)
    useSandbox.getState().applyScene({ slice: 0.2 })
    expect(useSandbox.getState().explode).toBe(0.4)
  })
})
```

`sliceAxis: 'd'` 會在 Task 2 才合法；本任務先把 `SliceAxis` 型別擴充為 `'x' | 'y' | 'z' | 'd'`（見 Step 5），其餘斜切邏輯在 Task 2。

- [ ] **Step 4：執行測試，確認失敗**

Run: `npx vitest run src/ui/useExplodeKey.test.ts src/store/sandbox.test.ts`
Expected：FAIL（`spaceExplodes`、`resetSandbox`、`applyScene` 不存在）。

- [ ] **Step 5：在 `src/scene/layout/voxels.ts` 把軸擴充為四種**

```ts
export type SliceAxis = 'x' | 'y' | 'z' | 'd'
```

（`isHidden`、`sizeAlong`、`cutPlanePosition` 在 Task 2 才處理 `'d'`；本步驟只改型別。若 `tsc` 因 `v[cut.axis]` 報錯，暫時改成 `cut.axis === 'd' ? v.x + v.z : v[cut.axis]`，Task 2 會正式整理。）

- [ ] **Step 6：改寫 `src/ui/useExplodeKey.ts`**

```ts
import { useEffect } from 'react'
import { useSandbox } from '../store/sandbox'

/** 文字輸入類元素：空白鍵一律留給輸入 */
export const TEXT_ENTRY =
  'textarea,select,[contenteditable=""],[contenteditable="true"],input:not([type=range]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=reset])'
const ACTIVATABLE = 'button,a,input[type=button],input[type=checkbox],input[type=radio],input[type=submit],input[type=reset]'

const matchesFocusVisible = (el: Element) => {
  try {
    return el.matches(':focus-visible')
  } catch {
    return false
  }
}

/**
 * 空白鍵要不要拿來「拆開」：
 * - 文字輸入：永遠不攔截。
 * - 按鈕、連結：鍵盤聚焦時保留原本作用（按下）；滑鼠點過的不保留。
 *   光靠 :focus-visible 不夠（Chromium 在 Space keydown 當下會切成鍵盤模式），所以呼叫端另外傳入「最近一次操作是否為滑鼠」。
 */
export function spaceExplodes(target: EventTarget | null, pointerModality: boolean): boolean {
  if (!(target instanceof Element)) return true
  if (target.closest(TEXT_ENTRY)) return false
  const act = target.closest(ACTIVATABLE)
  if (act && !pointerModality && matchesFocusVisible(act)) return false
  return true
}

/** 桌機：按住空白鍵拆開，放開復原 */
export function useExplodeKey() {
  const setHeld = useSandbox((s) => s.setExplodeHeld)
  useEffect(() => {
    let pointerModality = false
    const onPointer = () => {
      pointerModality = true
    }
    const onAnyKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') pointerModality = false
    }
    const onKey = (held: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !spaceExplodes(e.target, pointerModality)) return
      e.preventDefault()
      if (held && e.repeat) return
      setHeld(held)
    }
    const down = onKey(true)
    const up = onKey(false)
    const blur = () => setHeld(false)
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('keydown', onAnyKey, true)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('keydown', onAnyKey, true)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [setHeld])
}
```

- [ ] **Step 7：修改 `src/store/sandbox.ts`**

在型別區加入：
```ts
export type SandboxPatch = {
  productId?: string | null
  sliceAxis?: SliceAxis
  slice?: number
  explode?: number
  picked?: Picked
}
```
在 `SandboxState` 加入：
```ts
  resetSandbox: () => void
  /** 關卡用：直接套用場景（同一商品也套用），不合法的商品丟 RangeError */
  applyScene: (p: SandboxPatch) => void
```
把初始值抽成常數，並在 store 加入兩個 action：
```ts
const INITIAL = {
  productId: '0050' as string | null,
  sliceAxis: 'x' as SliceAxis,
  slice: 0,
  explode: 0,
  explodeHeld: false,
  picked: null as Picked,
}

const isBasketId = (id: string) => {
  const a = universe.get(id)
  return !!a && isBasket(a)
}
```
`create` 內改為 `...INITIAL,` 開頭，`selectProduct` 內的檢查改用 `isBasketId(id)`，並新增：
```ts
  resetSandbox: () => set({ ...INITIAL }),
  applyScene: (p) => {
    const out: Partial<SandboxState> = {}
    if (p.productId !== undefined) {
      if (p.productId !== null && !isBasketId(p.productId)) throw new RangeError(`not a basket: ${p.productId}`)
      out.productId = p.productId
    }
    if (p.sliceAxis !== undefined) out.sliceAxis = p.sliceAxis
    if (p.slice !== undefined) out.slice = clamp01(p.slice)
    if (p.explode !== undefined) out.explode = clamp01(p.explode)
    if (p.picked !== undefined) out.picked = p.picked
    set(out)
  },
```

- [ ] **Step 8：執行測試**

Run: `npx vitest run src/ui/useExplodeKey.test.ts src/store/sandbox.test.ts && npx tsc --noEmit && npm test`
Expected：全部 PASS。

- [ ] **Step 9：Commit**

```bash
git add package.json package-lock.json src/ui/useExplodeKey.ts src/ui/useExplodeKey.test.ts src/store/sandbox.ts src/store/sandbox.test.ts src/scene/layout/voxels.ts
git commit -m "feat: space never steals text entry; sandbox reset and applyScene"
```

---

### Task 2：斜切

**Files:**
- Modify: `src/scene/layout/voxels.ts`, `src/scene/LaserPlane.tsx`, `src/store/sandbox.ts`, `src/ui/strings.ts`, `src/ui/SandboxPanel.tsx`
- Test: `src/scene/layout/voxels.test.ts`, `src/store/sandbox.test.ts`

**Interfaces:**
- Consumes: `SliceAxis`（含 `'d'`，Task 1）
- Produces: `coordAlong(v: Voxel, axis: SliceAxis): number`；`'d'` 在 `sizeAlong`、`isHidden`、`cutPlanePosition` 的行為；`parseSandboxQuery` 接受 `axis=d`；`T.sliceAxis.d = '斜切'`

斜切定義：沿 `x + z` 方向切，座標 `x + z`，範圍 `0 ～ w + d − 2`（大小 `w + d − 1`）。切面是世界座標中 `x + z = c` 的平面，`c = threshold − (w + d − 1) / 2`。

- [ ] **Step 1：撰寫失敗的測試（加到 `voxels.test.ts`）**

```ts
describe('diagonal cut', () => {
  it('uses x + z as the coordinate', () => {
    expect(coordAlong({ id: 'a', group: 0, x: 3, y: 7, z: 4 }, 'd')).toBe(7)
    expect(coordAlong({ id: 'a', group: 0, x: 3, y: 7, z: 4 }, 'y')).toBe(7)
  })

  it('spans w + d - 1 diagonal slices', () => {
    expect(sizeAlong('d', 10, 10, 10)).toBe(19)
    expect(sizeAlong('d', 6, 6, 14)).toBe(11)
  })

  it('hides voxels whose x + z reaches the threshold', () => {
    const cut = { axis: 'd' as const, threshold: 10 }
    expect(isHidden({ id: 'a', group: 0, x: 4, y: 0, z: 5 }, cut)).toBe(false) // 9
    expect(isHidden({ id: 'a', group: 0, x: 5, y: 0, z: 5 }, cut)).toBe(true) // 10
  })

  it('puts the plane on the boundary x + z = threshold - (w + d - 1) / 2', () => {
    // x+z=9 的方塊中心在世界座標 x+z = 9 - 9 = 0；x+z=10 的在 1；交界 0.5
    expect(cutPlanePosition({ axis: 'd', threshold: 10 }, 10, 10)).toBe(0.5)
  })
})
```
在 `sandbox.test.ts` 的 `parseSandboxQuery` 區塊加入：
```ts
  it('accepts the diagonal axis', () => {
    expect(parseSandboxQuery('?axis=d', known)).toEqual({ sliceAxis: 'd' })
  })
```
並把 import 補上 `coordAlong`。

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout/voxels.test.ts src/store/sandbox.test.ts`
Expected：FAIL。

- [ ] **Step 3：修改 `src/scene/layout/voxels.ts`**

新增並改寫：
```ts
/** 沿某軸的格點座標；斜切 'd' 用 x + z */
export function coordAlong(v: Voxel, axis: SliceAxis): number {
  return axis === 'd' ? v.x + v.z : v[axis]
}

export function sizeAlong(axis: SliceAxis, w: number, d: number, layers: number): number {
  if (axis === 'd') return w + d - 1
  return axis === 'x' ? w : axis === 'z' ? d : layers
}

export function isHidden(v: Voxel, cut: CutSpec): boolean {
  return coordAlong(v, cut.axis) >= cut.threshold
}

/** 切面在該軸上的世界座標；斜切回傳平面 x + z = c 的 c */
export function cutPlanePosition(cut: CutSpec, w: number, d: number): number {
  if (cut.axis === 'x') return cut.threshold - w / 2
  if (cut.axis === 'z') return cut.threshold - d / 2
  if (cut.axis === 'd') return cut.threshold - (w + d - 1) / 2
  return cut.threshold
}
```

- [ ] **Step 4：在 `src/scene/LaserPlane.tsx` 的 `if (cut.axis === 'y')` 之前加入斜切分支**

```tsx
  if (cut.axis === 'd') {
    // 平面 x + z = p：離原點最近的點是 (p/2, ·, p/2)，法向量 (1,0,1)/√2 → 繞 y 轉 π/4
    return (
      <mesh position={[p / 2, height / 2, p / 2]} rotation-y={Math.PI / 4}>
        <planeGeometry args={[Math.hypot(w, d) + PAD, height + PAD]} />
        <LaserMaterial />
      </mesh>
    )
  }
```

- [ ] **Step 5：`parseSandboxQuery` 接受 `d`**

把 `if (axis === 'x' || axis === 'y' || axis === 'z') out.sliceAxis = axis` 改成：
```ts
  if (axis === 'x' || axis === 'y' || axis === 'z' || axis === 'd') out.sliceAxis = axis
```

- [ ] **Step 6：介面**

`src/ui/strings.ts` 的 `sliceAxis` 改成：
```ts
  sliceAxis: { x: '直切（左右）', z: '直切（前後）', y: '橫切（上下）', d: '斜切' },
```
`src/ui/SandboxPanel.tsx` 的 `(['x', 'z', 'y'] as const)` 改成 `(['x', 'z', 'y', 'd'] as const)`。

- [ ] **Step 7：測試、建置、截圖**

Run: `npx tsc --noEmit && npm test && npm run build`
背景啟動 `npx vite --port 5174 --strictPort`，拍 `npm run screenshot -- "http://localhost:5174/?product=0050&axis=d&slice=0.5" .superpowers/sdd/shots/p3t2-diag.png`，Read 確認：方塊被斜切掉一角、粉紅切面斜 45° 貼齊切口。只用精確 PID 關閉伺服器。

- [ ] **Step 8：Commit**

```bash
git add src/scene/layout/voxels.ts src/scene/layout/voxels.test.ts src/scene/LaserPlane.tsx src/store/sandbox.ts src/store/sandbox.test.ts src/ui/strings.ts src/ui/SandboxPanel.tsx
git commit -m "feat(scene): diagonal laser cut"
```

---

### Task 3：純 props 的籃子元件與「打掉」方塊

**Files:**
- Create: `src/scene/layout/basket.ts`, `src/scene/Basket.tsx`
- Modify: `src/scene/layout/voxels.ts`, `src/scene/VoxelInstances.tsx`, `src/scene/BasketView.tsx`
- Test: `src/scene/layout/basket.test.ts`, `src/scene/layout/voxels.test.ts`

**Interfaces:**
- Consumes: `allocateBlocks`、`stackVoxels`、`QUALITY`、`productLooks`
- Produces:
  - `basketSpec(u: Universe, productId: string, quality: Quality): BoxSpec`；`basketVoxels(u: Universe, productId: string, spec: BoxSpec): Voxel[]`
  - `damagedVoxels(voxels: Voxel[], damage: Readonly<Record<string, number>>): Set<Voxel>`（每個持股依比例打掉該組最上方的方塊；比例需在 [0, 1]，否則 RangeError）
  - `VoxelInstances` 新增可選 prop `damaged?: ReadonlySet<Voxel>`（被打掉的方塊不顯示、不可點）
  - `Basket(props: { productId: string; quality: Quality; position: [number, number, number]; slice: number; sliceAxis: SliceAxis; explode: number; highlightId?: string | null; damage?: Readonly<Record<string, number>>; onPick?: (holdingId: string) => void })`
  - `BasketView` 介面不變（內部改用 `Basket`）

- [ ] **Step 1：撰寫失敗的測試**

`src/scene/layout/basket.test.ts`：
```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { QUALITY } from '../quality'
import { basketSpec, basketVoxels } from './basket'

describe('basket layout', () => {
  it('picks the ETF cube or the fund tower spec by product type and quality', () => {
    expect(basketSpec(universe, '0050', 'high')).toBe(QUALITY.high.etf)
    expect(basketSpec(universe, 'JH_BALANCED', 'low')).toBe(QUALITY.low.fund)
  })

  it('stacks voxels strictly by weight', () => {
    const v = basketVoxels(universe, '0050', QUALITY.high.etf)
    expect(v).toHaveLength(1000)
    expect(v.filter((x) => x.id === '2330')).toHaveLength(573)
  })

  it('throws for non-baskets', () => {
    expect(() => basketVoxels(universe, '2330', QUALITY.high.etf)).toThrow('not a basket: 2330')
  })
})
```

在 `voxels.test.ts` 加入：
```ts
describe('damagedVoxels', () => {
  const counts = [{ id: 'a', count: 20 }, { id: 'b', count: 30 }]
  const v = stackVoxels(counts, 5, 5)

  it('removes the given fraction from the top of that holding only', () => {
    const hit = damagedVoxels(v, { a: 0.3 })
    expect(hit.size).toBe(6) // round(20 * 0.3)
    const keptA = v.filter((x) => x.id === 'a' && !hit.has(x))
    for (const h of hit) {
      expect(h.id).toBe('a')
      for (const k of keptA) expect(h.y).toBeGreaterThanOrEqual(k.y)
    }
  })

  it('ignores unknown ids and rejects fractions outside [0, 1]', () => {
    expect(damagedVoxels(v, { zzz: 0.5 }).size).toBe(0)
    expect(() => damagedVoxels(v, { a: 1.5 })).toThrow(RangeError)
    expect(() => damagedVoxels(v, { a: -0.1 })).toThrow(RangeError)
  })
})
```
（import 補上 `damagedVoxels`。）

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout`
Expected：FAIL。

- [ ] **Step 3：在 `src/scene/layout/voxels.ts` 加入 `damagedVoxels`**

```ts
/** 情境衝擊用：每個持股依比例打掉「該組最上方」的方塊，回傳被打掉的方塊集合 */
export function damagedVoxels(voxels: Voxel[], damage: Readonly<Record<string, number>>): Set<Voxel> {
  const byId = new Map<string, Voxel[]>()
  for (const v of voxels) {
    const list = byId.get(v.id)
    if (list) list.push(v)
    else byId.set(v.id, [v])
  }
  const out = new Set<Voxel>()
  for (const [id, f] of Object.entries(damage)) {
    if (!Number.isFinite(f) || f < 0 || f > 1) throw new RangeError(`damage[${id}] must be in [0, 1]: ${f}`)
    const list = byId.get(id)
    if (!list) continue
    const n = Math.round(list.length * f)
    const top = [...list].sort((a, b) => b.y - a.y || b.z - a.z || b.x - a.x)
    for (const v of top.slice(0, n)) out.add(v)
  }
  return out
}
```

- [ ] **Step 4：建立 `src/scene/layout/basket.ts`**

```ts
import type { Universe } from '../../data/universe'
import { allocateBlocks } from '../../sim/allocate'
import { QUALITY, type BoxSpec, type Quality } from '../quality'
import { stackVoxels, type Voxel } from './voxels'

export function basketSpec(u: Universe, productId: string, quality: Quality): BoxSpec {
  const p = u.get(productId)
  if (!p?.holdings) throw new Error(`not a basket: ${productId}`)
  return p.type === 'etf' ? QUALITY[quality].etf : QUALITY[quality].fund
}

/** 籃子方塊的唯一來源：方塊數嚴格依權重（最大餘數法） */
export function basketVoxels(u: Universe, productId: string, spec: BoxSpec): Voxel[] {
  const p = u.get(productId)
  if (!p?.holdings) throw new Error(`not a basket: ${productId}`)
  return stackVoxels(
    allocateBlocks(p.holdings.map((h) => ({ id: h.id, weight: h.weightPct })), spec.total),
    spec.w,
    spec.d,
  )
}
```

- [ ] **Step 5：`VoxelInstances` 支援 `damaged`**

在 `Props` 加入 `damaged?: ReadonlySet<Voxel>`；`KindMesh` 解構加入 `damaged`；dirty 的 `useLayoutEffect` 依賴加入 `damaged`；縮放判斷改為：
```ts
      const hidden = (cut !== null && isHidden(v, cut)) || (damaged?.has(v) ?? false)
      dummy.scale.setScalar(hidden ? 0 : VOXEL_SCALE)
```

- [ ] **Step 6：建立 `src/scene/Basket.tsx`**

```tsx
import { useMemo } from 'react'
import { universe } from '../data'
import { productLooks } from './palette'
import type { Quality } from './quality'
import { basketSpec, basketVoxels } from './layout/basket'
import {
  cutThreshold, damagedVoxels, explodeGap, layersFor, sizeAlong,
  type CutSpec, type SliceAxis, type Voxel,
} from './layout/voxels'
import { VoxelInstances } from './VoxelInstances'
import { LaserPlane } from './LaserPlane'

const NO_DAMAGE: ReadonlySet<Voxel> = new Set()

export type BasketProps = {
  productId: string
  quality: Quality
  position: [number, number, number]
  slice: number
  sliceAxis: SliceAxis
  explode: number
  highlightId?: string | null
  /** 持股 id → 打掉比例（情境衝擊）；呼叫端請 memo */
  damage?: Readonly<Record<string, number>>
  onPick?: (holdingId: string) => void
}

/** 純 props 的籃子：ETF 是立方體，基金是小塔；可同時出現多個 */
export function Basket({ productId, quality, position, slice, sliceAxis, explode, highlightId = null, damage, onPick }: BasketProps) {
  const product = universe.get(productId)
  if (!product?.holdings) throw new Error(`not a basket: ${productId}`)
  const holdings = product.holdings
  const spec = basketSpec(universe, productId, quality)
  const layers = layersFor(spec.total, spec.w, spec.d)

  const looks = useMemo(() => productLooks(universe, productId), [productId])
  const voxels = useMemo(() => basketVoxels(universe, productId, spec), [productId, spec])
  const damaged = useMemo(() => (damage ? damagedVoxels(voxels, damage) : NO_DAMAGE), [voxels, damage])
  const cut = useMemo<CutSpec | null>(
    () => (slice > 0 ? { axis: sliceAxis, threshold: cutThreshold(sizeAlong(sliceAxis, spec.w, spec.d, layers), slice) } : null),
    [slice, sliceAxis, spec, layers],
  )
  const idx = highlightId ? holdings.findIndex((h) => h.id === highlightId) : -1

  return (
    <group position={position}>
      <VoxelInstances
        voxels={voxels}
        looks={looks}
        w={spec.w}
        d={spec.d}
        explode={explode}
        cut={cut}
        damaged={damaged}
        quality={quality}
        highlightGroup={idx >= 0 ? idx : null}
        onPick={onPick ? (g) => onPick(holdings[g]!.id) : undefined}
      />
      {cut && !(cut.axis === 'y' && explode > 0) && (
        <LaserPlane cut={cut} w={spec.w} d={spec.d} height={layers + explodeGap(holdings.length) * (holdings.length - 1) * explode} />
      )}
    </group>
  )
}
```

- [ ] **Step 7：改寫 `src/scene/BasketView.tsx`**

```tsx
import { useSandbox, effectiveExplode } from '../store/sandbox'
import type { Quality } from './quality'
import { Basket } from './Basket'

type Props = { productId: string; quality: Quality; position: [number, number, number] }

/** 沙盒的籃子：狀態來自 useSandbox */
export function BasketView({ productId, quality, position }: Props) {
  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)
  return (
    <Basket
      productId={productId}
      quality={quality}
      position={position}
      slice={slice}
      sliceAxis={sliceAxis}
      explode={explode}
      highlightId={picked?.productId === productId ? picked.holdingId : null}
      onPick={(holdingId) => pick({ productId, holdingId })}
    />
  )
}
```

- [ ] **Step 8：測試、建置、截圖回歸**

Run: `npx tsc --noEmit && npm test && npm run build`
截圖 `/?product=0050&axis=x&slice=0.5` 與 `/?product=JH_BALANCED&explode=1` 到 `.superpowers/sdd/shots/p3t3-*.png`，Read 確認與 Plan 2 一致（重構不應改變畫面）。

- [ ] **Step 9：Commit**

```bash
git add src/scene/layout/basket.ts src/scene/layout/basket.test.ts src/scene/layout/voxels.ts src/scene/layout/voxels.test.ts src/scene/VoxelInstances.tsx src/scene/Basket.tsx src/scene/BasketView.tsx
git commit -m "refactor(scene): props-driven Basket and damaged voxels"
```

---

### Task 4：關卡型別與引擎

**Files:**
- Create: `src/tour/types.ts`, `src/tour/engine.ts`
- Test: `src/tour/engine.test.ts`

**Interfaces:**
- Consumes: `SliceAxis`（voxels）、`Picked`、`SandboxPatch`（sandbox）
- Produces（`types.ts`）：
  - `type CameraPresetId = 'sky' | 'overview' | 'tw' | 'us' | 'exchange' | 'plaza'`
  - `type Motion = 'still' | 'up' | 'down' | 'shake'`；`type HeldItem = { assetId: string; motion: Motion; amplitude?: number }`
  - `type Stage`（見程式碼）；`type StageKind = Stage['kind']`
  - `type StageValues = { years: number; periods: number; phase: number; frontLoad: number }`；`type ValueKey = keyof StageValues`
  - `type Control = 'slice' | 'explode' | ValueKey`；`type Condition = { control: Control; min: number }`
  - `type TourValues = StageValues & { slice: number; explode: number }`
  - `type SceneDirective`、`type TextContext`、`type Step`、`type Level`、`type Position = { level: number; step: number }`、`type Progress = { completed: string[]; sandboxUnlocked: boolean }`
- Produces（`engine.ts`）：`DEFAULT_VALUES`、`stepAt`、`isValidPosition`、`nextPosition`、`prevPosition`、`positionOf`、`progressFraction`、`isSatisfied`、`sandboxPatchFor`、`textOf`、`parseProgress`、`serializeProgress`、`parseTourQuery`

- [ ] **Step 1：建立 `src/tour/types.ts`**

```ts
import type { SliceAxis } from '../scene/layout/voxels'
import type { Picked } from '../store/sandbox'

export type CameraPresetId = 'sky' | 'overview' | 'tw' | 'us' | 'exchange' | 'plaza'

export type Motion = 'still' | 'up' | 'down' | 'shake'
export type HeldItem = { assetId: string; motion: Motion; amplitude?: number }

/** 每一步在畫面上的教學視覺 */
export type Stage =
  | { kind: 'none' }
  | { kind: 'held'; items: HeldItem[] }
  | { kind: 'exdiv'; outcome: 'fill' | 'gap' }
  | { kind: 'bonds'; stressed: boolean }
  | { kind: 'excavator'; meter: boolean }
  | { kind: 'feeRace' }
  | { kind: 'accumulate' }
  | { kind: 'principalTrap' }
  | { kind: 'ticker' }
  | { kind: 'shock'; active: boolean }
  | { kind: 'overlap'; a: string; b: string }

export type StageKind = Stage['kind']

/** 舞台用的拉桿值（由導覽 store 持有） */
export type StageValues = { years: number; periods: number; phase: number; frontLoad: number }
export type ValueKey = keyof StageValues
export type Control = 'slice' | 'explode' | ValueKey
/** 要讓「下一步」可按，control 的值必須 ≥ min */
export type Condition = { control: Control; min: number }
export type TourValues = StageValues & { slice: number; explode: number }

/** 進入一步時套用的場景；未填的 slice/explode/picked/sliceAxis 會重設為預設值，product 未填則不變 */
export type SceneDirective = {
  camera: CameraPresetId
  /** 進入時先把鏡頭放到這裡再移動（序章從雲端降落用） */
  cameraFrom?: CameraPresetId
  product?: string | null
  slice?: number
  sliceAxis?: SliceAxis
  explode?: number
  picked?: Picked
  stage?: Stage
  values?: Partial<StageValues>
  /** 城市大樓名稱標籤，預設 true */
  cityLabels?: boolean
}

/** 課程文字需要的資料查詢；數字一律即時計算，不寫死 */
export type TextContext = {
  weightPct: (productId: string, holdingId: string) => number
  shock: (productId: string) => number
}

export type Step = {
  id: string
  text: string | ((c: TextContext) => string)
  scene: SceneDirective
  controls?: Control[]
  until?: Condition
}

export type Level = { id: string; title: string; steps: Step[] }
export type Position = { level: number; step: number }
export type Progress = { completed: string[]; sandboxUnlocked: boolean }
```

- [ ] **Step 2：撰寫失敗的測試 `src/tour/engine.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import type { Level } from './types'
import {
  DEFAULT_VALUES, stepAt, isValidPosition, nextPosition, prevPosition, positionOf, progressFraction,
  isSatisfied, sandboxPatchFor, textOf, parseProgress, serializeProgress, parseTourQuery,
} from './engine'

const L: Level[] = [
  { id: 'a', title: 'A', steps: [{ id: 'a1', text: 'x', scene: { camera: 'overview' } }, { id: 'a2', text: 'y', scene: { camera: 'tw' } }] },
  { id: 'b', title: 'B', steps: [{ id: 'b1', text: (c) => `w=${c.weightPct('P', 'H')}`, scene: { camera: 'us', product: 'QQQ', explode: 1 } }] },
]
const values = { ...DEFAULT_VALUES, slice: 0, explode: 0 }

describe('navigation', () => {
  it('walks steps, crosses levels, and ends with null', () => {
    expect(nextPosition(L, { level: 0, step: 0 })).toEqual({ level: 0, step: 1 })
    expect(nextPosition(L, { level: 0, step: 1 })).toEqual({ level: 1, step: 0 })
    expect(nextPosition(L, { level: 1, step: 0 })).toBeNull()
  })

  it('goes back across levels and stops at the start', () => {
    expect(prevPosition(L, { level: 1, step: 0 })).toEqual({ level: 0, step: 1 })
    expect(prevPosition(L, { level: 0, step: 0 })).toBeNull()
  })

  it('validates and looks up positions', () => {
    expect(isValidPosition(L, { level: 1, step: 0 })).toBe(true)
    expect(isValidPosition(L, { level: 1, step: 1 })).toBe(false)
    expect(isValidPosition(L, { level: -1, step: 0 })).toBe(false)
    expect(stepAt(L, { level: 0, step: 1 }).id).toBe('a2')
    expect(() => stepAt(L, { level: 2, step: 0 })).toThrow(RangeError)
    expect(positionOf(L, 'b1')).toEqual({ level: 1, step: 0 })
    expect(() => positionOf(L, 'zz')).toThrow('unknown step zz')
  })

  it('reports progress as steps before the current one over all steps', () => {
    expect(progressFraction(L, { level: 0, step: 0 })).toBe(0)
    expect(progressFraction(L, { level: 1, step: 0 })).toBeCloseTo(2 / 3)
  })
})

describe('isSatisfied', () => {
  it('is true without a condition and compares the control value otherwise', () => {
    expect(isSatisfied(undefined, values)).toBe(true)
    expect(isSatisfied({ control: 'slice', min: 0.4 }, { ...values, slice: 0.39 })).toBe(false)
    expect(isSatisfied({ control: 'slice', min: 0.4 }, { ...values, slice: 0.4 })).toBe(true)
    expect(isSatisfied({ control: 'years', min: 3 }, { ...values, years: 5 })).toBe(true)
  })
})

describe('sandboxPatchFor', () => {
  it('resets cut/explode/pick to defaults and keeps product when not given', () => {
    expect(sandboxPatchFor({ camera: 'tw' })).toEqual({ sliceAxis: 'x', slice: 0, explode: 0, picked: null })
  })

  it('passes through explicit values including a null product', () => {
    expect(sandboxPatchFor({ camera: 'plaza', product: null, slice: 0.5, sliceAxis: 'd', explode: 1 })).toEqual({
      productId: null, sliceAxis: 'd', slice: 0.5, explode: 1, picked: null,
    })
  })
})

describe('textOf', () => {
  it('returns static text or calls the template with the context', () => {
    const ctx = { weightPct: () => 57.35, shock: () => -0.17 }
    expect(textOf(L[0]!.steps[0]!, ctx)).toBe('x')
    expect(textOf(L[1]!.steps[0]!, ctx)).toBe('w=57.35')
  })
})

describe('progress persistence', () => {
  it('round-trips and tolerates garbage', () => {
    const p = { completed: ['a'], sandboxUnlocked: true }
    expect(parseProgress(serializeProgress(p))).toEqual(p)
    expect(parseProgress(null)).toEqual({ completed: [], sandboxUnlocked: false })
    expect(parseProgress('{oops')).toEqual({ completed: [], sandboxUnlocked: false })
    expect(parseProgress('{"completed":[1,"b"],"sandboxUnlocked":"yes"}')).toEqual({ completed: ['b'], sandboxUnlocked: false })
  })
})

describe('parseTourQuery', () => {
  it('reads mode and a valid position', () => {
    expect(parseTourQuery('?mode=sandbox', L)).toEqual({ mode: 'sandbox' })
    expect(parseTourQuery('?level=1&step=0', L)).toEqual({ mode: 'tour', pos: { level: 1, step: 0 } })
  })

  it('treats sandbox parameters as sandbox mode and ignores invalid positions', () => {
    expect(parseTourQuery('?product=0050&slice=0.5', L)).toEqual({ mode: 'sandbox' })
    expect(parseTourQuery('?level=9&step=0', L)).toEqual({})
    expect(parseTourQuery('', L)).toEqual({})
  })
})
```

- [ ] **Step 3：執行測試，確認失敗**

Run: `npx vitest run src/tour/engine.test.ts`
Expected：FAIL（找不到 `./engine`）。

- [ ] **Step 4：實作 `src/tour/engine.ts`**

```ts
import type { SandboxPatch } from '../store/sandbox'
import type { Condition, Level, Position, Progress, SceneDirective, StageValues, Step, TextContext, TourValues } from './types'

export const DEFAULT_VALUES: StageValues = { years: 1, periods: 0, phase: 0, frontLoad: 0.015 }

export function isValidPosition(levels: readonly Level[], pos: Position): boolean {
  return Number.isInteger(pos.level) && Number.isInteger(pos.step) && !!levels[pos.level]?.steps[pos.step]
}

export function stepAt(levels: readonly Level[], pos: Position): Step {
  const s = levels[pos.level]?.steps[pos.step]
  if (!s) throw new RangeError(`no step at ${pos.level}/${pos.step}`)
  return s
}

export function nextPosition(levels: readonly Level[], pos: Position): Position | null {
  const level = levels[pos.level]
  if (level && pos.step + 1 < level.steps.length) return { level: pos.level, step: pos.step + 1 }
  if (pos.level + 1 < levels.length) return { level: pos.level + 1, step: 0 }
  return null
}

export function prevPosition(levels: readonly Level[], pos: Position): Position | null {
  if (pos.step > 0) return { level: pos.level, step: pos.step - 1 }
  const prev = levels[pos.level - 1]
  return prev ? { level: pos.level - 1, step: prev.steps.length - 1 } : null
}

export function positionOf(levels: readonly Level[], stepId: string): Position {
  for (let level = 0; level < levels.length; level++) {
    const step = levels[level]!.steps.findIndex((s) => s.id === stepId)
    if (step >= 0) return { level, step }
  }
  throw new Error(`unknown step ${stepId}`)
}

export function progressFraction(levels: readonly Level[], pos: Position): number {
  const total = levels.reduce((n, l) => n + l.steps.length, 0)
  const before = levels.slice(0, pos.level).reduce((n, l) => n + l.steps.length, 0) + pos.step
  return total === 0 ? 0 : before / total
}

export function isSatisfied(c: Condition | undefined, v: TourValues): boolean {
  return !c || v[c.control] >= c.min
}

export function sandboxPatchFor(d: SceneDirective): SandboxPatch {
  const patch: SandboxPatch = {
    sliceAxis: d.sliceAxis ?? 'x',
    slice: d.slice ?? 0,
    explode: d.explode ?? 0,
    picked: d.picked ?? null,
  }
  if (d.product !== undefined) patch.productId = d.product
  return patch
}

export function textOf(step: Step, ctx: TextContext): string {
  return typeof step.text === 'function' ? step.text(ctx) : step.text
}

const EMPTY_PROGRESS: Progress = { completed: [], sandboxUnlocked: false }

export function parseProgress(raw: string | null): Progress {
  if (!raw) return { ...EMPTY_PROGRESS }
  try {
    const o: unknown = JSON.parse(raw)
    if (typeof o !== 'object' || o === null) return { ...EMPTY_PROGRESS }
    const rec = o as Record<string, unknown>
    const completed = Array.isArray(rec.completed) ? rec.completed.filter((x): x is string => typeof x === 'string') : []
    return { completed, sandboxUnlocked: rec.sandboxUnlocked === true }
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

export function serializeProgress(p: Progress): string {
  return JSON.stringify(p)
}

const SANDBOX_KEYS = ['product', 'slice', 'explode', 'axis']

/** ?mode=sandbox、?level=1&step=2；帶沙盒參數（product/slice/explode/axis）視為沙盒模式 */
export function parseTourQuery(search: string, levels: readonly Level[]): { mode?: 'tour' | 'sandbox'; pos?: Position } {
  const q = new URLSearchParams(search)
  if (q.get('mode') === 'sandbox' || SANDBOX_KEYS.some((k) => q.has(k))) return { mode: 'sandbox' }
  if (q.has('level')) {
    const pos = { level: Number(q.get('level')), step: Number(q.get('step') ?? 0) }
    if (isValidPosition(levels, pos)) return { mode: 'tour', pos }
  }
  return {}
}
```

- [ ] **Step 5：執行測試**

Run: `npx vitest run src/tour/engine.test.ts && npx tsc --noEmit`
Expected：全部 PASS。

- [ ] **Step 6：Commit**

```bash
git add src/tour/types.ts src/tour/engine.ts src/tour/engine.test.ts
git commit -m "feat(tour): level types and pure navigation engine"
```

---

### Task 5：課程內容

**Files:**
- Create: `src/tour/context.ts`, `src/tour/levels.ts`
- Test: `src/tour/context.test.ts`, `src/tour/levels.test.ts`

**Interfaces:**
- Consumes: `Level`、`TextContext`（Task 4）；`shockImpact`（sim）；`universe`、`isBasket`
- Produces:
  - `SHOCK_2330: Readonly<Record<string, number>>`（`{ '2330': -0.3 }`）
  - `makeTextContext(u: Universe): TextContext`
  - `pct0(w: number): string`（四捨五入到整數）；`signedPct(x: number): string`（小數 → `−17.2%`／`0.0%`／`+5.0%`，負號用 U+2212）
  - `LEVELS: Level[]`：`prologue`、`stock`、`bond`、`fund`、`etf`、`scenario`

- [ ] **Step 1：撰寫失敗的測試 `src/tour/context.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { makeTextContext, pct0, signedPct } from './context'

describe('text context', () => {
  const c = makeTextContext(universe)

  it('looks up holding weights and throws on unknown pairs', () => {
    expect(c.weightPct('0050', '2330')).toBe(57.35)
    expect(() => c.weightPct('0050', 'NVDA')).toThrow('no holding NVDA in 0050')
  })

  it('computes the 2330 -30% shock', () => {
    expect(c.shock('0050')).toBeCloseTo(-0.17205, 5)
    expect(c.shock('SPY')).toBe(0)
  })
})

describe('formatting', () => {
  it('pct0 rounds percentages', () => {
    expect(pct0(57.35)).toBe('57')
    expect(pct0(31.98)).toBe('32')
  })

  it('signedPct uses a real minus sign and one decimal', () => {
    expect(signedPct(-0.17205)).toBe('−17.2%')
    expect(signedPct(0)).toBe('0.0%')
    expect(signedPct(0.05)).toBe('+5.0%')
  })
})
```

- [ ] **Step 2：撰寫失敗的測試 `src/tour/levels.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { isBasket } from '../data/schema'
import { LEVELS } from './levels'
import { makeTextContext } from './context'
import { textOf } from './engine'
import type { Stage } from './types'

const ctx = makeTextContext(universe)
const steps = LEVELS.flatMap((l) => l.steps)
const PRESETS = ['sky', 'overview', 'tw', 'us', 'exchange', 'plaza']

const assetsIn = (s: Stage): string[] => {
  if (s.kind === 'held') return s.items.map((i) => i.assetId)
  if (s.kind === 'overlap') return [s.a, s.b]
  return []
}

describe('LEVELS', () => {
  it('has the prologue plus five levels in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['prologue', 'stock', 'bond', 'fund', 'etf', 'scenario'])
    for (const l of LEVELS) expect(l.steps.length, l.id).toBeGreaterThan(0)
  })

  it('uses unique step ids', () => {
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length)
  })

  it('references only valid presets, baskets and assets', () => {
    for (const s of steps) {
      expect(PRESETS, s.id).toContain(s.scene.camera)
      if (s.scene.cameraFrom) expect(PRESETS, s.id).toContain(s.scene.cameraFrom)
      if (s.scene.product) expect(isBasket(universe.get(s.scene.product)!), s.id).toBe(true)
      if (s.scene.stage) for (const id of assetsIn(s.scene.stage)) expect(universe.has(id), `${s.id}:${id}`).toBe(true)
    }
  })

  it('only waits on controls the step exposes', () => {
    for (const s of steps) if (s.until) expect(s.controls ?? [], s.id).toContain(s.until.control)
  })

  it('renders every text without errors, non-empty, and never mentions 稅', () => {
    for (const s of steps) {
      const t = textOf(s, ctx)
      expect(t.length, s.id).toBeGreaterThan(10)
      expect(t, s.id).not.toContain('稅')
    }
  })

  it('labels illustrative stages as 示意 in their text', () => {
    const illustrative = new Set(['held', 'exdiv', 'bonds', 'accumulate', 'principalTrap', 'ticker'])
    for (const s of steps) {
      const kind = s.scene.stage?.kind
      if (kind && illustrative.has(kind) && !(kind === 'held' && s.scene.stage?.kind === 'held' && s.scene.stage.items.every((i) => i.motion === 'still'))) {
        expect(textOf(s, ctx), s.id).toContain('示意')
      }
    }
  })

  it('computes numbers from data instead of hard-coding them', () => {
    const e3 = steps.find((s) => s.id === 'e-3')!
    expect(textOf(e3, ctx)).toContain('57%')
    const c2 = steps.find((s) => s.id === 'c-2')!
    expect(textOf(c2, ctx)).toContain('−17.2%')
  })
})
```

- [ ] **Step 3：執行測試，確認失敗**

Run: `npx vitest run src/tour/context.test.ts src/tour/levels.test.ts`
Expected：FAIL。

- [ ] **Step 4：實作 `src/tour/context.ts`**

```ts
import type { Universe } from '../data/universe'
import { shockImpact } from '../sim/scenario'
import type { TextContext } from './types'

/** 第 5 關的假設情境：台積電下跌 30% */
export const SHOCK_2330: Readonly<Record<string, number>> = { '2330': -0.3 }

export function makeTextContext(u: Universe): TextContext {
  return {
    weightPct: (productId, holdingId) => {
      const w = u.get(productId)?.holdings?.find((h) => h.id === holdingId)?.weightPct
      if (w === undefined) throw new Error(`no holding ${holdingId} in ${productId}`)
      return w
    },
    shock: (productId) => shockImpact(u, productId, { ...SHOCK_2330 }),
  }
}

export const pct0 = (w: number): string => w.toFixed(0)

/** 0.05 → '+5.0%'；-0.172 → '−17.2%'（U+2212）；0 → '0.0%' */
export function signedPct(x: number): string {
  const s = Math.abs(x * 100).toFixed(1)
  if (s === '0.0') return '0.0%'
  return `${x < 0 ? '−' : '+'}${s}%`
}
```

- [ ] **Step 5：實作 `src/tour/levels.ts`**

```ts
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
        scene: { camera: 'plaza', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'still' }] } },
      },
      {
        id: 's-2',
        text: '假設公司變得更值錢，大樓長高，你手上的方塊也跟著變大。（示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'up' }] } },
      },
      {
        id: 's-3',
        text: '反過來，假設公司價值下跌，方塊也會縮小。股票的價格，跟著公司走。（示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'held', items: [{ assetId: '2330', motion: 'down' }] } },
      },
      {
        id: 's-4',
        text: '左邊是台積電，右邊是特斯拉。單一股票的價格常常上上下下，這叫「波動」；有些公司晃得特別厲害。（晃動幅度為示意，不代表真實數字）',
        scene: {
          camera: 'plaza',
          product: null,
          stage: { kind: 'held', items: [{ assetId: '2330', motion: 'shake', amplitude: 0.12 }, { assetId: 'TSLA', motion: 'shake', amplitude: 0.45 }] },
        },
      },
      {
        id: 's-5',
        text: '有些公司賺了錢會發「股利」，就是金幣。拖動下方的時間軸，看看配發的那一刻發生了什麼事。（示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 0 } },
        controls: ['phase'],
        until: { control: 'phase', min: 0.55 },
      },
      {
        id: 's-6',
        text: '方塊縮小的部分，剛好等於你拿到的金幣：方塊價值＋金幣＝不變。這叫「除息」。之後方塊如果慢慢長回原本大小，叫「填息」。（示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'exdiv', outcome: 'fill' }, values: { phase: 1 } },
        controls: ['phase'],
      },
      {
        id: 's-7',
        text: '方塊也可能長不回去，甚至更小，這叫「貼息」。所以配息不是白送的錢，真正要看的是「方塊＋金幣」加起來的總報酬。（示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'exdiv', outcome: 'gap' }, values: { phase: 1 } },
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
        text: '借給政府的是國家債：像鑽石一樣堅固，但利息最少。借給公司的是公司債：金屬材質。借給體質較弱公司的是高收益債：玻璃材質，利息比較多，也比較容易裂。（利息快慢為示意）',
        scene: { camera: 'plaza', product: null, stage: { kind: 'bonds', stressed: false } },
      },
      {
        id: 'b-3',
        text: '假設遇上一場經濟風暴：股票方塊大幅縮水，體質弱的公司借據（高收益債）裂開、停止滴金幣，國家債幾乎不受影響。報酬比較高的，風險通常也比較高。（示意）',
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
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false } },
      },
      {
        id: 'f-2',
        text: '拖動「拆開」拉桿，看看這座塔裡裝了什麼。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: false } },
        controls: ['explode'],
        until: { control: 'explode', min: 0.6 },
      },
      {
        id: 'f-3',
        text: '塔裡有輝達、微軟這些股票方塊，也有美國公債的鑽石借據。同時持有股票和債券的基金，叫「多重資產」或「平衡型」。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-4',
        text: (c) =>
          `同樣叫多重資產，安聯收益成長的內容就很不一樣：依目前快照（待驗證），可轉債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'CONVERTIBLE_US'))}%、高收益債約 ${pct0(c.weightPct('ALLIANZ_INCOME_GROWTH', 'US_HIGH_YIELD'))}%。名稱一樣，裡面不一定一樣。`,
        scene: { camera: 'exchange', product: 'ALLIANZ_INCOME_GROWTH', explode: 1, stage: { kind: 'excavator', meter: false }, cityLabels: false },
      },
      {
        id: 'f-5',
        text: '怪手不是免費的。塔上的計費表一直在跑：管理費等內扣費用，每天都會從塔上磨掉一點點。',
        scene: { camera: 'exchange', product: 'JH_BALANCED', stage: { kind: 'excavator', meter: true } },
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
        scene: { camera: 'exchange', product: '0050' },
      },
      {
        id: 'e-2',
        text: '拿起雷射刀，把它切開看看。',
        scene: { camera: 'exchange', product: '0050', sliceAxis: 'x' },
        controls: ['slice'],
        until: { control: 'slice', min: 0.4 },
      },
      {
        id: 'e-3',
        text: (c) =>
          `看到那層特別厚的藍色了嗎？那是台積電，佔了約 ${pct0(c.weightPct('0050', '2330'))}%。0050 依市值加權，越大的公司佔越多。`,
        scene: { camera: 'exchange', product: '0050', slice: 0.5, sliceAxis: 'x' },
      },
      {
        id: 'e-4',
        text: 'ETF 在交易所開盤時隨時都有成交價，可以像股票一樣買賣；一般基金則是每天收盤後才算出一個淨值。（價格跳動為示意）',
        scene: { camera: 'exchange', product: '0050', stage: { kind: 'ticker' } },
      },
      {
        id: 'e-5',
        text: '美國的 QQQ（追蹤那斯達克 100）和 SPY（追蹤標普 500）也是 ETF。照藍圖自動配置、不需要怪手挑股，所以費用通常比主動型基金低。',
        scene: { camera: 'exchange', product: 'QQQ' },
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
```

- [ ] **Step 5b：核對課程文字的事實**

逐句檢查 `levels.ts` 的事實陳述與資料一致（JH 持有 NVDA、MSFT、US_TREASURY；QQQ／SPY 重疊含 NVDA、AAPL、MSFT；SPY 不含 2330；QQQ、SPY 費用率低於各基金）。若資料不支持某句，修改文字使其符合資料，並在報告列出。

- [ ] **Step 6：執行測試**

Run: `npx vitest run src/tour && npx tsc --noEmit`
Expected：全部 PASS。

- [ ] **Step 7：Commit**

```bash
git add src/tour/context.ts src/tour/context.test.ts src/tour/levels.ts src/tour/levels.test.ts
git commit -m "feat(tour): lesson content for prologue and levels 1-5"
```

---

### Task 6：導覽 store、鏡頭、導覽面板

**Files:**
- Create: `src/store/tour.ts`, `src/scene/camera.ts`, `src/scene/CameraRig.tsx`, `src/ui/TourPanel.tsx`, `src/ui/StageControls.tsx`
- Modify: `src/ui/strings.ts`, `src/ui/SandboxPanel.tsx`, `src/ui/ui.css`, `src/scene/Scene.tsx`, `src/App.tsx`, `src/main.tsx`
- Test: `src/store/tour.test.ts`, `src/scene/camera.test.ts`

**Interfaces:**
- Consumes: Task 1（`applyScene`、`resetSandbox`）、Task 4（engine）、Task 5（`LEVELS`、`makeTextContext`）
- Produces:
  - `useTour`：state `mode: 'tour' | 'sandbox'`、`pos: Position`、`values: StageValues`、`progress: Progress`；actions `enterStep(pos)`、`next()`、`prev()`、`enterSandbox()`、`restartTour()`、`setValue(k: ValueKey, v: number)`
  - `currentStep(s: { pos: Position }): Step`；`VALUE_RANGES: Record<ValueKey, [number, number]>`；`loadProgress(): Progress`
  - `CAMERA_PRESETS: Record<CameraPresetId, { position: Vec3; target: Vec3 }>`；`type Vec3 = [number, number, number]`；`approachVec(cur: Vec3, target: Vec3, dt: number, rate?: number): { next: Vec3; done: boolean }`
  - 元件 `CameraRig()`、`TourPanel()`、`StageControls({ controls })`

- [ ] **Step 1：撰寫失敗的測試 `src/scene/camera.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { approachVec, CAMERA_PRESETS } from './camera'

describe('approachVec', () => {
  it('moves part of the way and snaps when close', () => {
    const a = approachVec([0, 0, 0], [10, 0, 0], 0.1)
    expect(a.next[0]).toBeGreaterThan(0)
    expect(a.next[0]).toBeLessThan(10)
    expect(a.done).toBe(false)
    const b = approachVec([9.99, 0, 0], [10, 0, 0], 0.016)
    expect(b).toEqual({ next: [10, 0, 0], done: true })
  })
})

describe('CAMERA_PRESETS', () => {
  it('defines every preset', () => {
    expect(Object.keys(CAMERA_PRESETS).sort()).toEqual(['exchange', 'overview', 'plaza', 'sky', 'tw', 'us'])
  })
})
```

- [ ] **Step 2：撰寫失敗的測試 `src/store/tour.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTour, currentStep } from './tour'
import { useSandbox } from './sandbox'
import { LEVELS } from '../tour/levels'
import { positionOf } from '../tour/engine'

beforeEach(() => {
  useSandbox.setState(useSandbox.getInitialState())
  useTour.setState(useTour.getInitialState())
})

describe('useTour', () => {
  it('entering a step applies its scene to the sandbox and its values', () => {
    useTour.getState().enterStep(positionOf(LEVELS, 'f-3'))
    expect(useSandbox.getState()).toMatchObject({ productId: 'JH_BALANCED', explode: 1, slice: 0 })
    useTour.getState().enterStep(positionOf(LEVELS, 'f-6'))
    expect(useTour.getState().values.years).toBe(0)
    expect(useSandbox.getState().productId).toBeNull()
  })

  it('next crosses a level boundary and marks the level completed', () => {
    const last = { level: 0, step: LEVELS[0]!.steps.length - 1 }
    useTour.getState().enterStep(last)
    useTour.getState().next()
    expect(useTour.getState().pos).toEqual({ level: 1, step: 0 })
    expect(useTour.getState().progress.completed).toEqual(['prologue'])
  })

  it('finishing the last step unlocks the sandbox and switches mode', () => {
    const lastLevel = LEVELS.length - 1
    useTour.getState().enterStep({ level: lastLevel, step: LEVELS[lastLevel]!.steps.length - 1 })
    useTour.getState().next()
    expect(useTour.getState().mode).toBe('sandbox')
    expect(useTour.getState().progress.sandboxUnlocked).toBe(true)
    expect(useSandbox.getState().productId).toBe('0050')
  })

  it('prev at the very start does nothing', () => {
    useTour.getState().enterStep({ level: 0, step: 0 })
    useTour.getState().prev()
    expect(useTour.getState().pos).toEqual({ level: 0, step: 0 })
  })

  it('setValue clamps to the allowed range and maps NaN to the minimum', () => {
    useTour.getState().setValue('years', 99)
    expect(useTour.getState().values.years).toBe(10)
    useTour.getState().setValue('frontLoad', Number.NaN)
    expect(useTour.getState().values.frontLoad).toBe(0)
  })

  it('currentStep follows pos', () => {
    useTour.getState().enterStep(positionOf(LEVELS, 'e-3'))
    expect(currentStep(useTour.getState()).id).toBe('e-3')
  })
})
```

- [ ] **Step 3：執行測試，確認失敗**

Run: `npx vitest run src/scene/camera.test.ts src/store/tour.test.ts`
Expected：FAIL。

- [ ] **Step 4：實作 `src/scene/camera.ts`**

```ts
import type { CameraPresetId } from '../tour/types'

export type Vec3 = [number, number, number]

/** 鏡頭預設位置；PLAZA（前方廣場）中心在 z ≈ 30 */
export const CAMERA_PRESETS: Record<CameraPresetId, { position: Vec3; target: Vec3 }> = {
  sky: { position: [0, 140, 160], target: [0, 0, 0] },
  overview: { position: [10, 36, 58], target: [0, 5, 12] },
  tw: { position: [-12, 22, 34], target: [-16, 6, 0] },
  us: { position: [20, 22, 34], target: [16, 6, 0] },
  exchange: { position: [6, 18, 40], target: [0, 6, 14] },
  plaza: { position: [0, 26, 66], target: [0, 4, 30] },
}

const SNAP = 0.05

/** 指數趨近；距離小於 SNAP 時直接到位 */
export function approachVec(cur: Vec3, target: Vec3, dt: number, rate = 3): { next: Vec3; done: boolean } {
  const k = 1 - Math.exp(-rate * dt)
  const next = cur.map((c, i) => c + (target[i]! - c) * k) as Vec3
  const dist = Math.hypot(next[0] - target[0], next[1] - target[1], next[2] - target[2])
  return dist < SNAP ? { next: [...target], done: true } : { next, done: false }
}
```

- [ ] **Step 5：實作 `src/store/tour.ts`**

```ts
import { create } from 'zustand'
import { LEVELS } from '../tour/levels'
import { DEFAULT_VALUES, nextPosition, parseProgress, prevPosition, sandboxPatchFor, serializeProgress, stepAt } from '../tour/engine'
import type { Position, Progress, StageValues, Step, ValueKey } from '../tour/types'
import { useSandbox } from './sandbox'

const STORAGE_KEY = 'block-city-invest:progress'

/** 讀取進度；localStorage 不可用（隱私模式、測試環境）時回傳空進度 */
export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(STORAGE_KEY))
  } catch {
    return parseProgress(null)
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProgress(p))
  } catch {
    // 無法保存就算了：進度只是方便功能
  }
}

export const VALUE_RANGES: Record<ValueKey, [number, number]> = {
  years: [0, 10],
  periods: [0, 20],
  phase: [0, 1],
  frontLoad: [0, 0.03],
}

type TourState = {
  mode: 'tour' | 'sandbox'
  pos: Position
  values: StageValues
  progress: Progress
  enterStep: (pos: Position) => void
  next: () => void
  prev: () => void
  enterSandbox: () => void
  restartTour: () => void
  setValue: (k: ValueKey, v: number) => void
}

export const useTour = create<TourState>()((set, get) => ({
  mode: 'tour',
  pos: { level: 0, step: 0 },
  values: { ...DEFAULT_VALUES },
  progress: { completed: [], sandboxUnlocked: false },
  enterStep: (pos) => {
    const step = stepAt(LEVELS, pos)
    useSandbox.getState().applyScene(sandboxPatchFor(step.scene))
    set({ mode: 'tour', pos, values: { ...DEFAULT_VALUES, ...step.scene.values } })
  },
  next: () => {
    const { pos, progress } = get()
    const n = nextPosition(LEVELS, pos)
    let p = progress
    if (!n || n.level !== pos.level) {
      const id = LEVELS[pos.level]!.id
      if (!p.completed.includes(id)) p = { ...p, completed: [...p.completed, id] }
    }
    if (!n) p = { ...p, sandboxUnlocked: true }
    if (p !== progress) {
      saveProgress(p)
      set({ progress: p })
    }
    if (n) get().enterStep(n)
    else get().enterSandbox()
  },
  prev: () => {
    const p = prevPosition(LEVELS, get().pos)
    if (p) get().enterStep(p)
  },
  enterSandbox: () => {
    useSandbox.getState().resetSandbox()
    set({ mode: 'sandbox' })
  },
  restartTour: () => get().enterStep({ level: 0, step: 0 }),
  setValue: (k, v) => {
    const [lo, hi] = VALUE_RANGES[k]
    const x = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
    set({ values: { ...get().values, [k]: x } })
  },
}))

export const currentStep = (s: { pos: Position }): Step => stepAt(LEVELS, s.pos)
```

- [ ] **Step 6：執行測試**

Run: `npx vitest run src/scene/camera.test.ts src/store/tour.test.ts && npx tsc --noEmit`
Expected：PASS。

- [ ] **Step 7：介面文字（加到 `src/ui/strings.ts` 的 `T` 內）**

```ts
  levelLabel: (i: number) => (i === 0 ? '序章' : `第 ${i} 關`),
  next: '下一步',
  prev: '上一步',
  finish: '進入沙盒',
  skipToSandbox: '跳過導覽，直接進沙盒',
  replayTour: '重看導覽',
  tryIt: '先試著操作下面的控制項',
  illustrative: '示意',
  assumption: '假設',
  controls: {
    years: '持有年數',
    yearsValue: (v: number) => `${v} 年`,
    periods: '經過年數',
    periodsValue: (v: number) => `${v} 年`,
    phase: '時間軸',
    phaseValue: (v: number) => (v < 0.5 ? '配發前' : '配發後'),
    frontLoad: '假設的前收手續費',
    frontLoadValue: (v: number) => `${(v * 100).toFixed(2)}%`,
  },
```

- [ ] **Step 8：建立 `src/ui/StageControls.tsx`**

```tsx
import { useSandbox } from '../store/sandbox'
import { useTour, VALUE_RANGES } from '../store/tour'
import type { Control, ValueKey } from '../tour/types'
import { T } from './strings'

const STEP: Record<ValueKey, number> = { years: 0.5, periods: 1, phase: 0.01, frontLoad: 0.0025 }

function ValueSlider({ k }: { k: ValueKey }) {
  const v = useTour((s) => s.values[k])
  const setValue = useTour((s) => s.setValue)
  const [lo, hi] = VALUE_RANGES[k]
  const fmt = { years: T.controls.yearsValue, periods: T.controls.periodsValue, phase: T.controls.phaseValue, frontLoad: T.controls.frontLoadValue }[k]
  return (
    <label className="control">
      <span className="control__label">
        {T.controls[k]}
        {k === 'frontLoad' && <span className="badge">{T.assumption}</span>}
        <span className="control__value">{fmt(v)}</span>
      </span>
      <input type="range" min={lo} max={hi} step={STEP[k]} value={v} onChange={(e) => setValue(k, Number(e.target.value))} />
    </label>
  )
}

export function StageControls({ controls }: { controls: readonly Control[] }) {
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox((s) => s.explode)
  const { setSlice, setExplode } = useSandbox.getState()
  return (
    <div className="controls">
      {controls.map((c) => {
        if (c === 'slice')
          return (
            <label key={c} className="control">
              <span className="control__label">{T.slice}</span>
              <input type="range" min={0} max={1} step={0.01} value={slice} onChange={(e) => setSlice(Number(e.target.value))} />
            </label>
          )
        if (c === 'explode')
          return (
            <label key={c} className="control">
              <span className="control__label">{T.explode}</span>
              <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
            </label>
          )
        return <ValueSlider key={c} k={c} />
      })}
    </div>
  )
}
```

- [ ] **Step 9：建立 `src/ui/TourPanel.tsx`**

```tsx
import { useMemo } from 'react'
import { universe } from '../data'
import { effectiveExplode, useSandbox } from '../store/sandbox'
import { currentStep, useTour } from '../store/tour'
import { makeTextContext } from '../tour/context'
import { isSatisfied, nextPosition, progressFraction, textOf } from '../tour/engine'
import { LEVELS } from '../tour/levels'
import { StageControls } from './StageControls'
import { T } from './strings'

const ctx = makeTextContext(universe)

export function TourPanel() {
  const pos = useTour((s) => s.pos)
  const values = useTour((s) => s.values)
  const unlocked = useTour((s) => s.progress.sandboxUnlocked)
  const { next, prev, enterSandbox } = useTour.getState()
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const step = currentStep({ pos })
  const level = LEVELS[pos.level]!
  const text = useMemo(() => textOf(step, ctx), [step])
  const ok = isSatisfied(step.until, { ...values, slice, explode })
  const isLast = nextPosition(LEVELS, pos) === null

  return (
    <aside className="panel tour" aria-live="polite">
      <p className="tour__level">
        {T.levelLabel(pos.level)}・{level.title}
      </p>
      <progress className="tour__progress" value={progressFraction(LEVELS, pos)} max={1} />
      <p className="tour__text">{text}</p>
      {step.controls && <StageControls controls={step.controls} />}
      {!ok && <p className="hint">{T.tryIt}</p>}
      <div className="tour__nav">
        <button onClick={prev} disabled={pos.level === 0 && pos.step === 0}>
          {T.prev}
        </button>
        <button className="primary" onClick={next} disabled={!ok}>
          {isLast ? T.finish : T.next}
        </button>
      </div>
      {unlocked && (
        <button className="link" onClick={enterSandbox}>
          {T.skipToSandbox}
        </button>
      )}
    </aside>
  )
}
```

（Task 13 會在文字與控制項之間加上即時數字 `StageReadout`。）

- [ ] **Step 10：`SandboxPanel` 加上「重看導覽」**

在 `<h1 className="panel__title">` 之後加入：
```tsx
      <button className="link" onClick={() => useTour.getState().restartTour()}>
        {T.replayTour}
      </button>
```
並 `import { useTour } from '../store/tour'`。

- [ ] **Step 11：`src/ui/ui.css` 加入導覽樣式**

```css
.tour__level { margin: 0 0 6px; font-size: 13px; color: var(--muted); font-weight: 600; }
.tour__progress { width: 100%; height: 6px; accent-color: var(--accent); }
.tour__text { margin: 12px 0; font-size: 15px; line-height: 1.75; }
.tour__nav { display: flex; gap: 8px; margin-top: 12px; }
.tour__nav button {
  flex: 1; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border);
  background: var(--chip); color: var(--text); font: inherit; cursor: pointer;
}
.tour__nav button.primary { background: var(--chip-on); color: var(--chip-on-text); border-color: transparent; }
.tour__nav button:disabled { opacity: 0.45; cursor: not-allowed; }
.link { border: 0; background: none; padding: 4px 0; color: var(--muted); font: inherit; font-size: 12px; text-decoration: underline; cursor: pointer; }
.controls { display: grid; gap: 10px; margin: 8px 0; }
.control { display: grid; gap: 4px; font-size: 13px; }
.control__label { display: flex; align-items: center; gap: 6px; }
.control__value { margin-left: auto; color: var(--muted); font-variant-numeric: tabular-nums; }
.control input[type='range'] { width: 100%; accent-color: var(--accent); }
```

- [ ] **Step 12：建立 `src/scene/CameraRig.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { currentStep, useTour } from '../store/tour'
import { approachVec, CAMERA_PRESETS, type Vec3 } from './camera'

/** 導覽時把鏡頭移到步驟指定的位置；使用者一拖動就停止，不跟使用者搶控制權 */
export function CameraRig() {
  const mode = useTour((s) => s.mode)
  const scene = useTour((s) => currentStep(s).scene)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const active = useRef(false)
  const presetId = mode === 'tour' ? scene.camera : 'overview'

  useEffect(() => {
    if (mode === 'tour' && scene.cameraFrom && controls) {
      const f = CAMERA_PRESETS[scene.cameraFrom]
      camera.position.set(...f.position)
      controls.target.set(...f.target)
      controls.update()
    }
    active.current = true
  }, [mode, scene, camera, controls])

  useEffect(() => {
    if (!controls) return
    const stop = () => {
      active.current = false
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  useFrame((_, dt) => {
    if (!active.current || !controls) return
    const p = CAMERA_PRESETS[presetId]
    const a = approachVec(camera.position.toArray() as Vec3, p.position, dt)
    const b = approachVec(controls.target.toArray() as Vec3, p.target, dt)
    camera.position.set(...a.next)
    controls.target.set(...b.next)
    controls.update()
    if (a.done && b.done) active.current = false
  })
  return null
}
```

若 `three-stdlib` 型別無法解析，改用 `import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'`，並在報告說明。

- [ ] **Step 13：組裝**

`src/scene/Scene.tsx`：import `CameraRig`，在 `<OrbitControls ... />` 之後加入 `<CameraRig />`。

`src/App.tsx`：import `useTour`、`TourPanel`；把 `<SandboxPanel />` 改成：
```tsx
      {mode === 'tour' ? <TourPanel /> : <SandboxPanel />}
```
並在元件開頭加 `const mode = useTour((s) => s.mode)`。

`src/main.tsx`：在 `createRoot` 之前，把原本的 `useSandbox.setState(parseSandboxQuery(...))` 改成：
```ts
import { LEVELS } from './tour/levels'
import { parseTourQuery } from './tour/engine'
import { loadProgress, useTour } from './store/tour'

const progress = loadProgress()
useTour.setState({ progress })
const tq = parseTourQuery(window.location.search, LEVELS)
if (tq.mode === 'sandbox' || (!tq.pos && progress.sandboxUnlocked)) {
  useTour.setState({ mode: 'sandbox' })
  useSandbox.setState(parseSandboxQuery(window.location.search, baskets))
} else {
  useTour.getState().enterStep(tq.pos ?? { level: 0, step: 0 })
}
if (import.meta.env.DEV) {
  ;(window as unknown as { __BCI_STEPS__: number[] }).__BCI_STEPS__ = LEVELS.map((l) => l.steps.length)
}
```

- [ ] **Step 14：測試、建置、截圖**

Run: `npx tsc --noEmit && npm test && npm run build`
背景啟動 dev server，截圖並 Read：
- `/` → `p3t6-start.png`：導覽面板顯示「序章・歡迎來到積木城市」、文字與「下一步」，鏡頭從高空降到總覽（等待 3000ms 再拍）
- `/?level=4&step=1` → `p3t6-etf-slice.png`：0050 在畫面中，面板有切割拉桿，「下一步」不可按
- `/?mode=sandbox` → `p3t6-sandbox.png`：沙盒面板與「重看導覽」

- [ ] **Step 15：Commit**

```bash
git add src/store/tour.ts src/store/tour.test.ts src/scene/camera.ts src/scene/camera.test.ts src/scene/CameraRig.tsx src/ui/TourPanel.tsx src/ui/StageControls.tsx src/ui/strings.ts src/ui/SandboxPanel.tsx src/ui/ui.css src/scene/Scene.tsx src/App.tsx src/main.tsx
git commit -m "feat(tour): tour store, camera rig and tour panel"
```

---

### Task 7：金幣

**Files:**
- Create: `src/scene/layout/coins.ts`, `src/scene/CoinDrip.tsx`, `src/scene/CoinPile.tsx`
- Test: `src/scene/layout/coins.test.ts`

**Interfaces:**
- Consumes: `Vec3`（camera.ts）
- Produces:
  - `type CoinParams = { from: Vec3; to: Vec3; rate: number; fallTime: number; arc: number }`
  - `coinPositions(t: number, p: CoinParams, max?: number): Vec3[]`（自 t=0 起每 `1/rate` 秒產生一枚，飛行 `fallTime` 秒，拋物線高 `arc`；最新的在前）
  - `coinPileLayout(n: number, perColumn?: number, spacing?: number): Vec3[]`（相對座標，每柱 `perColumn` 枚往上疊）
  - `CoinDrip(props: { from: Vec3; to: Vec3; rate: number; fallTime?: number; arc?: number; active?: boolean })`
  - `CoinPile(props: { count: number; position: Vec3 })`

- [ ] **Step 1：撰寫失敗的測試 `src/scene/layout/coins.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { coinPositions, coinPileLayout, COIN_HEIGHT } from './coins'

const p = { from: [0, 4, 0] as [number, number, number], to: [4, 0, 0] as [number, number, number], rate: 1, fallTime: 1, arc: 2 }

describe('coinPositions', () => {
  it('spawns the first coin at the source at t = 0', () => {
    expect(coinPositions(0, p)).toEqual([[0, 4, 0]])
  })

  it('moves along a lerp plus a parabola (peak arc at the midpoint)', () => {
    const [c] = coinPositions(0.5, p)
    expect(c![0]).toBeCloseTo(2)
    expect(c![1]).toBeCloseTo(2 + 2) // lerp 2 + arc*4*0.5*0.5
  })

  it('drops coins that have landed and never exceeds rate × fallTime + 1', () => {
    expect(coinPositions(1.5, p)).toHaveLength(1) // 第 0 枚已落地，第 1 枚飛行中
    const many = coinPositions(10, { ...p, rate: 5, fallTime: 1 })
    expect(many.length).toBeLessThanOrEqual(6)
  })

  it('rejects non-positive rate or fall time', () => {
    expect(() => coinPositions(0, { ...p, rate: 0 })).toThrow(RangeError)
    expect(() => coinPositions(0, { ...p, fallTime: 0 })).toThrow(RangeError)
  })
})

describe('coinPileLayout', () => {
  it('stacks coins in columns', () => {
    const pts = coinPileLayout(12, 10, 0.8)
    expect(pts).toHaveLength(12)
    expect(pts[9]![1]).toBeCloseTo(COIN_HEIGHT / 2 + 9 * COIN_HEIGHT)
    expect(pts[10]![0]).toBeCloseTo(0.8)
    expect(pts[10]![1]).toBeCloseTo(COIN_HEIGHT / 2)
  })

  it('returns nothing for 0 and rejects negatives', () => {
    expect(coinPileLayout(0)).toEqual([])
    expect(() => coinPileLayout(-1)).toThrow(RangeError)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout/coins.test.ts`
Expected：FAIL。

- [ ] **Step 3：實作 `src/scene/layout/coins.ts`**

```ts
import type { Vec3 } from '../camera'

export const COIN_RADIUS = 0.35
export const COIN_HEIGHT = 0.12

export type CoinParams = { from: Vec3; to: Vec3; rate: number; fallTime: number; arc: number }

/** 時間 t 秒時，飛行中的金幣位置（最新的在前）；自 t = 0 起每 1/rate 秒產生一枚 */
export function coinPositions(t: number, p: CoinParams, max = 64): Vec3[] {
  if (!(p.rate > 0) || !(p.fallTime > 0)) throw new RangeError(`rate and fallTime must be > 0: ${p.rate}, ${p.fallTime}`)
  const out: Vec3[] = []
  for (let i = Math.floor(t * p.rate); i >= 0 && out.length < max; i--) {
    const age = t - i / p.rate
    if (age >= p.fallTime) break
    const s = age / p.fallTime
    out.push([
      p.from[0] + (p.to[0] - p.from[0]) * s,
      p.from[1] + (p.to[1] - p.from[1]) * s + p.arc * 4 * s * (1 - s),
      p.from[2] + (p.to[2] - p.from[2]) * s,
    ])
  }
  return out
}

/** 金幣堆：每柱 perColumn 枚往上疊，柱子沿 x 排開（相對座標，底部貼齊 y = 0） */
export function coinPileLayout(n: number, perColumn = 10, spacing = 0.8): Vec3[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`n must be a non-negative integer: ${n}`)
  return Array.from({ length: n }, (_, i) => [Math.floor(i / perColumn) * spacing, COIN_HEIGHT / 2 + (i % perColumn) * COIN_HEIGHT, 0] as Vec3)
}
```

- [ ] **Step 4：建立 `src/scene/CoinDrip.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type InstancedMesh, Object3D } from 'three'
import type { Vec3 } from './camera'
import { COIN_HEIGHT, COIN_RADIUS, coinPositions } from './layout/coins'

type Props = { from: Vec3; to: Vec3; rate: number; fallTime?: number; arc?: number; active?: boolean }

export function CoinMaterial() {
  return <meshStandardMaterial color="#ffd54f" metalness={0.5} roughness={0.3} emissive="#7a5a00" emissiveIntensity={0.25} />
}

/** 從 from 持續拋出金幣到 to（股利、利息、配息） */
export function CoinDrip({ from, to, rate, fallTime = 1.2, arc = 1.5, active = true }: Props) {
  const max = Math.ceil(rate * fallTime) + 1
  const ref = useRef<InstancedMesh>(null)
  const t0 = useRef<number | null>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const pts = active ? coinPositions(clock.elapsedTime - t0.current, { from, to, rate, fallTime, arc }, max) : []
    for (let i = 0; i < max; i++) {
      const pt = pts[i]
      if (pt) {
        dummy.position.set(...pt)
        dummy.rotation.set(Math.PI / 2, 0, clock.elapsedTime * 4 + i)
        dummy.scale.setScalar(1)
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, max]} frustumCulled={false}>
      <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 20]} />
      <CoinMaterial />
    </instancedMesh>
  )
}
```

- [ ] **Step 5：建立 `src/scene/CoinPile.tsx`**

```tsx
import { useLayoutEffect, useMemo, useRef } from 'react'
import { type InstancedMesh, Object3D } from 'three'
import type { Vec3 } from './camera'
import { COIN_HEIGHT, COIN_RADIUS, coinPileLayout } from './layout/coins'
import { CoinMaterial } from './CoinDrip'

/** 一堆金幣（數量即金額，單位由呼叫端決定） */
export function CoinPile({ count, position }: { count: number; position: Vec3 }) {
  const pts = useMemo(() => coinPileLayout(count), [count])
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    pts.forEach((p, i) => {
      o.position.set(...p)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [pts])
  if (count === 0) return null
  return (
    <group position={position}>
      <instancedMesh key={count} ref={ref} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 20]} />
        <CoinMaterial />
      </instancedMesh>
    </group>
  )
}
```

- [ ] **Step 6：測試**

Run: `npx vitest run src/scene/layout/coins.test.ts && npx tsc --noEmit && npm run build`
Expected：PASS（元件會在 Task 10 起使用並截圖驗證）。

- [ ] **Step 7：Commit**

```bash
git add src/scene/layout/coins.ts src/scene/layout/coins.test.ts src/scene/CoinDrip.tsx src/scene/CoinPile.tsx
git commit -m "feat(scene): coin drip and coin pile"
```

---

### Task 8：舞台用純函式

**Files:**
- Create: `src/scene/layout/stages.ts`
- Test: `src/scene/layout/stages.test.ts`

**Interfaces:**
- Consumes: `exDividend`、`simulateDistribution`、`PeriodState`（sim）；`stackVoxels`、`voxelPosition`、`explodeOffsetY`、`Voxel`（voxels）；`Vec3`（camera）
- Produces:
  - `VALUE_PER_BLOCK = 2`；`blocksFor(value: number, perBlock?: number): number`；`towerVoxels(count: number, w?: number, d?: number): Voxel[]`
  - `type ExDivOutcome = 'fill' | 'gap'`；`exDivTimeline(phase: number, outcome: ExDivOutcome): { blockValue: number; cash: number }`
  - `ACCUMULATE_DEMO`、`accumulateVsPayout(periods: number): { accumulate: PeriodState; payout: PeriodState }`
  - `TRAP_DEMO`、`principalTrap(periods: number): PeriodState`
  - `illustrativeTicks(seed: number, n: number, start?: number, vol?: number): number[]`
  - `layerCentroid(voxels: Voxel[], group: number, w: number, d: number, t: number, groups: number): Vec3 | null`
  - `damageFromShocks(shocks: Readonly<Record<string, number>>): Record<string, number>`（只取負的衝擊，轉成打掉比例）

示意參數（畫面須標「示意」）：
- 除息：價格 100、股利 5；填息回到 100；貼息落到 92。
- 累積對照配息：本金 100、每年產出 4%、價格每年 +3%、配息型每年配 4%。
- 示意高配息基金：本金 100、每年產出 3%、價格不變、每年配 6%。

- [ ] **Step 1：撰寫失敗的測試 `src/scene/layout/stages.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  blocksFor, towerVoxels, exDivTimeline, accumulateVsPayout, principalTrap,
  illustrativeTicks, layerCentroid, damageFromShocks,
} from './stages'
import { stackVoxels } from './voxels'

describe('blocks', () => {
  it('converts value to blocks (2 per block) and builds a tower', () => {
    expect(blocksFor(100)).toBe(50)
    expect(blocksFor(97)).toBe(49) // 48.5 → 49
    expect(towerVoxels(30, 5, 5)).toHaveLength(30)
    expect(() => blocksFor(-1)).toThrow(RangeError)
  })
})

describe('exDivTimeline', () => {
  it('pays out at phase 0.5 and conserves value at that moment', () => {
    expect(exDivTimeline(0.25, 'fill')).toEqual({ blockValue: 100, cash: 0 })
    expect(exDivTimeline(0.5, 'fill')).toEqual({ blockValue: 95, cash: 5 })
  })

  it('fills back to 100 or gaps down to 92 by phase 1', () => {
    expect(exDivTimeline(0.75, 'fill').blockValue).toBeCloseTo(97.5)
    expect(exDivTimeline(1, 'fill')).toEqual({ blockValue: 100, cash: 5 })
    expect(exDivTimeline(1, 'gap')).toEqual({ blockValue: 92, cash: 5 })
  })

  it('clamps phase into [0, 1]', () => {
    expect(exDivTimeline(-1, 'fill')).toEqual({ blockValue: 100, cash: 0 })
    expect(exDivTimeline(2, 'gap')).toEqual({ blockValue: 92, cash: 5 })
  })
})

describe('accumulateVsPayout (illustrative)', () => {
  it('starts equal', () => {
    const r = accumulateVsPayout(0)
    expect(r.accumulate.value).toBe(100)
    expect(r.payout.total).toBe(100)
  })

  it('compounds faster when income is reinvested', () => {
    const r = accumulateVsPayout(10)
    expect(r.accumulate.value).toBeCloseTo(196.715, 2) // 100 × 1.07^10
    expect(r.payout.value).toBeCloseTo(134.392, 2) // 100 × 1.03^10
    expect(r.payout.cashReceived).toBeCloseTo(45.856, 2) // 4 × (1.03^10 − 1) / 0.03
    expect(r.payout.total).toBeLessThan(r.accumulate.value)
  })
})

describe('principalTrap (illustrative)', () => {
  it('pays 6% while earning 3%, shrinking the tower', () => {
    const one = principalTrap(1)
    expect(one.value).toBeCloseTo(97)
    expect(one.cashReceived).toBeCloseTo(6)
    expect(one.fromPrincipal).toBeCloseTo(3)
    const ten = principalTrap(10)
    expect(ten.value).toBeCloseTo(73.742, 2) // 100 × 0.97^10
    expect(ten.cashReceived).toBeCloseTo(52.515, 2) // 6 × (1 − 0.97^10) / 0.03
    expect(ten.fromPrincipal).toBeCloseTo(26.258, 2)
  })
})

describe('illustrativeTicks', () => {
  it('is deterministic, positive and the right length', () => {
    const a = illustrativeTicks(50, 100)
    expect(a).toEqual(illustrativeTicks(50, 100))
    expect(a).toHaveLength(100)
    expect(a[0]).toBe(100)
    expect(Math.min(...a)).toBeGreaterThan(0)
    expect(illustrativeTicks(51, 100)).not.toEqual(a)
  })
})

describe('layerCentroid', () => {
  const v = stackVoxels([{ id: 'a', count: 4 }, { id: 'b', count: 4 }], 2, 2)

  it('averages a group, including the explode offset', () => {
    expect(layerCentroid(v, 0, 2, 2, 0, 2)).toEqual([0, 0.5, 0])
    const c = layerCentroid(v, 1, 2, 2, 1, 2)!
    expect(c[1]).toBeCloseTo(1.5 + 1.5) // y 1.5 + group 1 × gap 1.5
  })

  it('returns null for an empty group', () => {
    expect(layerCentroid(v, 5, 2, 2, 0, 2)).toBeNull()
  })
})

describe('damageFromShocks', () => {
  it('turns negative shocks into knock-out fractions and ignores gains', () => {
    expect(damageFromShocks({ '2330': -0.3, NVDA: 0.2 })).toEqual({ '2330': 0.3 })
    expect(damageFromShocks({ X: -1.5 })).toEqual({ X: 1 })
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout/stages.test.ts`
Expected：FAIL。

- [ ] **Step 3：實作 `src/scene/layout/stages.ts`**

```ts
import { exDividend, simulateDistribution, type PeriodState } from '../../sim/dividend'
import type { Vec3 } from '../camera'
import { explodeOffsetY, stackVoxels, voxelPosition, type Voxel } from './voxels'

export const VALUE_PER_BLOCK = 2

export function blocksFor(value: number, perBlock = VALUE_PER_BLOCK): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`value must be a non-negative number: ${value}`)
  return Math.round(value / perBlock)
}

export function towerVoxels(count: number, w = 5, d = 5): Voxel[] {
  return stackVoxels([{ id: 'tower', count }], w, d)
}

export type ExDivOutcome = 'fill' | 'gap'
const EXDIV = { price: 100, dividend: 5, gapTo: 92 } // 示意

/** 時間軸 0～1：0.5 配發（除息），之後線性填息到 100 或貼息到 92 */
export function exDivTimeline(phase: number, outcome: ExDivOutcome): { blockValue: number; cash: number } {
  const t = Math.min(1, Math.max(0, phase))
  if (t < 0.5) return { blockValue: EXDIV.price, cash: 0 }
  const after = exDividend(EXDIV.price, EXDIV.dividend)
  const end = outcome === 'fill' ? EXDIV.price : EXDIV.gapTo
  const s = (t - 0.5) / 0.5
  return { blockValue: after.price + (end - after.price) * s, cash: after.cash }
}

/** 示意：本金 100、每年產出 4%、價格每年 +3%、配息型每年配 4% */
export const ACCUMULATE_DEMO = { initialValue: 100, incomeYield: 0.04, priceReturn: 0.03, payoutRate: 0.04 } as const

export function accumulateVsPayout(periods: number): { accumulate: PeriodState; payout: PeriodState } {
  const acc = simulateDistribution({ ...ACCUMULATE_DEMO, periods, mode: 'accumulate' })
  const pay = simulateDistribution({ ...ACCUMULATE_DEMO, periods, mode: 'payout' })
  return { accumulate: acc[acc.length - 1]!, payout: pay[pay.length - 1]! }
}

/** 示意高配息基金：產出 3%、價格不變、每年配 6%（不代表任何真實商品） */
export const TRAP_DEMO = { initialValue: 100, incomeYield: 0.03, priceReturn: 0, payoutRate: 0.06 } as const

export function principalTrap(periods: number): PeriodState {
  const s = simulateDistribution({ ...TRAP_DEMO, periods, mode: 'payout' })
  return s[s.length - 1]!
}

/** 示意價格跳動：固定種子的隨機漫步（mulberry32），只用於畫面 */
export function illustrativeTicks(seed: number, n: number, start = 100, vol = 0.004): number[] {
  let a = seed >>> 0
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [start]
  for (let i = 1; i < n; i++) out.push(out[i - 1]! * (1 + (rand() - 0.5) * 2 * vol))
  return out
}

/** 某一組方塊的中心（籃子的相對座標，含拆開位移） */
export function layerCentroid(voxels: Voxel[], group: number, w: number, d: number, t: number, groups: number): Vec3 | null {
  let n = 0
  const sum: Vec3 = [0, 0, 0]
  for (const v of voxels) {
    if (v.group !== group) continue
    const [x, y, z] = voxelPosition(v, w, d)
    sum[0] += x
    sum[1] += y + explodeOffsetY(group, t, groups)
    sum[2] += z
    n++
  }
  return n === 0 ? null : [sum[0] / n, sum[1] / n, sum[2] / n]
}

/** 假設情境的跌幅 → 方塊打掉比例（只取下跌，最多 1） */
export function damageFromShocks(shocks: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, s] of Object.entries(shocks)) if (s < 0) out[id] = Math.min(1, -s)
  return out
}
```

- [ ] **Step 4：執行測試**

Run: `npx vitest run src/scene/layout/stages.test.ts && npx tsc --noEmit`
Expected：PASS。若某個手算數字與程式不符，先重算（公式寫在註解），確認是哪一邊錯，不可直接貼程式輸出。

- [ ] **Step 5：Commit**

```bash
git add src/scene/layout/stages.ts src/scene/layout/stages.test.ts
git commit -m "feat(scene): pure helpers for teaching stages"
```

---

### Task 9：三道門比賽與台股交易成本

**Files:**
- Create: `src/data/trading.ts`, `src/sim/feeRace.ts`
- Modify: `docs/data-sources.md`
- Test: `src/sim/feeRace.test.ts`

**Interfaces:**
- Consumes: `profileFromFees`、`valueAfter`、`firstYearAhead`、`FeeProfile`（fees）；`isVerified`；`universe`
- Produces:
  - `TW_TRADING: { brokerFee: number; etfSellCost: number; asOf: string; source: string[]; verified: { brokerFee: boolean; etfSellCost: boolean } }`
  - `FEE_RACE = { fund, backClass, etf }`（ids）
  - `type FeePart = 'frontLoad' | 'expenseRatio' | 'distributionFee' | 'cdsc' | 'trading'`
  - `type FeeRaceRow = { id: 'front' | 'back' | 'etf'; value: number; lost: number; unverified: FeePart[] }`
  - `feeRaceProfiles(u, frontLoad): { front: FeeProfile; back: FeeProfile; etf: FeeProfile }`
  - `feeRace(u: Universe, years: number, frontLoad: number): FeeRaceRow[]`（投入 100、毛報酬 0，只比費用）
  - `feeRaceLeader(rows: FeeRaceRow[]): FeeRaceRow['id']`

- [ ] **Step 1：查證台股交易成本**

用網路搜尋（ToolSearch `select:WebSearch,WebFetch`）向證交所、券商公會或財政部等官方來源查證：
1. 券商手續費上限 0.1425%（買賣各收一次）。
2. ETF 賣出時的證券交易稅率 0.1%。

查得到就記錄網址與查證日，`verified` 設 `true`；查不到維持數字但 `verified: false`，並在 `docs/data-sources.md` 記「查無」。**不可猜**。介面上只稱「交易成本」。

- [ ] **Step 2：建立 `src/data/trading.ts`**

```ts
/**
 * 台股交易成本（教學用）。本專案不談稅：證券交易稅只當作「賣出時的交易成本」。
 * 券商手續費為法定上限，實務上常有折扣。
 */
export const TW_TRADING = {
  brokerFee: 0.001425,
  etfSellCost: 0.001,
  asOf: '2026-10-03',
  source: [] as string[], // Step 1 查證後填入
  verified: { brokerFee: false, etfSellCost: false },
}
```
（依 Step 1 的結果更新 `source` 與 `verified`。）

- [ ] **Step 3：撰寫失敗的測試 `src/sim/feeRace.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { feeRace, feeRaceLeader, feeRaceProfiles } from './feeRace'

const row = (years: number, id: 'front' | 'back' | 'etf', fl = 0.015) => feeRace(universe, years, fl).find((r) => r.id === id)!

describe('feeRace', () => {
  it('selling within the first year: front pays its load, back pays the year-1 CDSC', () => {
    expect(row(0, 'front').value).toBeCloseTo(98.5, 3) // 100 × (1 − 0.015)
    expect(row(0, 'back').value).toBeCloseTo(97, 3) // 100 × (1 − 0.03)
    // ETF：買 0.1425%，賣 1 − (1 − 0.001425)(1 − 0.001)
    expect(row(0, 'etf').value).toBeCloseTo(99.6155, 3)
  })

  it('after 3 years: back-load has paid 3 years of distribution fee but no CDSC', () => {
    expect(row(3, 'front').value).toBeCloseTo(95.2851, 3) // 98.5 × 0.989^3
    expect(row(3, 'back').value).toBeCloseTo(93.863, 2) // 0.989^3 × 0.99^3
    expect(row(3, 'front').lost).toBeCloseTo(100 - 95.2851, 3)
  })

  it('a higher assumed front load flips the comparison', () => {
    expect(row(1, 'front', 0.03).value).toBeLessThan(row(1, 'back', 0.03).value) // 97 × 0.989 = 95.93 < 95.95
    expect(row(1, 'front', 0.015).value).toBeGreaterThan(row(1, 'back', 0.015).value)
  })

  it('marks the assumed front load and unverified parts', () => {
    expect(row(1, 'front').unverified).toContain('frontLoad')
    expect(row(1, 'back').unverified).toContain('expenseRatio') // U 級別經理費待驗證
    expect(row(1, 'back').unverified).not.toContain('cdsc')
  })

  it('picks the leader by remaining value', () => {
    expect(feeRaceLeader(feeRace(universe, 3, 0.015))).toBe('etf')
  })

  it('builds the profiles from data', () => {
    const p = feeRaceProfiles(universe, 0.02)
    expect(p.front.entry).toBeCloseTo(0.02)
    expect(p.back.exitByYear).toHaveLength(3)
    ;[0.03, 0.02, 0.01].forEach((c, i) => expect(p.back.exitByYear[i]).toBeCloseTo(c))
  })
})
```

- [ ] **Step 4：執行測試，確認失敗**

Run: `npx vitest run src/sim/feeRace.test.ts`
Expected：FAIL。

- [ ] **Step 5：實作 `src/sim/feeRace.ts`**

```ts
import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { TW_TRADING } from '../data/trading'
import { profileFromFees, valueAfter, type FeeProfile } from './fees'

/** 同一檔施羅德債券基金的前收型（手續費為假設）、後收 U 級別，以及 0050 */
export const FEE_RACE = {
  fund: 'SCHRODER_GLOBAL_INCOME_BOND',
  backClass: 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD',
  etf: '0050',
} as const

export type FeePart = 'frontLoad' | 'expenseRatio' | 'distributionFee' | 'cdsc' | 'trading'
export type FeeRaceRow = { id: 'front' | 'back' | 'etf'; value: number; lost: number; unverified: FeePart[] }

const need = (u: Universe, id: string) => {
  const a = u.get(id)
  if (!a) throw new Error(`unknown asset ${id}`)
  return a
}

const combine = (x: number, y: number) => 1 - (1 - x) * (1 - y)

export function feeRaceProfiles(u: Universe, frontLoad: number): { front: FeeProfile; back: FeeProfile; etf: FeeProfile } {
  const fund = need(u, FEE_RACE.fund)
  const back = need(u, FEE_RACE.backClass)
  const etf = need(u, FEE_RACE.etf)
  return {
    front: profileFromFees({ ...fund.fees, frontLoad }),
    back: profileFromFees(back.fees),
    etf: profileFromFees(etf.fees, { buy: TW_TRADING.brokerFee, sell: combine(TW_TRADING.brokerFee, TW_TRADING.etfSellCost) }),
  }
}

/** 投入 100、毛報酬 0：只比費用。years 為持有年數（可為 0：一年內賣出） */
export function feeRace(u: Universe, years: number, frontLoad: number): FeeRaceRow[] {
  const p = feeRaceProfiles(u, frontLoad)
  const fund = need(u, FEE_RACE.fund)
  const back = need(u, FEE_RACE.backClass)
  const etf = need(u, FEE_RACE.etf)
  const row = (id: FeeRaceRow['id'], profile: FeeProfile, unverified: FeePart[]): FeeRaceRow => {
    const value = valueAfter(profile, years)
    return { id, value, lost: 100 - value, unverified }
  }
  const parts = (asset: typeof fund, keys: Exclude<FeePart, 'frontLoad' | 'trading'>[]) =>
    keys.filter((k) => !isVerified(asset, `fees.${k}` as const))
  return [
    row('front', p.front, ['frontLoad', ...parts(fund, ['expenseRatio'])]),
    row('back', p.back, parts(back, ['expenseRatio', 'distributionFee', 'cdsc'])),
    row('etf', p.etf, [
      ...parts(etf, ['expenseRatio']),
      ...(TW_TRADING.verified.brokerFee && TW_TRADING.verified.etfSellCost ? [] : (['trading'] as FeePart[])),
    ]),
  ]
}

export function feeRaceLeader(rows: FeeRaceRow[]): FeeRaceRow['id'] {
  return rows.reduce((best, r) => (r.value > best.value ? r : best)).id
}
```

- [ ] **Step 6：更新 `docs/data-sources.md`**

加兩列（券商手續費上限、ETF 賣出交易成本），記數值、狀態、來源、查證日。

- [ ] **Step 7：執行測試**

Run: `npx vitest run src/sim/feeRace.test.ts && npx tsc --noEmit && npm test`
Expected：PASS。若 Step 1 查證後常數改變，依新常數重算 ETF 的期望值（寫出公式），並在報告說明。

- [ ] **Step 8：Commit**

```bash
git add src/data/trading.ts src/sim/feeRace.ts src/sim/feeRace.test.ts docs/data-sources.md
git commit -m "feat(sim): fee race with assumed front load, real back-load class and 0050"
```

---

### Task 10：舞台元件 A（廣場、手上的方塊、債券、除息）

**Files:**
- Create: `src/scene/labelStyle.ts`, `src/scene/stage/plaza.ts`, `src/scene/stage/Plaza.tsx`, `src/scene/stage/VoxelColumn.tsx`, `src/scene/stage/HeldBlocks.tsx`, `src/scene/stage/BondShowcase.tsx`, `src/scene/stage/ExDividendStage.tsx`, `src/scene/stage/StageView.tsx`
- Modify: `src/scene/City.tsx`（改用 `labelStyle`）、`src/scene/Scene.tsx`、`src/ui/strings.ts`

**Interfaces:**
- Consumes: Task 4（`Stage`）、Task 6（`useTour`、`currentStep`）、Task 7（`CoinDrip`、`CoinPile`）、Task 8（`towerVoxels`、`exDivTimeline`、`blocksFor`）、`lookFor`、`BlockMaterial`、`VoxelInstances`、`useAfterFirstTick`
- Produces:
  - `labelStyle`（共用標籤樣式）
  - `EXCHANGE_POSITION: Vec3 = [0, 0, 14]`（移到 `stage/plaza.ts`）
  - `PLAZA: Vec3 = [0, 0, 30]`；`PLAZA_SIZE: [number, number] = [46, 18]`
  - 元件 `Plaza()`、`VoxelColumn({ count, look, position, w?, d?, quality })`、`HeldBlocks({ items, quality })`、`BondShowcase({ stressed, quality })`、`ExDividendStage({ outcome, quality })`
  - `StageView({ quality })`：依目前步驟的 `stage.kind` 切換（Task 11、12 會補上其餘種類）
  - strings：`T.stage.*`

- [ ] **Step 1：strings（加到 `T`）**

```ts
  stage: {
    held: '你手上的方塊',
    bonds: { stock: '股票方塊', gov: '國家債', corp: '公司債', hy: '高收益債' },
    rateNote: '利息快慢為示意',
    exdiv: { block: '方塊', coins: '金幣' },
    illustrativeTag: '（示意）',
  },
```

- [ ] **Step 2：建立 `src/scene/labelStyle.ts`，並讓 `City.tsx` 改用它**

```ts
import type { CSSProperties } from 'react'

/** drei <Html> 標籤的共用樣式；不攔截滑鼠 */
export const labelStyle: CSSProperties = {
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  fontSize: 12,
  padding: '1px 6px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  color: '#1f2933',
}
```
`City.tsx` 刪除自己的 `labelStyle` 常數，改 `import { labelStyle } from './labelStyle'`。

- [ ] **Step 3：建立 `src/scene/stage/plaza.ts` 與 `Plaza.tsx`**

```ts
import type { Vec3 } from '../camera'

/** 前方廣場：教學舞台都擺在這裡 */
export const PLAZA: Vec3 = [0, 0, 30]
export const PLAZA_SIZE: [number, number] = [46, 18]

export const atPlaza = (dx: number, dy = 0, dz = 0): Vec3 => [PLAZA[0] + dx, PLAZA[1] + dy, PLAZA[2] + dz]

/** 交易所櫃台的位置（從 Scene.tsx 移過來，避免舞台元件與 Scene 互相 import） */
export const EXCHANGE_POSITION: Vec3 = [0, 0, 14]
```
`Scene.tsx` 刪除自己的 `EXCHANGE_POSITION` 常數，改為 `import { EXCHANGE_POSITION } from './stage/plaza'`（若其他檔案從 `Scene` import 它，一併改成從 `./stage/plaza`）。

```tsx
import { PLAZA, PLAZA_SIZE } from './plaza'

export function Plaza() {
  return (
    <mesh position={[PLAZA[0], -0.25, PLAZA[2]]} receiveShadow>
      <boxGeometry args={[PLAZA_SIZE[0], 0.5, PLAZA_SIZE[1]]} />
      <meshStandardMaterial color="#f3efe6" />
    </mesh>
  )
}
```

- [ ] **Step 4：建立 `src/scene/stage/VoxelColumn.tsx`**

```tsx
import { useMemo } from 'react'
import type { Vec3 } from '../camera'
import type { BlockLook } from '../palette'
import type { Quality } from '../quality'
import { towerVoxels } from '../layout/stages'
import { VoxelInstances } from '../VoxelInstances'

/** 單色方塊柱（用方塊數表示金額） */
export function VoxelColumn({ count, look, position, w = 5, d = 5, quality }: { count: number; look: BlockLook; position: Vec3; w?: number; d?: number; quality: Quality }) {
  const voxels = useMemo(() => towerVoxels(count, w, d), [count, w, d])
  const looks = useMemo(() => [look], [look])
  if (count === 0) return null
  return (
    <group position={position}>
      <VoxelInstances voxels={voxels} looks={looks} w={w} d={d} explode={0} cut={null} highlightGroup={null} quality={quality} />
    </group>
  )
}
```

- [ ] **Step 5：建立 `src/scene/stage/HeldBlocks.tsx`**

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh } from 'three'
import { universe } from '../../data'
import type { HeldItem } from '../../tour/types'
import { T } from '../../ui/strings'
import { approach } from '../layout/voxels'
import { labelStyle } from '../labelStyle'
import { lookFor } from '../palette'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const SIZE = 2.4
const SPACING = 7
const TARGET_SCALE = { still: 1, up: 1.3, down: 0.7, shake: 1 } as const

function HeldBlock({ item, x }: { item: HeldItem; x: number }) {
  const ref = useRef<Mesh>(null)
  const ready = useAfterFirstTick()
  const asset = universe.get(item.assetId)!
  const look = lookFor(asset)
  useFrame(({ clock }, dt) => {
    const m = ref.current
    if (!m) return
    const s = approach(m.scale.x, TARGET_SCALE[item.motion], dt, 3)
    m.scale.setScalar(s)
    const amp = item.motion === 'shake' ? (item.amplitude ?? 0.15) : 0
    const t = clock.elapsedTime
    m.position.set(Math.sin(t * 9) * amp, (SIZE / 2) * s + Math.abs(Math.sin(t * 6.3)) * amp * 0.6, 0)
    m.rotation.z = Math.sin(t * 7.1) * amp * 0.15
  })
  return (
    <group position={atPlaza(x, 0, 0)}>
      <mesh ref={ref} castShadow>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
        <meshStandardMaterial color={look.color} emissive={item.motion === 'up' ? look.color : '#000000'} emissiveIntensity={item.motion === 'up' ? 0.25 : 0} />
      </mesh>
      {ready && (
        <Html position={[0, SIZE * 2, 0]} center style={labelStyle}>
          {asset.name}
          {item.motion !== 'still' && T.stage.illustrativeTag}
        </Html>
      )}
    </group>
  )
}

/** 「從大樓抽出一顆方塊放進口袋」 */
export function HeldBlocks({ items }: { items: HeldItem[] }) {
  const start = -((items.length - 1) * SPACING) / 2
  return (
    <>
      {items.map((it, i) => (
        <HeldBlock key={it.assetId} item={it} x={start + i * SPACING} />
      ))}
    </>
  )
}
```

- [ ] **Step 6：建立 `src/scene/stage/BondShowcase.tsx`**

```tsx
import { Html } from '@react-three/drei'
import { universe } from '../../data'
import type { Asset } from '../../data/schema'
import { T } from '../../ui/strings'
import type { Vec3 } from '../camera'
import { CoinDrip } from '../CoinDrip'
import { labelStyle } from '../labelStyle'
import { BlockMaterial } from '../materials'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const SIZE = 2.4
const CORP: Asset = { id: 'CORP_DEMO', name: '', type: 'corpBond', asOf: '2026-10-03', source: [] }

type Slot = { key: 'stock' | 'gov' | 'corp' | 'hy'; asset: Asset; x: number; rate: number }
const SLOTS: Slot[] = [
  { key: 'stock', asset: universe.get('2330')!, x: -13, rate: 0 },
  { key: 'gov', asset: universe.get('US_TREASURY')!, x: -4.5, rate: 0.5 }, // 示意
  { key: 'corp', asset: CORP, x: 4, rate: 0.9 }, // 示意
  { key: 'hy', asset: universe.get('US_HIGH_YIELD')!, x: 12.5, rate: 1.5 }, // 示意
]

/** 股票方塊 vs 三種借據：材質表示信用品質，金幣快慢表示利息（示意） */
export function BondShowcase({ stressed, quality }: { stressed: boolean; quality: Quality }) {
  const ready = useAfterFirstTick()
  return (
    <>
      {SLOTS.map((s) => {
        const look = lookFor(s.asset)
        const scaleY = stressed && s.key === 'stock' ? 0.45 : 1
        const tilt = stressed && s.key === 'hy' ? 0.25 : 0
        const top: Vec3 = atPlaza(s.x, SIZE * scaleY, 0)
        const pile: Vec3 = atPlaza(s.x + 2.4, 0.1, 0)
        const dripping = s.rate > 0 && !(stressed && s.key === 'hy')
        return (
          <group key={s.key}>
            <mesh position={atPlaza(s.x, (SIZE * scaleY) / 2, 0)} scale={[1, scaleY, 1]} rotation-z={tilt} castShadow>
              <boxGeometry args={[SIZE, SIZE, SIZE]} />
              {s.key === 'stock' ? (
                <meshStandardMaterial color={stressed ? '#c0392b' : look.color} />
              ) : (
                <BlockMaterial kind={look.kind} quality={quality} />
              )}
            </mesh>
            {s.key !== 'stock' && (
              <mesh position={atPlaza(s.x, SIZE / 2, 0)} rotation-z={tilt}>
                <boxGeometry args={[SIZE * 0.98, SIZE * 0.98, SIZE * 0.98]} />
                <meshBasicMaterial color={look.color} transparent opacity={stressed && s.key === 'hy' ? 0.15 : 0.35} />
              </mesh>
            )}
            {dripping && <CoinDrip from={top} to={pile} rate={s.rate} />}
            {ready && (
              <Html position={atPlaza(s.x, -0.2, 2.6)} center style={labelStyle}>
                {T.stage.bonds[s.key]}
                {s.key !== 'stock' && T.stage.illustrativeTag}
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}
```

- [ ] **Step 7：建立 `src/scene/stage/ExDividendStage.tsx`**

```tsx
import { Html } from '@react-three/drei'
import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { CoinDrip } from '../CoinDrip'
import { CoinPile } from '../CoinPile'
import { labelStyle } from '../labelStyle'
import { exDivTimeline, type ExDivOutcome } from '../layout/stages'
import { lookFor } from '../palette'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const BASE_EDGE = 4

/** 除息：方塊體積 ∝ 價值；金幣一枚 = 1（示意價格 100、股利 5） */
export function ExDividendStage({ outcome }: { outcome: ExDivOutcome }) {
  const phase = useTour((s) => s.values.phase)
  const ready = useAfterFirstTick()
  const st = exDivTimeline(phase, outcome)
  const edge = BASE_EDGE * Math.cbrt(st.blockValue / 100)
  const look = lookFor(universe.get('2330')!)
  const paying = phase >= 0.5 && phase < 0.62
  return (
    <>
      <mesh position={atPlaza(-4, edge / 2, 0)} castShadow>
        <boxGeometry args={[edge, edge, edge]} />
        <meshStandardMaterial color={look.color} />
      </mesh>
      <CoinPile count={Math.round(st.cash)} position={atPlaza(3, 0, 0)} />
      {paying && <CoinDrip from={atPlaza(-4, edge, 0)} to={atPlaza(3, 0.3, 0)} rate={6} fallTime={0.8} />}
      {ready && (
        <>
          <Html position={atPlaza(-4, -0.2, 3)} center style={labelStyle}>
            {T.stage.exdiv.block} {st.blockValue.toFixed(1)}
            {T.stage.illustrativeTag}
          </Html>
          <Html position={atPlaza(3.5, -0.2, 3)} center style={labelStyle}>
            {T.stage.exdiv.coins} {st.cash.toFixed(1)}
          </Html>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 8：建立 `src/scene/stage/StageView.tsx`**

```tsx
import { currentStep, useTour } from '../../store/tour'
import type { Stage } from '../../tour/types'
import type { Quality } from '../quality'
import { BondShowcase } from './BondShowcase'
import { ExDividendStage } from './ExDividendStage'
import { HeldBlocks } from './HeldBlocks'
import { Plaza } from './Plaza'

const NONE: Stage = { kind: 'none' }
const ON_PLAZA = new Set<Stage['kind']>(['held', 'exdiv', 'bonds', 'feeRace', 'accumulate', 'principalTrap', 'shock', 'overlap'])

/** 依目前步驟顯示教學視覺；沙盒模式不顯示 */
export function StageView({ quality }: { quality: Quality }) {
  const stage = useTour((s) => (s.mode === 'tour' ? (currentStep(s).scene.stage ?? NONE) : NONE))
  return (
    <>
      {ON_PLAZA.has(stage.kind) && <Plaza />}
      {stage.kind === 'held' && <HeldBlocks items={stage.items} />}
      {stage.kind === 'bonds' && <BondShowcase stressed={stage.stressed} quality={quality} />}
      {stage.kind === 'exdiv' && <ExDividendStage outcome={stage.outcome} />}
    </>
  )
}
```

- [ ] **Step 9：在 `Scene.tsx` 掛上 `StageView`**

import `StageView`，在 `<Pedestal />` 之後加入 `<StageView quality={quality} />`。

- [ ] **Step 10：測試、建置、截圖**

Run: `npx tsc --noEmit && npm test && npm run build`
截圖（等待 3500ms 讓鏡頭到位）並 Read：
- `/?level=1&step=0`（手上的台積電方塊）、`/?level=1&step=3`（台積電小晃、特斯拉大晃）、`/?level=1&step=5`（除息後：方塊較小、5 枚金幣，標籤「方塊 100.0」）
- `/?level=2&step=1`（三種借據材質不同、金幣以不同速度滴落）、`/?level=2&step=2`（股票方塊縮水變紅、高收益債傾斜變淡、不再滴金幣）

不符就修正後重拍。

- [ ] **Step 11：Commit**

```bash
git add src/scene/labelStyle.ts src/scene/City.tsx src/scene/stage src/scene/Scene.tsx src/ui/strings.ts
git commit -m "feat(stage): plaza, held blocks, bond showcase and ex-dividend"
```

---

### Task 11：舞台元件 B（費用比賽、累積對照配息、配息陷阱、怪手與計費表、即時價格）

**Files:**
- Create: `src/scene/stage/TowerRow.tsx`, `src/scene/stage/FeeRaceStage.tsx`, `src/scene/stage/AccumulateStage.tsx`, `src/scene/stage/PrincipalTrapStage.tsx`, `src/scene/stage/Excavator.tsx`, `src/scene/stage/FeeMeter.tsx`, `src/scene/stage/PriceTicker.tsx`
- Modify: `src/scene/stage/StageView.tsx`, `src/ui/strings.ts`

**Interfaces:**
- Consumes: Task 8（`blocksFor`、`accumulateVsPayout`、`principalTrap`、`illustrativeTicks`）、Task 9（`feeRace`）、`VoxelColumn`、`CoinPile`、`EXCHANGE_POSITION`
- Produces:
  - `type TowerSpec = { key: string; label: string; value: number; lost?: number; coins?: number; color: string; unverified?: boolean }`
  - 元件 `TowerRow({ towers, quality })`、`FeeRaceStage({ quality })`、`AccumulateStage({ quality })`、`PrincipalTrapStage({ quality })`、`Excavator()`、`FeeMeter()`、`PriceTicker()`
  - strings：`T.towers.*`、`T.feeMeter.*`、`T.ticker.*`、`T.feeRows.*`

- [ ] **Step 1：strings（加到 `T`）**

```ts
  towers: { lost: '被費用吃掉', value: (v: number) => `${v.toFixed(1)} 元` },
  feeRows: {
    front: (fl: number) => `前收型（假設 ${(fl * 100).toFixed(2)}%）`,
    back: '後收型（U 級別）',
    etf: 'ETF（0050）',
  },
  accumulateRows: { accumulate: '累積型', payout: '配息型' },
  trapRow: '示意高配息基金',
  excavator: '經理人（怪手）',
  feeMeter: {
    title: '計費表',
    rate: (er: number) => `內扣費用每年約 ${(er * 100).toFixed(2)}%`,
    ground: (amount: number) => `已磨掉約 ${Math.round(amount).toLocaleString('zh-TW')} 元`,
    note: '假設投入 100 萬元、時間快轉（6 秒 = 1 年）',
  },
  ticker: { etf: '成交價（示意）', fund: '基金淨值：每天收盤後才公布一次' },
```

- [ ] **Step 2：建立 `src/scene/stage/TowerRow.tsx`**

```tsx
import { Html } from '@react-three/drei'
import { T } from '../../ui/strings'
import { CoinPile } from '../CoinPile'
import { labelStyle } from '../labelStyle'
import { blocksFor } from '../layout/stages'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

export type TowerSpec = { key: string; label: string; value: number; lost?: number; coins?: number; color: string; unverified?: boolean }

const SPACING = 14
const LOST = { color: '#e53935', kind: 'matte' as const }

/** 一排方塊塔：塔＝剩下的價值；紅色小堆＝被費用吃掉；金幣堆＝領到的錢（皆 2 元一顆） */
export function TowerRow({ towers, quality }: { towers: TowerSpec[]; quality: Quality }) {
  const ready = useAfterFirstTick()
  const start = -((towers.length - 1) * SPACING) / 2
  return (
    <>
      {towers.map((t, i) => {
        const x = start + i * SPACING
        return (
          <group key={t.key}>
            <VoxelColumn count={blocksFor(t.value)} look={{ color: t.color, kind: 'matte' }} position={atPlaza(x, 0, 0)} quality={quality} />
            {t.lost !== undefined && t.lost > 0 && (
              <VoxelColumn count={blocksFor(t.lost)} look={LOST} position={atPlaza(x + 4.5, 0, 0)} w={3} d={3} quality={quality} />
            )}
            {t.coins !== undefined && <CoinPile count={blocksFor(t.coins)} position={atPlaza(x - 5.5, 0, 0)} />}
            {ready && (
              <Html position={atPlaza(x, -0.2, 4.2)} center style={labelStyle}>
                {t.label}：{T.towers.value(t.value)}
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}
```

- [ ] **Step 3：建立三個塔型舞台**

`FeeRaceStage.tsx`：
```tsx
import { universe } from '../../data'
import { useTour } from '../../store/tour'
import { feeRace } from '../../sim/feeRace'
import { T } from '../../ui/strings'
import type { Quality } from '../quality'
import { TowerRow, type TowerSpec } from './TowerRow'

const COLORS = { front: '#5c6bc0', back: '#8a5cf6', etf: '#2bb3a3' } as const

export function FeeRaceStage({ quality }: { quality: Quality }) {
  const years = useTour((s) => s.values.years)
  const frontLoad = useTour((s) => s.values.frontLoad)
  const towers: TowerSpec[] = feeRace(universe, years, frontLoad).map((r) => ({
    key: r.id,
    label: r.id === 'front' ? T.feeRows.front(frontLoad) : T.feeRows[r.id],
    value: r.value,
    lost: r.lost,
    color: COLORS[r.id],
    unverified: r.unverified.length > 0,
  }))
  return <TowerRow towers={towers} quality={quality} />
}
```

`AccumulateStage.tsx`：
```tsx
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { accumulateVsPayout } from '../layout/stages'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function AccumulateStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const r = accumulateVsPayout(periods)
  return (
    <TowerRow
      quality={quality}
      towers={[
        { key: 'acc', label: T.accumulateRows.accumulate, value: r.accumulate.value, color: '#2bb3a3' },
        { key: 'pay', label: T.accumulateRows.payout, value: r.payout.value, coins: r.payout.cashReceived, color: '#5c6bc0' },
      ]}
    />
  )
}
```

`PrincipalTrapStage.tsx`：
```tsx
import { useTour } from '../../store/tour'
import { T } from '../../ui/strings'
import { principalTrap } from '../layout/stages'
import type { Quality } from '../quality'
import { TowerRow } from './TowerRow'

export function PrincipalTrapStage({ quality }: { quality: Quality }) {
  const periods = useTour((s) => s.values.periods)
  const st = principalTrap(periods)
  return <TowerRow quality={quality} towers={[{ key: 'trap', label: T.trapRow, value: st.value, coins: st.cashReceived, color: '#ff8a3d' }]} />
}
```

- [ ] **Step 4：建立 `Excavator.tsx`**

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { T } from '../../ui/strings'
import { labelStyle } from '../labelStyle'
import { EXCHANGE_POSITION } from './plaza'
import { useAfterFirstTick } from '../useAfterFirstTick'

/** 方塊組成的小怪手（經理人），手臂來回擺動 */
export function Excavator() {
  const arm = useRef<Group>(null)
  const ready = useAfterFirstTick()
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.z = -0.5 + Math.sin(clock.elapsedTime * 1.4) * 0.35
  })
  const [x, , z] = EXCHANGE_POSITION
  return (
    <group position={[x - 10, 0, z + 1]} rotation-y={0.4}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[3.2, 1, 2.2]} />
        <meshStandardMaterial color="#37474f" />
      </mesh>
      <mesh position={[-0.3, 1.8, 0]} castShadow>
        <boxGeometry args={[1.8, 1.6, 1.8]} />
        <meshStandardMaterial color="#f9a825" />
      </mesh>
      <group ref={arm} position={[0.6, 2.4, 0]}>
        <mesh position={[1.8, 0, 0]} castShadow>
          <boxGeometry args={[3.6, 0.5, 0.6]} />
          <meshStandardMaterial color="#f9a825" />
        </mesh>
        <mesh position={[3.7, -0.6, 0]} castShadow>
          <boxGeometry args={[0.9, 0.9, 1]} />
          <meshStandardMaterial color="#455a64" />
        </mesh>
      </group>
      {ready && (
        <Html position={[0, 4.2, 0]} center style={labelStyle}>
          {T.excavator}
        </Html>
      )}
    </group>
  )
}
```

- [ ] **Step 5：建立 `FeeMeter.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { isVerified, universe } from '../../data'
import { useSandbox } from '../../store/sandbox'
import { T } from '../../ui/strings'
import { labelStyle } from '../labelStyle'
import { EXCHANGE_POSITION } from './plaza'
import { useAfterFirstTick } from '../useAfterFirstTick'

const SECONDS_PER_YEAR = 6
const PRINCIPAL = 1_000_000

/** 塔上的計費表：時間快轉，顯示內扣費用累計磨掉的金額 */
export function FeeMeter() {
  const productId = useSandbox((s) => s.productId)
  const ready = useAfterFirstTick()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = setInterval(() => setElapsed((performance.now() - start) / 1000), 200)
    return () => clearInterval(id)
  }, [productId])
  const product = productId ? universe.get(productId) : undefined
  const er = product?.fees?.expenseRatio
  if (!ready || !product || er === undefined) return null
  const years = elapsed / SECONDS_PER_YEAR
  const ground = PRINCIPAL * (1 - Math.pow(1 - er, years))
  const [x, , z] = EXCHANGE_POSITION
  return (
    <Html position={[x, 13, z]} center style={{ ...labelStyle, whiteSpace: 'normal', width: 220, textAlign: 'center', lineHeight: 1.5 }}>
      <strong>{T.feeMeter.title}</strong>
      <br />
      {T.feeMeter.rate(er)} {!isVerified(product, 'fees.expenseRatio') && <span className="badge">{T.unverified}</span>}
      <br />
      {T.feeMeter.ground(ground)}
      <br />
      <small>{T.feeMeter.note}</small>
    </Html>
  )
}
```

- [ ] **Step 6：建立 `PriceTicker.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import { T } from '../../ui/strings'
import { labelStyle } from '../labelStyle'
import { illustrativeTicks } from '../layout/stages'
import { EXCHANGE_POSITION } from './plaza'
import { useAfterFirstTick } from '../useAfterFirstTick'

const TICKS = illustrativeTicks(50, 600)

/** 交易所櫃台上的示意成交價（每秒跳動）與基金淨值說明 */
export function PriceTicker() {
  const ready = useAfterFirstTick()
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TICKS.length), 1000)
    return () => clearInterval(id)
  }, [])
  if (!ready) return null
  const p = TICKS[i]!
  const up = i > 0 && p >= TICKS[i - 1]!
  const [x, , z] = EXCHANGE_POSITION
  return (
    <Html position={[x, 13, z]} center style={{ ...labelStyle, fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
      {T.ticker.etf} <strong style={{ color: up ? '#c62828' : '#2e7d32' }}>{p.toFixed(2)}</strong>
      <br />
      <small>{T.ticker.fund}</small>
    </Html>
  )
}
```
（台灣慣例：漲紅跌綠。）

- [ ] **Step 7：`StageView` 加入新種類**

```tsx
      {stage.kind === 'feeRace' && <FeeRaceStage quality={quality} />}
      {stage.kind === 'accumulate' && <AccumulateStage quality={quality} />}
      {stage.kind === 'principalTrap' && <PrincipalTrapStage quality={quality} />}
      {stage.kind === 'excavator' && <Excavator />}
      {stage.kind === 'excavator' && stage.meter && <FeeMeter />}
      {stage.kind === 'ticker' && <PriceTicker />}
```
（並 import 對應元件。）

- [ ] **Step 8：測試、建置、截圖**

Run: `npx tsc --noEmit && npm test && npm run build`
截圖（等待 3500ms）並 Read：
- `/?level=3&step=0`（怪手在小塔旁、手臂擺動）、`/?level=3&step=4`（計費表數字在跑、標示假設與快轉）
- `/?level=3&step=6`（三座塔：前收、後收、ETF，旁邊紅色小堆，0050 紅堆最小）
- `/?level=3&step=7`（累積型、配息型兩塔；配息型旁有金幣堆）
- `/?level=3&step=8`（示意高配息基金塔與金幣堆）
- `/?level=4&step=3`（0050 上方的示意成交價與淨值說明）

另寫 scratch Playwright 腳本：在 `/?level=3&step=6` 把持有年數拉到 10、在 `/?level=3&step=7` 把經過年數拉到 20，各截一張，確認塔高與紅堆／金幣堆隨拉桿變化。

- [ ] **Step 9：Commit**

```bash
git add src/scene/stage src/ui/strings.ts
git commit -m "feat(stage): fee race, accumulate vs payout, payout trap, excavator, fee meter, ticker"
```

---

### Task 12：舞台元件 C（崩落情境、重疊連線、城市配合）

**Files:**
- Create: `src/scene/stage/ShockStage.tsx`, `src/scene/stage/OverlapStage.tsx`
- Modify: `src/scene/layout/city.ts`, `src/scene/City.tsx`, `src/scene/Scene.tsx`, `src/scene/stage/StageView.tsx`, `src/ui/strings.ts`
- Test: `src/scene/layout/city.test.ts`

**Interfaces:**
- Consumes: `Basket`（Task 3）、`damageFromShocks`、`layerCentroid`（Task 8）、`SHOCK_2330`（Task 5）、`overlap`（sim）、`basketSpec`、`basketVoxels`、drei `<Line>`
- Produces:
  - `applyShrink(placements: Placement[], shrink: Readonly<Record<string, number>>): Placement[]`（高度乘以 `1 − f`，至少 1 層）
  - `City` 新 props：`labels: boolean`、`shrink?: Readonly<Record<string, number>>`
  - 元件 `ShockStage({ active, quality })`、`OverlapStage({ a, b, quality })`
  - strings：`T.shock.*`、`T.overlapLabel`

- [ ] **Step 1：撰寫失敗的測試（`city.test.ts`）**

```ts
describe('applyShrink', () => {
  const ps = [
    { id: '2330', region: 'TW' as const, x: 0, z: 0, height: 16 },
    { id: 'NVDA', region: 'US' as const, x: 4, z: 0, height: 19 },
  ]

  it('shrinks only the listed buildings, rounding and keeping at least one layer', () => {
    const out = applyShrink(ps, { '2330': 0.3 })
    expect(out[0]!.height).toBe(11) // round(16 × 0.7) = round(11.2)
    expect(out[1]!.height).toBe(19)
    expect(applyShrink(ps, { '2330': 1 })[0]!.height).toBe(1)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout/city.test.ts`
Expected：FAIL。

- [ ] **Step 3：實作 `applyShrink`（加到 `city.ts`）**

```ts
/** 假設情境：大樓高度乘以 (1 − f)，至少保留 1 層 */
export function applyShrink(placements: Placement[], shrink: Readonly<Record<string, number>>): Placement[] {
  return placements.map((p) => {
    const f = shrink[p.id]
    return f === undefined ? p : { ...p, height: Math.max(1, Math.round(p.height * (1 - f))) }
  })
}
```

- [ ] **Step 4：`City` 支援 `labels` 與 `shrink`**

簽名改成 `export function City({ labels, shrink }: { labels: boolean; shrink?: Readonly<Record<string, number>> })`；`placements` 改成：
```ts
  const base = useMemo(() => cityLayout([...universe.values()]), [])
  const placements = useMemo(() => (shrink ? applyShrink(base, shrink) : base), [base, shrink])
```
`voxels` 依 `placements`；instancedMesh 加 `key={voxels.length}`（數量改變時重建）；大樓名稱標籤只在 `labels && ready` 時渲染（島名標籤一律顯示）。

- [ ] **Step 5：`Scene.tsx` 決定標籤與崩落**

```tsx
  const mode = useTour((s) => s.mode)
  const tourScene = useTour((s) => currentStep(s).scene)
  const explode = useSandbox(effectiveExplode)
  const labels = mode === 'tour' ? tourScene.cityLabels !== false : explode < 0.3
  const shrink = mode === 'tour' && tourScene.stage?.kind === 'shock' && tourScene.stage.active ? SHOCK_SHRINK : undefined
```
在檔案頂層定義 `const SHOCK_SHRINK = damageFromShocks(SHOCK_2330)`，並把 `<City />` 改成 `<City labels={labels} shrink={shrink} />`。

- [ ] **Step 6：strings（加到 `T`）**

```ts
  shock: { stock: '只買台積電', label: (name: string, pct: string) => `${name}：${pct}` },
  overlapLabel: (name: string, pct: string) => `${name} 重疊 ${pct}`,
```

- [ ] **Step 7：建立 `ShockStage.tsx`**

```tsx
import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { universe } from '../../data'
import { shockImpact } from '../../sim/scenario'
import { SHOCK_2330, signedPct } from '../../tour/context'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import { labelStyle } from '../labelStyle'
import { damageFromShocks } from '../layout/stages'
import { lookFor } from '../palette'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'
import { VoxelColumn } from './VoxelColumn'

const DAMAGE = damageFromShocks(SHOCK_2330)
const STOCK_BLOCKS = 40 // 2×2×10 的台積電柱
const SUBJECTS = [
  { key: 'stock', x: -16 },
  { key: '0050', x: 0 },
  { key: 'SPY', x: 15 },
] as const

/** 假設台積電下跌 30%：只買台積電、0050、SPY 並排比較 */
export function ShockStage({ active, quality }: { active: boolean; quality: Quality }) {
  const ready = useAfterFirstTick()
  const damage = useMemo(() => (active ? DAMAGE : undefined), [active])
  const look = lookFor(universe.get('2330')!)
  const stockCount = active ? Math.round(STOCK_BLOCKS * (1 - DAMAGE['2330']!)) : STOCK_BLOCKS
  return (
    <>
      <VoxelColumn count={stockCount} look={look} position={atPlaza(SUBJECTS[0].x, 0, 0)} w={2} d={2} quality={quality} />
      <Basket productId="0050" quality={quality} position={atPlaza(SUBJECTS[1].x, 0, 0)} slice={0} sliceAxis="x" explode={0} damage={damage} />
      <Basket productId="SPY" quality={quality} position={atPlaza(SUBJECTS[2].x, 0, 0)} slice={0} sliceAxis="x" explode={0} />
      {ready &&
        SUBJECTS.map((s) => {
          const name = s.key === 'stock' ? T.shock.stock : universe.get(s.key)!.name
          const pct = active ? signedPct(s.key === 'stock' ? SHOCK_2330['2330']! : shockImpact(universe, s.key, { ...SHOCK_2330 })) : ''
          return (
            <Html key={s.key} position={atPlaza(s.x, -0.2, 7)} center style={labelStyle}>
              {active ? T.shock.label(name, pct) : name}
            </Html>
          )
        })}
    </>
  )
}
```

- [ ] **Step 8：建立 `OverlapStage.tsx`**

```tsx
import { useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import { universe } from '../../data'
import { overlap } from '../../sim/overlap'
import { T } from '../../ui/strings'
import { Basket } from '../Basket'
import type { Vec3 } from '../camera'
import { labelStyle } from '../labelStyle'
import { basketSpec, basketVoxels } from '../layout/basket'
import { layerCentroid } from '../layout/stages'
import type { Quality } from '../quality'
import { useAfterFirstTick } from '../useAfterFirstTick'
import { atPlaza } from './plaza'

const XA = -9
const XB = 9

function centroidOf(productId: string, holdingId: string, quality: Quality, baseX: number): Vec3 | null {
  const p = universe.get(productId)!
  const group = p.holdings!.findIndex((h) => h.id === holdingId)
  const spec = basketSpec(universe, productId, quality)
  const c = layerCentroid(basketVoxels(universe, productId, spec), group, spec.w, spec.d, 1, p.holdings!.length)
  if (!c) return null
  const base = atPlaza(baseX, 0, 0)
  return [base[0] + c[0], base[1] + c[1], base[2] + c[2]]
}

/** 兩檔 ETF 一起拆開，發光線連起同一家公司的地層 */
export function OverlapStage({ a, b, quality }: { a: string; b: string; quality: Quality }) {
  const ready = useAfterFirstTick()
  const links = useMemo(
    () =>
      overlap(universe, a, b).rows.flatMap((r) => {
        const pa = centroidOf(a, r.id, quality, XA)
        const pb = centroidOf(b, r.id, quality, XB)
        return pa && pb ? [{ id: r.id, pa, pb, shared: r.shared }] : []
      }),
    [a, b, quality],
  )
  return (
    <>
      <Basket productId={a} quality={quality} position={atPlaza(XA, 0, 0)} slice={0} sliceAxis="x" explode={1} />
      <Basket productId={b} quality={quality} position={atPlaza(XB, 0, 0)} slice={0} sliceAxis="x" explode={1} />
      {links.map((l) => (
        <Line key={l.id} points={[l.pa, l.pb]} color="#ffd54f" lineWidth={4} transparent opacity={0.9} />
      ))}
      {ready &&
        links.map((l) => (
          <Html key={l.id} position={[(l.pa[0] + l.pb[0]) / 2, (l.pa[1] + l.pb[1]) / 2 + 0.6, (l.pa[2] + l.pb[2]) / 2]} center style={labelStyle}>
            {T.overlapLabel(universe.get(l.id)!.name, `${(l.shared * 100).toFixed(1)}%`)}
          </Html>
        ))}
    </>
  )
}
```

- [ ] **Step 9：`StageView` 加入**

```tsx
      {stage.kind === 'shock' && <ShockStage active={stage.active} quality={quality} />}
      {stage.kind === 'overlap' && <OverlapStage a={stage.a} b={stage.b} quality={quality} />}
```

- [ ] **Step 10：測試、建置、截圖**

Run: `npx tsc --noEmit && npm test && npm run build`
截圖（等待 3500ms）並 Read：
- `/?level=5&step=0`：台積電柱、0050、SPY 三者並排，標名稱
- `/?level=5&step=1`：台積電柱變矮、0050 的藍色地層頂端被打掉一截、SPY 不變；標籤顯示 −30.0%、約 −17.2%、0.0%；城市裡的台積電大樓變矮
- `/?level=5&step=2`：QQQ、SPY 都拆開，金色線連起輝達、蘋果、微軟、特斯拉的地層，線中間有名稱與重疊百分比；城市標籤隱藏
- `/?mode=sandbox&product=0050&explode=1`：沙盒拆開時城市大樓標籤隱藏

- [ ] **Step 11：Commit**

```bash
git add src/scene/layout/city.ts src/scene/layout/city.test.ts src/scene/City.tsx src/scene/Scene.tsx src/scene/stage src/ui/strings.ts
git commit -m "feat(stage): shock scenario and overlap lines; city labels and shrink follow the step"
```

---

### Task 13：即時數字面板與手機長按

**Files:**
- Create: `src/ui/readout.ts`, `src/ui/press.ts`, `src/scene/useLongPress.ts`
- Modify: `src/ui/TourPanel.tsx`, `src/ui/strings.ts`, `src/ui/ui.css`, `src/scene/VoxelInstances.tsx`, `src/scene/City.tsx`
- Test: `src/ui/readout.test.ts`, `src/ui/press.test.ts`

**Interfaces:**
- Consumes: 各舞台純函式、`feeRace`、`feeRaceLeader`、`overlap`、`shockImpact`、`SHOCK_2330`、`signedPct`、`isVerified`
- Produces:
  - `type ReadoutRow = { label: string; value: string; unverified?: boolean; note?: string }`
  - `stageReadout(stage: Stage, v: TourValues, u: Universe, productId: string | null): ReadoutRow[]`
  - `LONG_PRESS_MS = 450`、`MOVE_TOLERANCE_PX = 8`、`class PressTracker { start(x, y); move(x, y); end(); canFire(): boolean }`
  - `useLongPress(onLong: (e: ThreeEvent<PointerEvent>) => void)`：回傳 R3F pointer handlers（只對 `pointerType === 'touch'` 生效）

- [ ] **Step 1：strings（加到 `T`）**

```ts
  readout: {
    title: '即時數字',
    invested: '投入 100 元',
    block: '方塊價值',
    coins: '手上的金幣',
    total: '合計',
    remaining: (v: number) => `剩 ${v.toFixed(1)} 元`,
    leader: '目前最划算',
    accumulate: '累積型的塔',
    payoutTower: '配息型的塔',
    payoutCash: '配息型領到的金幣',
    payoutTotal: '配息型合計',
    trapValue: '塔的價值',
    trapCash: '已領的金幣',
    trapPrincipal: '其中來自本金',
    expenseRatio: '每年內扣費用',
    overlapTotal: '重疊合計',
    unverifiedParts: (parts: string) => `待驗證：${parts}`,
  },
  feeParts: { frontLoad: '前收手續費（假設）', expenseRatio: '經理費', distributionFee: '分銷費', cdsc: '遞延手續費', trading: '交易成本' },
```

- [ ] **Step 2：撰寫失敗的測試 `src/ui/readout.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { DEFAULT_VALUES } from '../tour/engine'
import { stageReadout } from './readout'

const v = (over: Partial<typeof DEFAULT_VALUES> = {}) => ({ ...DEFAULT_VALUES, slice: 0, explode: 0, ...over })

describe('stageReadout', () => {
  it('shows the conservation equation for ex-dividend', () => {
    const rows = stageReadout({ kind: 'exdiv', outcome: 'fill' }, v({ phase: 0.5 }), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['95.0', '5.0', '100.0'])
  })

  it('lists the fee race rows, unverified parts and the leader', () => {
    const rows = stageReadout({ kind: 'feeRace' }, v({ years: 3, frontLoad: 0.015 }), universe, null)
    expect(rows[0]!.label).toContain('假設 1.50%')
    expect(rows[0]!.unverified).toBe(true)
    expect(rows.at(-1)!.label).toBe('目前最划算')
    expect(rows.at(-1)!.value).toBe('ETF（0050）')
  })

  it('shows shock impacts only when active', () => {
    expect(stageReadout({ kind: 'shock', active: false }, v(), universe, null)).toEqual([])
    const rows = stageReadout({ kind: 'shock', active: true }, v(), universe, null)
    expect(rows.map((r) => r.value)).toEqual(['−30.0%', '−17.2%', '0.0%'])
  })

  it('lists overlap rows with the total', () => {
    const rows = stageReadout({ kind: 'overlap', a: 'QQQ', b: 'SPY' }, v(), universe, null)
    expect(rows[0]).toMatchObject({ label: '輝達', value: '8.3%' })
    expect(rows.at(-1)!.label).toBe('重疊合計')
  })

  it('shows the expense ratio for the fee meter and nothing for plain stages', () => {
    const rows = stageReadout({ kind: 'excavator', meter: true }, v(), universe, 'JH_BALANCED')
    expect(rows).toEqual([{ label: '每年內扣費用', value: '1.88%', unverified: false }])
    expect(stageReadout({ kind: 'ticker' }, v(), universe, '0050')).toEqual([])
  })

  it('shows accumulate and trap numbers', () => {
    const acc = stageReadout({ kind: 'accumulate' }, v({ periods: 10 }), universe, null)
    expect(acc[0]!.value).toBe('196.7')
    const trap = stageReadout({ kind: 'principalTrap' }, v({ periods: 10 }), universe, null)
    expect(trap.map((r) => r.value)).toEqual(['73.7', '52.5', '26.3'])
  })
})
```

- [ ] **Step 3：撰寫失敗的測試 `src/ui/press.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { PressTracker, MOVE_TOLERANCE_PX } from './press'

describe('PressTracker', () => {
  it('can fire after a still press', () => {
    const p = new PressTracker()
    p.start(10, 10)
    p.move(12, 13)
    expect(p.canFire()).toBe(true)
  })

  it('cancels when the finger moves too far or lifts', () => {
    const p = new PressTracker()
    p.start(0, 0)
    p.move(MOVE_TOLERANCE_PX + 1, 0)
    expect(p.canFire()).toBe(false)
    p.start(0, 0)
    p.end()
    expect(p.canFire()).toBe(false)
  })
})
```

- [ ] **Step 4：執行測試，確認失敗**

Run: `npx vitest run src/ui/readout.test.ts src/ui/press.test.ts`
Expected：FAIL。

- [ ] **Step 5：實作 `src/ui/readout.ts`**

```ts
import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { accumulateVsPayout, exDivTimeline, principalTrap } from '../scene/layout/stages'
import { feeRace, feeRaceLeader } from '../sim/feeRace'
import { overlap } from '../sim/overlap'
import { shockImpact } from '../sim/scenario'
import { SHOCK_2330, signedPct } from '../tour/context'
import type { Stage, TourValues } from '../tour/types'
import { T } from './strings'

export type ReadoutRow = { label: string; value: string; unverified?: boolean; note?: string }

const n1 = (x: number) => x.toFixed(1)

/** 每個舞台在面板上的即時數字（純函式，畫面與測試共用） */
export function stageReadout(stage: Stage, v: TourValues, u: Universe, productId: string | null): ReadoutRow[] {
  switch (stage.kind) {
    case 'exdiv': {
      const s = exDivTimeline(v.phase, stage.outcome)
      return [
        { label: T.readout.block, value: n1(s.blockValue) },
        { label: T.readout.coins, value: n1(s.cash) },
        { label: T.readout.total, value: n1(s.blockValue + s.cash) },
      ]
    }
    case 'feeRace': {
      const rows = feeRace(u, v.years, v.frontLoad)
      const label = (id: 'front' | 'back' | 'etf') => (id === 'front' ? T.feeRows.front(v.frontLoad) : T.feeRows[id])
      return [
        ...rows.map((r) => ({
          label: label(r.id),
          value: T.readout.remaining(r.value),
          unverified: r.unverified.length > 0,
          note: r.unverified.length ? T.readout.unverifiedParts(r.unverified.map((k) => T.feeParts[k]).join('、')) : undefined,
        })),
        { label: T.readout.leader, value: label(feeRaceLeader(rows)) },
      ]
    }
    case 'accumulate': {
      const r = accumulateVsPayout(v.periods)
      return [
        { label: T.readout.accumulate, value: n1(r.accumulate.value) },
        { label: T.readout.payoutTower, value: n1(r.payout.value) },
        { label: T.readout.payoutCash, value: n1(r.payout.cashReceived) },
        { label: T.readout.payoutTotal, value: n1(r.payout.total) },
      ]
    }
    case 'principalTrap': {
      const s = principalTrap(v.periods)
      return [
        { label: T.readout.trapValue, value: n1(s.value) },
        { label: T.readout.trapCash, value: n1(s.cashReceived) },
        { label: T.readout.trapPrincipal, value: n1(s.fromPrincipal) },
      ]
    }
    case 'shock':
      if (!stage.active) return []
      return [
        { label: T.shock.stock, value: signedPct(SHOCK_2330['2330']!) },
        { label: u.get('0050')!.name, value: signedPct(shockImpact(u, '0050', { ...SHOCK_2330 })) },
        { label: u.get('SPY')!.name, value: signedPct(shockImpact(u, 'SPY', { ...SHOCK_2330 })) },
      ]
    case 'overlap': {
      const o = overlap(u, stage.a, stage.b)
      return [
        ...o.rows.map((r) => ({ label: u.get(r.id)!.name, value: `${(r.shared * 100).toFixed(1)}%` })),
        { label: T.readout.overlapTotal, value: `${(o.total * 100).toFixed(1)}%` },
      ]
    }
    case 'excavator': {
      const p = productId ? u.get(productId) : undefined
      const er = p?.fees?.expenseRatio
      if (!stage.meter || !p || er === undefined) return []
      return [{ label: T.readout.expenseRatio, value: `${(er * 100).toFixed(2)}%`, unverified: !isVerified(p, 'fees.expenseRatio') }]
    }
    default:
      return []
  }
}
```

- [ ] **Step 6：實作 `src/ui/press.ts`**

```ts
export const LONG_PRESS_MS = 450
export const MOVE_TOLERANCE_PX = 8

/** 長按判斷：按下後移動不超過容許距離、且尚未放開 */
export class PressTracker {
  private sx = 0
  private sy = 0
  private moved = false
  private active = false

  start(x: number, y: number) {
    this.sx = x
    this.sy = y
    this.moved = false
    this.active = true
  }

  move(x: number, y: number) {
    if (this.active && Math.hypot(x - this.sx, y - this.sy) > MOVE_TOLERANCE_PX) this.moved = true
  }

  end() {
    this.active = false
  }

  canFire(): boolean {
    return this.active && !this.moved
  }
}
```

- [ ] **Step 7：實作 `src/scene/useLongPress.ts`**

```ts
import { useEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { LONG_PRESS_MS, PressTracker } from '../ui/press'

/** 手機長按：回傳 R3F pointer handlers；只對觸控生效 */
export function useLongPress(onLong: (e: ThreeEvent<PointerEvent>) => void) {
  const cb = useRef(onLong)
  cb.current = onLong
  const tracker = useMemo(() => new PressTracker(), [])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return useMemo(
    () => ({
      onPointerDown: (e: ThreeEvent<PointerEvent>) => {
        if (e.pointerType !== 'touch') return
        tracker.start(e.clientX, e.clientY)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          if (tracker.canFire()) cb.current(e)
          tracker.end()
        }, LONG_PRESS_MS)
      },
      onPointerMove: (e: ThreeEvent<PointerEvent>) => tracker.move(e.clientX, e.clientY),
      onPointerUp: () => {
        tracker.end()
        clearTimeout(timer.current)
      },
      onPointerLeave: () => {
        tracker.end()
        clearTimeout(timer.current)
      },
    }),
    [tracker],
  )
}
```

- [ ] **Step 8：套用長按**

`VoxelInstances.tsx` 的 `KindMesh`：
```tsx
  const press = useLongPress((e) => {
    const v = e.instanceId === undefined ? undefined : voxels[e.instanceId]
    if (v) onPick?.(v.group)
  })
```
並把 `{...press}` 展開到 `<instancedMesh>`。`City.tsx` 同理（長按大樓 → `pick({ productId: id, holdingId: id })`）。

- [ ] **Step 9：`TourPanel` 顯示即時數字**

在 `<p className="tour__text">` 之後加入：
```tsx
      {rows.length > 0 && (
        <table className="readout">
          <caption>{T.readout.title}</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
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
```
其中 `const productId = useSandbox((s) => s.productId)`、`const rows = stageReadout(step.scene.stage ?? { kind: 'none' }, { ...values, slice, explode }, universe, productId)`。

`ui.css` 加入：
```css
.readout { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
.readout caption { text-align: left; font-size: 12px; color: var(--muted); padding-bottom: 4px; }
.readout th { text-align: left; font-weight: 500; padding: 4px 0; }
.readout td { text-align: right; font-variant-numeric: tabular-nums; padding: 4px 0; }
.readout tr + tr { border-top: 1px solid var(--border); }
.readout__note { display: block; font-size: 11px; color: var(--muted); font-weight: 400; }
```

- [ ] **Step 10：測試、建置、截圖**

Run: `npx tsc --noEmit && npm test && npm run build`
截圖並 Read：`/?level=3&step=6`（費用比賽的數字表，前收列有「待驗證」與「假設」說明）、`/?level=5&step=1`（衝擊數字）、`/?level=1&step=5`（除息等式）。手機長按另寫 scratch Playwright 腳本，以 `hasTouch: true`、`isMobile: true` 的 390×844 context，在 0050 方塊上 `touchscreen` 長按（dispatch `pointerdown` 後等 600ms 再 `pointerup`），確認出現資訊卡；截 `p3t13-longpress.png` 並 Read。

- [ ] **Step 11：Commit**

```bash
git add src/ui/readout.ts src/ui/readout.test.ts src/ui/press.ts src/ui/press.test.ts src/scene/useLongPress.ts src/ui/TourPanel.tsx src/ui/strings.ts src/ui/ui.css src/scene/VoxelInstances.tsx src/scene/City.tsx
git commit -m "feat(ui): live stage readout and mobile long-press pick"
```

---

### Task 14：走完整個導覽並修畫面

**Files:**
- Create: `scripts/walkthrough.mjs`
- Modify: 依截圖結果調整 `src/scene/camera.ts`、舞台元件位置、文字等

**Interfaces:**
- Consumes: 開發模式的 `window.__BCI_STEPS__`（Task 6）、`?level=&step=`
- Produces：`npm run walkthrough -- [baseUrl] [outDir] [width] [height]`：每一步一張截圖（`<outDir>/L<level>-S<step>.png`），有 console error 時列出並以 exit code 1 結束

- [ ] **Step 1：建立 `scripts/walkthrough.mjs`**

```js
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const [base = 'http://localhost:5174', out = '.superpowers/sdd/shots/walk', w = '1280', h = '800'] = process.argv.slice(2)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  const steps = await page.evaluate(() => window.__BCI_STEPS__)
  for (let level = 0; level < steps.length; level++) {
    for (let step = 0; step < steps[level]; step++) {
      await page.goto(`${base}/?level=${level}&step=${step}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3500)
      await page.screenshot({ path: `${out}/L${level}-S${step}.png` })
    }
  }
} finally {
  await browser.close()
}
if (errors.length) {
  console.error(`Console errors:\n${errors.join('\n')}`)
  process.exit(1)
}
console.log(`saved walkthrough to ${out}`)
```

`package.json` scripts 加入 `"walkthrough": "node scripts/walkthrough.mjs"`。

- [ ] **Step 2：桌機走一遍**

背景啟動 `npx vite --port 5174 --strictPort`，執行 `npm run walkthrough`。逐張 Read 每一步的截圖，對照該步的課程文字檢查：
- 教學視覺是否完整在畫面內、沒有被左側面板擋住
- 標籤是否互相重疊、是否壓在主要物體上
- 鏡頭是否對準該步的重點（例如 e-3 看得到切面的藍色厚層）
- 面板文字、控制項、即時數字是否正確顯示
- 「示意」「假設」「待驗證」標示是否出現在該出現的地方

把問題列成清單，逐一修正（調整 `CAMERA_PRESETS`、`PLAZA` 物件間距、標籤位置或文字），再重跑 walkthrough，直到每一步都通過。

- [ ] **Step 3：手機走一遍**

`npm run walkthrough -- http://localhost:5174 .superpowers/sdd/shots/walk-mobile 390 844`，逐張檢查：底部抽屜不擋住重點、文字可讀、控制項可操作、沒有橫向捲動。必要時調整 `ViewFraming` 或 CSS。

- [ ] **Step 4：全部檢查**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected：全部通過。只用精確 PID 關閉 dev server。

- [ ] **Step 5：Commit**

```bash
git add scripts/walkthrough.mjs package.json src
git commit -m "chore: walkthrough screenshots and visual fixes across all tour steps"
```

在報告中附上每一步「修正前／修正後」的問題清單與對應修改。
