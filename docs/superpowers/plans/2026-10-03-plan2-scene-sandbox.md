# 積木城市 Plan 2：3D 基礎元件與最小沙盒 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出第一個看得到、摸得到的版本：積木城市（台灣島與美國大陸上的大樓），交易所櫃台上的 ETF 混合方塊或基金小塔，可以用雷射刀切開、拆開、點選方塊看資訊，並有面板切換 8 個商品。

**Architecture:** 所有幾何與換算（方塊堆疊、切割、拆開位移、城市配置、大樓高度、配色）都是 `src/scene/layout/`、`src/scene/palette.ts` 裡的純函式，用 Vitest 測試。R3F 元件只負責把純函式的結果畫出來，一種材質一個 InstancedMesh。互動狀態放在 zustand（`src/store/sandbox.ts`），可由網址參數初始化，方便截圖驗證。視覺用 Playwright 截圖檢查。

**Tech Stack:** 沿用 Plan 1（Vite、TypeScript strict、React 19、three、@react-three/fiber 9、@react-three/drei 10、zustand 5、zod 4、Vitest 5），新增 devDependency `playwright`（只用來截圖）。

**規格：** `docs/superpowers/specs/2026-10-03-block-city-invest-design.md`
**前置：** Plan 1 已完成（`docs/superpowers/plans/2026-10-03-plan1-foundation-data-sim.md`）。

**計畫路線圖：**
- Plan 1：基礎建設、資料快照、計算引擎（完成）
- Plan 2：3D 基礎元件與最小沙盒（本檔）
- Plan 3：關卡系統、金幣水滴與三道門視覺化、重疊連線、斜切、手機長按
- Plan 4：地底章節、依幀率降級、WebGL 備案、Playwright 端到端測試

## Global Constraints

- 介面只用繁體中文，所有介面文字集中在 `src/ui/strings.ts`。
- 全站固定顯示：「資料為 2026-10-03 快照，僅供教學，不構成投資建議。」（日期取自 `SNAPSHOT_DATE`）
- 籃子內的方塊數量**嚴格依照權重**，一律用 `allocateBlocks`（最大餘數法）換算。
- 大樓高度用**對數比例**呈現市值，介面上要註明。
- 籃子方塊數上限：桌機 1,000 顆（ETF 10×10×10），手機約 300 顆（ETF 7×7×7 = 343）。
- 一種材質一個 InstancedMesh。
- 未驗證的資料在介面上顯示「待驗證」，查證狀態一律用 `isVerified`（細項 key 優先，其次總 key，都沒有即未驗證）。
- 全站不談稅。
- `src/sim/`、`src/data/`、`src/scene/layout/`、`src/scene/palette.ts` 必須是純 TypeScript，不 import React 或 R3F。
- TypeScript strict，不可以使用 `any`。Node ≥ 22.12。

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `src/data/schema.ts`（改） | 新增 `marketCapUsdB`、`VERIFIED_KEYS` 加入 `marketCap` |
| `src/data/verified.ts` | `isVerified(asset, key)`：查證狀態的優先序 |
| `src/data/snapshot/stocks.json`（改） | 22 檔個股的市值與來源 |
| `docs/data-sources.md`（改） | 市值查證紀錄 |
| `src/scene/palette.ts` | 資產 → 顏色與材質種類；同一籃子內顏色不重複 |
| `src/scene/layout/voxels.ts` | 方塊堆疊、座標、切割、拆開位移、動畫趨近 |
| `src/scene/layout/city.ts` | 大樓高度（對數）、城市配置、大樓方塊 |
| `src/scene/quality.ts` | 桌機／手機的方塊規格與偵測 |
| `src/store/sandbox.ts` | 沙盒互動狀態與網址參數解析 |
| `src/ui/strings.ts` | 所有介面文字 |
| `scripts/screenshot.mjs` | Playwright 截圖工具 |
| `src/scene/materials.tsx` | 依材質種類回傳 R3F 材質 |
| `src/scene/VoxelInstances.tsx` | 依材質分組的 InstancedMesh、切割、拆開動畫、點選 |
| `src/scene/LaserPlane.tsx` | 雷射刀切面 |
| `src/scene/BasketView.tsx` | 把商品換算成方塊並畫出來 |
| `src/scene/City.tsx` | 兩座島、大樓、名稱標籤 |
| `src/scene/Scene.tsx` | 燈光、海面、交易所櫃台、鏡頭控制 |
| `src/ui/model.ts` | 介面用的純函式：商品分組、圖例、點選資訊 |
| `src/ui/SandboxPanel.tsx`、`src/ui/PickInfoPanel.tsx`、`src/ui/Disclaimer.tsx`、`src/ui/useExplodeKey.ts`、`src/ui/ui.css` | 介面 |
| `src/App.tsx`、`src/main.tsx`（改） | 組裝 |

純函式的測試放在旁邊（`*.test.ts`）。

---

### Task 1：查證狀態 helper 與市值欄位

**Files:**
- Modify: `src/data/schema.ts`
- Create: `src/data/verified.ts`
- Modify: `src/data/index.ts`
- Test: `src/data/verified.test.ts`, `src/data/universe.test.ts`

**Interfaces:**
- Consumes: `Asset`、`VerifiedKey`、`VERIFIED_KEYS`（Plan 1，`src/data/schema.ts`）
- Produces:
  - `Asset.marketCapUsdB?: number`（十億美元，正數）
  - `VERIFIED_KEYS` 新增 `'marketCap'`
  - `isVerified(asset: Asset, key: VerifiedKey): boolean`，並由 `src/data/index.ts` 匯出 `isVerified` 與 `type VerifiedKey`

- [ ] **Step 1：撰寫失敗的測試 `src/data/verified.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { isVerified } from './verified'
import { universe } from './index'
import type { Asset } from './schema'

const base: Asset = { id: 'X', name: 'X', type: 'stock', asOf: '2026-10-03', source: [] }

describe('isVerified', () => {
  it('is false when there is no verified map', () => {
    expect(isVerified(base, 'holdings')).toBe(false)
  })

  it('uses the exact key when present', () => {
    const a: Asset = { ...base, verified: { fees: false, 'fees.cdsc': true } }
    expect(isVerified(a, 'fees.cdsc')).toBe(true)
  })

  it('falls back from a fine key to its parent key', () => {
    const a: Asset = { ...base, verified: { fees: true } }
    expect(isVerified(a, 'fees.cdsc')).toBe(true)
    expect(isVerified({ ...base, verified: { fees: false } }, 'fees.expenseRatio')).toBe(false)
  })

  it('an explicit false on the fine key beats a true parent', () => {
    const a: Asset = { ...base, verified: { fees: true, 'fees.expenseRatio': false } }
    expect(isVerified(a, 'fees.expenseRatio')).toBe(false)
  })

  it('is false when neither key exists', () => {
    expect(isVerified({ ...base, verified: { holdings: true } }, 'fees.cdsc')).toBe(false)
  })

  it('matches the Schroder U-class flags in the snapshot', () => {
    const u = universe.get('SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD')!
    expect(isVerified(u, 'fees.cdsc')).toBe(true)
    expect(isVerified(u, 'fees.expenseRatio')).toBe(false)
  })
})
```

在 `src/data/universe.test.ts` 的 `describe('parseUniverse', ...)` 內加入：

```ts
  it('accepts a positive marketCapUsdB and rejects a negative one', () => {
    expect(() => parseUniverse([{ ...stock('A'), marketCapUsdB: 1200 }])).not.toThrow()
    expect(errorsOf([{ ...stock('A'), marketCapUsdB: -1 }])[0]).toMatch(/^#0: marketCapUsdB/)
  })

  it('accepts the marketCap verified key', () => {
    expect(() => parseUniverse([{ ...stock('A'), verified: { marketCap: true } }])).not.toThrow()
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/data`
Expected：FAIL。`verified.test.ts` 找不到 `./verified`；`universe.test.ts` 新測試因 `marketCapUsdB`／`marketCap` 未知而失敗。

- [ ] **Step 3：修改 `src/data/schema.ts`**

在 `VERIFIED_KEYS` 陣列的 `'asOf',` 之後加入：
```ts
  'marketCap',
```

在 `AssetSchema` 的 `sector: z.string().optional(),` 之後加入：
```ts
    /** 市值（十億美元）；只用於大樓高度（對數比例） */
    marketCapUsdB: z.number().positive().optional(),
```

- [ ] **Step 4：建立 `src/data/verified.ts`**

```ts
import type { Asset, VerifiedKey } from './schema'

/** 查證狀態：細項 key（如 'fees.cdsc'）優先，其次總 key（'fees'），都沒有即未查證。 */
export function isVerified(asset: Asset, key: VerifiedKey): boolean {
  const v = asset.verified
  if (!v) return false
  const own = v[key]
  if (own !== undefined) return own
  const dot = key.indexOf('.')
  if (dot > 0) {
    const parent = v[key.slice(0, dot) as VerifiedKey]
    if (parent !== undefined) return parent
  }
  return false
}
```

- [ ] **Step 5：在 `src/data/index.ts` 末尾加入匯出**

```ts
export { isVerified } from './verified'
export type { VerifiedKey } from './schema'
```

- [ ] **Step 6：執行測試，確認通過**

Run: `npx vitest run src/data && npx tsc --noEmit`
Expected：全部 PASS，tsc 無錯誤。

- [ ] **Step 7：Commit**

```bash
git add src/data/schema.ts src/data/verified.ts src/data/verified.test.ts src/data/universe.test.ts src/data/index.ts
git commit -m "feat(data): add isVerified precedence helper and marketCapUsdB field"
```

---

### Task 2：個股市值查證

**Files:**
- Modify: `src/data/snapshot/stocks.json`, `docs/data-sources.md`
- Test: `src/data/snapshot.test.ts`

**Interfaces:**
- Consumes: `marketCapUsdB`、`verified.marketCap`（Task 1）
- Produces: 每檔個股的 `marketCapUsdB`（查得到的話），以及 `verified.marketCap`、`source`、`notes`

大樓高度只是視覺，但仍然是真實公司的數字，所以依照同樣的查證規則。

- [ ] **Step 1：撰寫失敗的測試**

在 `src/data/snapshot.test.ts` 的 `describe('snapshot', ...)` 內加入：

```ts
  it('landmark stocks have a market cap', () => {
    for (const id of ['2330', 'NVDA', 'TSLA', 'AAPL', 'MSFT']) {
      expect(universe.get(id)?.marketCapUsdB, id).toBeGreaterThan(0)
    }
  })

  it('every market cap carries a verified flag and a source', () => {
    for (const a of universe.values()) {
      if (a.marketCapUsdB === undefined) continue
      expect(a.verified?.marketCap, a.id).toBeDefined()
      expect(a.source.length, a.id).toBeGreaterThan(0)
    }
  })
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/data/snapshot.test.ts`
Expected：FAIL，`landmark stocks have a market cap`（目前沒有任何市值）。

- [ ] **Step 3：查證 22 檔個股的市值**

用網路搜尋查每一檔 `stocks.json` 個股在 2026-10-03 前後的市值，規則：

- 優先使用交易所、公司投資人關係頁，或主要財經資料站（如 companiesmarketcap.com、Yahoo Finance、TWSE）。
- 台股市值是新台幣，要換算成美元十億元；換算用的匯率、匯率日期與來源寫進該檔的 `notes`。
- 每檔填 `marketCapUsdB`（四捨五入到小數點後 1 位）、`source`（網址）、`verified: { "marketCap": true }`，`notes` 寫市值的資料日期。
- **查不到就不要填 `marketCapUsdB`**，該檔大樓會用預設高度；在 `docs/data-sources.md` 記「查無」。不可以猜。
- 每檔最多約 4 次搜尋，查不到就跳過。

- [ ] **Step 4：更新 `docs/data-sources.md`**

在表格末尾為每一檔加一列：
```markdown
| 2330 | marketCapUsdB | 1234.5 | 已驗證 | <URL>（資料日 2026-10-0x；匯率 1 USD = xx TWD，來源 <URL>） | 2026-10-0x |
```

- [ ] **Step 5：執行測試與建置**

Run: `npm test && npm run build`
Expected：全部 PASS，建置成功（three.js chunk 體積警告可忽略）。如果某檔地標個股真的查不到，**不要放寬測試**，回報 BLOCKED 並附上搜尋紀錄。

- [ ] **Step 6：Commit**

```bash
git add src/data/snapshot/stocks.json docs/data-sources.md src/data/snapshot.test.ts
git commit -m "data: add verified market caps for building heights"
```

---

### Task 3：配色與材質種類

**Files:**
- Create: `src/scene/palette.ts`
- Test: `src/scene/palette.test.ts`

**Interfaces:**
- Consumes: `Asset`（`src/data/schema.ts`）、`Universe`（`src/data/universe.ts`）、`universe`（`src/data/index.ts`）
- Produces:
  - `type MaterialKind = 'matte' | 'metal' | 'diamond' | 'glass' | 'gold'`
  - `type BlockLook = { color: string; kind: MaterialKind }`（`color` 為 `#rrggbb`）
  - `SECTOR_COLORS: Record<string, string>`
  - `lookFor(asset: Asset): BlockLook`
  - `basketLooks(assets: Asset[]): BlockLook[]`：同一籃子內顏色不重複
  - `productLooks(u: Universe, productId: string): BlockLook[]`：依該商品 `holdings` 順序

- [ ] **Step 1：撰寫失敗的測試 `src/scene/palette.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import type { Asset } from '../data/schema'
import { lookFor, basketLooks, productLooks, SECTOR_COLORS } from './palette'

const a = (id: string, type: Asset['type'], sector?: string): Asset => ({ id, name: id, type, sector, asOf: '2026-10-03', source: [] })

describe('lookFor', () => {
  it('colors stocks by sector with a matte material', () => {
    expect(lookFor(a('S', 'stock', 'semiconductor'))).toEqual({ color: SECTOR_COLORS.semiconductor, kind: 'matte' })
  })

  it('falls back for unknown sectors', () => {
    expect(lookFor(a('S', 'stock', 'mystery')).kind).toBe('matte')
  })

  it('uses material to show bond credit quality', () => {
    expect(lookFor(a('G', 'govBond')).kind).toBe('diamond')
    expect(lookFor(a('C', 'corpBond')).kind).toBe('metal')
    expect(lookFor(a('H', 'highYieldBond')).kind).toBe('glass')
    expect(lookFor(a('AU', 'gold')).kind).toBe('gold')
  })
})

describe('basketLooks', () => {
  it('keeps the first color and shifts later duplicates', () => {
    const looks = basketLooks([a('A', 'stock', 'semiconductor'), a('B', 'stock', 'semiconductor')])
    expect(looks[0]?.color).toBe(SECTOR_COLORS.semiconductor)
    expect(looks[1]?.color).not.toBe(looks[0]?.color)
    expect(looks[1]?.kind).toBe('matte')
  })

  it('gives every holding a distinct color in every real basket', () => {
    for (const p of universe.values()) {
      if (!p.holdings) continue
      const colors = productLooks(universe, p.id).map((l) => l.color)
      expect(new Set(colors).size, p.id).toBe(colors.length)
    }
  })
})

describe('productLooks', () => {
  it('follows the holdings order', () => {
    const looks = productLooks(universe, '0050')
    expect(looks).toHaveLength(universe.get('0050')!.holdings!.length)
    expect(looks[0]?.color).toBe(SECTOR_COLORS.semiconductor) // 2330
  })

  it('throws for non-baskets', () => {
    expect(() => productLooks(universe, '2330')).toThrow('not a basket: 2330')
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/palette.test.ts`
Expected：FAIL，找不到 `./palette`。

- [ ] **Step 3：實作 `src/scene/palette.ts`**

```ts
import { Color } from 'three'
import type { Asset } from '../data/schema'
import type { Universe } from '../data/universe'

export type MaterialKind = 'matte' | 'metal' | 'diamond' | 'glass' | 'gold'
export type BlockLook = { color: string; kind: MaterialKind }

export const SECTOR_COLORS: Record<string, string> = {
  semiconductor: '#4f7cff',
  electronics: '#2bb3a3',
  software: '#8a5cf6',
  internet: '#f06292',
  auto: '#ff8a3d',
  finance: '#5c6bc0',
}

const FALLBACK_STOCK = '#90a4ae'

/** 股票依產業上色；債券用材質表示信用品質（國家債鑽石、公司債金屬、高收益債玻璃）。 */
export function lookFor(asset: Asset): BlockLook {
  switch (asset.type) {
    case 'stock':
      return { color: SECTOR_COLORS[asset.sector ?? ''] ?? FALLBACK_STOCK, kind: 'matte' }
    case 'govBond':
      return { color: '#d8f3ff', kind: 'diamond' }
    case 'corpBond':
      return { color: '#b0bec5', kind: 'metal' }
    case 'bondMixed':
      return { color: '#9fb3c8', kind: 'metal' }
    case 'highYieldBond':
      return { color: '#ffcc80', kind: 'glass' }
    case 'convertible':
      return { color: '#80cbc4', kind: 'metal' }
    case 'gold':
      return { color: '#ffd54f', kind: 'gold' }
    case 'cash':
      return { color: '#c5e1a5', kind: 'matte' }
    case 'other':
      return { color: '#cfd8dc', kind: 'matte' }
    case 'etf':
    case 'fund':
      return { color: '#ffffff', kind: 'matte' }
  }
}

const LIGHTNESS_STEP = 0.12

/** 同一籃子內，同色的第 n 個（n ≥ 1）依序調亮、調暗，讓每一層地層都分得出來。 */
export function basketLooks(assets: Asset[]): BlockLook[] {
  const used = new Map<string, number>()
  return assets.map((asset) => {
    const look = lookFor(asset)
    const n = used.get(look.color) ?? 0
    used.set(look.color, n + 1)
    if (n === 0) return look
    const step = Math.ceil(n / 2) * LIGHTNESS_STEP
    const c = new Color(look.color).offsetHSL(0, 0, n % 2 === 1 ? step : -step)
    return { ...look, color: `#${c.getHexString()}` }
  })
}

export function productLooks(u: Universe, productId: string): BlockLook[] {
  const p = u.get(productId)
  if (!p?.holdings) throw new Error(`not a basket: ${productId}`)
  return basketLooks(
    p.holdings.map((h) => {
      const a = u.get(h.id)
      if (!a) throw new Error(`unknown asset ${h.id}`)
      return a
    }),
  )
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/scene/palette.test.ts && npx tsc --noEmit`
Expected：全部 PASS。如果「every real basket」測試因為顏色碰撞失敗，調整 `LIGHTNESS_STEP` 或碰撞時再加一點色相偏移，**不可以刪測試**，並在報告中說明。

- [ ] **Step 5：Commit**

```bash
git add src/scene/palette.ts src/scene/palette.test.ts
git commit -m "feat(scene): add palette with per-basket distinct colors"
```

---

### Task 4：方塊堆疊、切割、拆開的純函式

**Files:**
- Create: `src/scene/layout/voxels.ts`
- Test: `src/scene/layout/voxels.test.ts`

**Interfaces:**
- Consumes: `BlockCount`（`src/sim/allocate.ts`）、`allocateBlocks`（測試用）
- Produces:
  - `type SliceAxis = 'x' | 'y' | 'z'`
  - `type Voxel = { id: string; group: number; x: number; y: number; z: number }`（格點座標，`group` = 持股在 holdings 中的索引）
  - `type CutSpec = { axis: SliceAxis; threshold: number }`
  - `VOXEL_SCALE = 0.92`、`EXPLODE_GAP = 1.5`
  - `stackVoxels(counts: BlockCount[], w: number, d: number): Voxel[]`
  - `layersFor(total: number, w: number, d: number): number`
  - `voxelPosition(v: Voxel, w: number, d: number): [number, number, number]`
  - `explodeOffsetY(group: number, t: number): number`
  - `sizeAlong(axis: SliceAxis, w: number, d: number, layers: number): number`
  - `cutThreshold(size: number, amount: number): number`
  - `isHidden(v: Voxel, cut: CutSpec): boolean`
  - `cutPlanePosition(cut: CutSpec, w: number, d: number): number`
  - `approach(current: number, target: number, dt: number, rate?: number): number`

堆疊方式：依 holdings 順序，一顆一顆填進 w×d 的地板，滿一層往上疊。同一持股的方塊連在一起，所以直切時會看到依權重厚薄的水平地層。

- [ ] **Step 1：撰寫失敗的測試 `src/scene/layout/voxels.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { allocateBlocks } from '../../sim/allocate'
import {
  stackVoxels, layersFor, voxelPosition, explodeOffsetY, sizeAlong,
  cutThreshold, isHidden, cutPlanePosition, approach, EXPLODE_GAP,
} from './voxels'

describe('stackVoxels', () => {
  it('fills the floor row by row, then stacks upward, group by group', () => {
    const v = stackVoxels([{ id: 'a', count: 3 }, { id: 'b', count: 2 }], 2, 2)
    expect(v).toEqual([
      { id: 'a', group: 0, x: 0, y: 0, z: 0 },
      { id: 'a', group: 0, x: 1, y: 0, z: 0 },
      { id: 'a', group: 0, x: 0, y: 0, z: 1 },
      { id: 'b', group: 1, x: 1, y: 0, z: 1 },
      { id: 'b', group: 1, x: 0, y: 1, z: 0 },
    ])
  })

  it('makes 0050 a 10x10x10 cube whose 2330 stratum is ~5.7 layers thick', () => {
    const counts = allocateBlocks(
      [{ id: '2330', weight: 57.35 }, { id: '2454', weight: 5.64 }, { id: '2308', weight: 3.47 }, { id: '2317', weight: 2.98 }, { id: 'OTHER', weight: 30.56 }],
      1000,
    )
    const v = stackVoxels(counts, 10, 10)
    expect(v).toHaveLength(1000)
    const tsmc = v.filter((x) => x.group === 0)
    expect(tsmc).toHaveLength(573)
    expect(Math.max(...tsmc.map((x) => x.y))).toBe(5) // 第 573 顆在第 6 層（y = 5）
    expect(Math.max(...v.map((x) => x.y))).toBe(9)
  })

  it('rejects non-positive or non-integer floor sizes', () => {
    expect(() => stackVoxels([{ id: 'a', count: 1 }], 0, 2)).toThrow(RangeError)
    expect(() => stackVoxels([{ id: 'a', count: 1 }], 2, 1.5)).toThrow(RangeError)
  })
})

describe('geometry helpers', () => {
  it('layersFor rounds up partial layers', () => {
    expect(layersFor(1000, 10, 10)).toBe(10)
    expect(layersFor(343, 7, 7)).toBe(7)
    expect(layersFor(101, 10, 10)).toBe(11)
  })

  it('voxelPosition centers x/z on the origin and sits on y = 0', () => {
    expect(voxelPosition({ id: 'a', group: 0, x: 0, y: 0, z: 0 }, 10, 10)).toEqual([-4.5, 0.5, -4.5])
    expect(voxelPosition({ id: 'a', group: 0, x: 9, y: 2, z: 9 }, 10, 10)).toEqual([4.5, 2.5, 4.5])
  })

  it('explodeOffsetY separates groups proportionally to t', () => {
    expect(explodeOffsetY(0, 1)).toBe(0)
    expect(explodeOffsetY(2, 0.5)).toBeCloseTo(EXPLODE_GAP) // 2 * 1.5 * 0.5
  })

  it('sizeAlong picks the grid size for an axis', () => {
    expect(sizeAlong('x', 10, 6, 14)).toBe(10)
    expect(sizeAlong('z', 10, 6, 14)).toBe(6)
    expect(sizeAlong('y', 10, 6, 14)).toBe(14)
  })
})

describe('cutting', () => {
  it('cutThreshold maps amount 0..1 to size..0 and clamps', () => {
    expect(cutThreshold(10, 0)).toBe(10)
    expect(cutThreshold(10, 0.5)).toBe(5)
    expect(cutThreshold(10, 1)).toBe(0)
    expect(cutThreshold(10, 2)).toBe(0)
    expect(cutThreshold(10, -1)).toBe(10)
  })

  it('isHidden removes voxels at or beyond the threshold', () => {
    const cut = { axis: 'x' as const, threshold: 5 }
    expect(isHidden({ id: 'a', group: 0, x: 4, y: 0, z: 0 }, cut)).toBe(false)
    expect(isHidden({ id: 'a', group: 0, x: 5, y: 0, z: 0 }, cut)).toBe(true)
  })

  it('cutPlanePosition sits on the boundary between visible and hidden voxels', () => {
    expect(cutPlanePosition({ axis: 'x', threshold: 5 }, 10, 10)).toBe(0) // x=4 中心 -0.5、x=5 中心 0.5
    expect(cutPlanePosition({ axis: 'z', threshold: 2 }, 10, 6)).toBe(-1)
    expect(cutPlanePosition({ axis: 'y', threshold: 3 }, 10, 10)).toBe(3)
  })
})

describe('approach', () => {
  it('moves toward the target without overshooting', () => {
    expect(approach(0, 1, 0)).toBe(0)
    const mid = approach(0, 1, 0.1)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(approach(0, 1, 10)).toBeCloseTo(1, 6)
    expect(approach(1, 0, 0.1)).toBeLessThan(1)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout/voxels.test.ts`
Expected：FAIL，找不到 `./voxels`。

- [ ] **Step 3：實作 `src/scene/layout/voxels.ts`**

```ts
import type { BlockCount } from '../../sim/allocate'

export type SliceAxis = 'x' | 'y' | 'z'
/** 格點座標；group 是持股在 holdings 中的索引 */
export type Voxel = { id: string; group: number; x: number; y: number; z: number }
export type CutSpec = { axis: SliceAxis; threshold: number }

/** 方塊縮小一點，留出縫隙看得出格線 */
export const VOXEL_SCALE = 0.92
/** 拆開時，每一組往上多移的距離（t = 1 時） */
export const EXPLODE_GAP = 1.5

/** 依序把各組方塊填進 w×d 的地板（先 x 再 z），滿一層往上疊（y）。同組方塊連續，切開會看到依權重厚薄的地層。 */
export function stackVoxels(counts: BlockCount[], w: number, d: number): Voxel[] {
  for (const [name, n] of [['w', w], ['d', d]] as const) {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError(`${name} must be a positive integer: ${n}`)
  }
  const floor = w * d
  const out: Voxel[] = []
  let i = 0
  counts.forEach((c, group) => {
    for (let k = 0; k < c.count; k++, i++) {
      const r = i % floor
      out.push({ id: c.id, group, x: r % w, y: Math.floor(i / floor), z: Math.floor(r / w) })
    }
  })
  return out
}

export function layersFor(total: number, w: number, d: number): number {
  return Math.ceil(total / (w * d))
}

/** 格點 → 世界座標：x/z 以原點為中心，底面貼齊 y = 0 */
export function voxelPosition(v: Voxel, w: number, d: number): [number, number, number] {
  return [v.x - (w - 1) / 2, v.y + 0.5, v.z - (d - 1) / 2]
}

export function explodeOffsetY(group: number, t: number): number {
  return group * EXPLODE_GAP * t
}

export function sizeAlong(axis: SliceAxis, w: number, d: number, layers: number): number {
  return axis === 'x' ? w : axis === 'z' ? d : layers
}

/** 切割量 0（不切）～1（全切）→ 格點門檻：座標 ≥ 門檻的方塊被切掉 */
export function cutThreshold(size: number, amount: number): number {
  return size * (1 - Math.min(1, Math.max(0, amount)))
}

export function isHidden(v: Voxel, cut: CutSpec): boolean {
  return v[cut.axis] >= cut.threshold
}

/** 切面在該軸上的世界座標（保留與切掉的方塊之間的交界） */
export function cutPlanePosition(cut: CutSpec, w: number, d: number): number {
  if (cut.axis === 'x') return cut.threshold - w / 2
  if (cut.axis === 'z') return cut.threshold - d / 2
  return cut.threshold
}

/** 指數趨近，用於動畫；dt 秒 */
export function approach(current: number, target: number, dt: number, rate = 8): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/scene/layout/voxels.test.ts && npx tsc --noEmit`
Expected：全部 PASS。

- [ ] **Step 5：Commit**

```bash
git add src/scene/layout/voxels.ts src/scene/layout/voxels.test.ts
git commit -m "feat(scene): add voxel stacking, cutting and explode layout"
```

---

### Task 5：城市配置與大樓高度

**Files:**
- Create: `src/scene/layout/city.ts`
- Test: `src/scene/layout/city.test.ts`

**Interfaces:**
- Consumes: `Asset`（含 Task 1 的 `marketCapUsdB`）、`universe`（測試用）
- Produces:
  - `HEIGHT = { min: 2, perDecade: 6, fallback: 3 }`、`BUILDING_SPACING = 4`
  - `ISLAND_CENTERS: { TW: readonly [number, number]; US: readonly [number, number] }`（x, z）
  - `type Region = 'TW' | 'US'`
  - `type Placement = { id: string; region: Region; x: number; z: number; height: number }`
  - `type BuildingVoxel = { id: string; x: number; y: number; z: number }`（世界座標，方塊中心）
  - `buildingHeight(capUsdB: number | undefined): number`（方塊層數）
  - `cityLayout(assets: Asset[]): Placement[]`（只取 `type === 'stock'` 且 region 為 TW／US）
  - `islandSize(count: number): number`
  - `buildingVoxels(placements: Placement[]): BuildingVoxel[]`（每棟 2×2 地基）

高度公式：`h = max(2, round(2 + 6 × log10(市值 / 100 億美元)))`；沒有市值時用 3。

- [ ] **Step 1：撰寫失敗的測試 `src/scene/layout/city.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../../data'
import { buildingHeight, cityLayout, islandSize, buildingVoxels, ISLAND_CENTERS, HEIGHT } from './city'

describe('buildingHeight', () => {
  it('is logarithmic in market cap (USD billions)', () => {
    expect(buildingHeight(10)).toBe(2) // 2 + 6*log10(1)
    expect(buildingHeight(100)).toBe(8) // 2 + 6*1
    expect(buildingHeight(1000)).toBe(14) // 2 + 6*2
    expect(buildingHeight(5000)).toBe(18) // 2 + 6*2.699 = 18.19
  })

  it('never goes below the minimum and uses a fallback when unknown', () => {
    expect(buildingHeight(1)).toBe(HEIGHT.min)
    expect(buildingHeight(undefined)).toBe(HEIGHT.fallback)
  })

  it('rejects non-positive caps', () => {
    expect(() => buildingHeight(0)).toThrow(RangeError)
    expect(() => buildingHeight(Number.NaN)).toThrow(RangeError)
  })
})

describe('cityLayout', () => {
  const assets = [...universe.values()]
  const placements = cityLayout(assets)

  it('places every TW/US stock exactly once', () => {
    const stocks = assets.filter((a) => a.type === 'stock' && (a.region === 'TW' || a.region === 'US'))
    expect(placements).toHaveLength(stocks.length)
    expect(new Set(placements.map((p) => p.id)).size).toBe(stocks.length)
  })

  it('puts Taiwan on the west island and the US on the east', () => {
    for (const p of placements) {
      if (p.region === 'TW') expect(p.x, p.id).toBeLessThan(0)
      else expect(p.x, p.id).toBeGreaterThan(0)
    }
  })

  it('never puts two buildings on the same spot', () => {
    const spots = placements.map((p) => `${p.x},${p.z}`)
    expect(new Set(spots).size).toBe(spots.length)
  })

  it('orders each island tallest first', () => {
    for (const region of ['TW', 'US'] as const) {
      const hs = placements.filter((p) => p.region === region).map((p) => p.height)
      expect(hs[0]).toBe(Math.max(...hs))
    }
  })

  it('keeps buildings inside their island', () => {
    for (const region of ['TW', 'US'] as const) {
      const list = placements.filter((p) => p.region === region)
      const half = islandSize(list.length) / 2
      const [cx, cz] = ISLAND_CENTERS[region]
      for (const p of list) {
        expect(Math.abs(p.x - cx) + 1, p.id).toBeLessThanOrEqual(half)
        expect(Math.abs(p.z - cz) + 1, p.id).toBeLessThanOrEqual(half)
      }
    }
  })
})

describe('buildingVoxels', () => {
  it('builds a 2x2 column of height h for each building', () => {
    const v = buildingVoxels([{ id: 'A', region: 'TW', x: 0, z: 0, height: 3 }])
    expect(v).toHaveLength(12)
    expect(new Set(v.map((b) => b.x))).toEqual(new Set([-0.5, 0.5]))
    expect(Math.max(...v.map((b) => b.y))).toBe(2.5)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/scene/layout/city.test.ts`
Expected：FAIL，找不到 `./city`。

- [ ] **Step 3：實作 `src/scene/layout/city.ts`**

```ts
import type { Asset } from '../../data/schema'

export const HEIGHT = { min: 2, perDecade: 6, fallback: 3 } as const
export const BUILDING_SPACING = 4
export const ISLAND_CENTERS = { TW: [-16, 0], US: [16, 0] } as const

export type Region = 'TW' | 'US'
export type Placement = { id: string; region: Region; x: number; z: number; height: number }
export type BuildingVoxel = { id: string; x: number; y: number; z: number }

/** 大樓層數 = 市值的對數比例：100 億美元 2 層，每多 10 倍加 6 層 */
export function buildingHeight(capUsdB: number | undefined): number {
  if (capUsdB === undefined) return HEIGHT.fallback
  if (!Number.isFinite(capUsdB) || capUsdB <= 0) throw new RangeError(`capUsdB must be a positive number: ${capUsdB}`)
  return Math.max(HEIGHT.min, Math.round(HEIGHT.min + HEIGHT.perDecade * Math.log10(capUsdB / 10)))
}

/** 每座島排成方陣，最高的排最前面 */
export function cityLayout(assets: Asset[]): Placement[] {
  const out: Placement[] = []
  for (const region of ['TW', 'US'] as const) {
    const list = assets
      .filter((a) => a.type === 'stock' && a.region === region)
      .map((a) => ({ id: a.id, height: buildingHeight(a.marketCapUsdB) }))
      .sort((a, b) => b.height - a.height || a.id.localeCompare(b.id))
    const cols = Math.ceil(Math.sqrt(list.length))
    const rows = Math.ceil(list.length / cols)
    const [cx, cz] = ISLAND_CENTERS[region]
    list.forEach((b, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      out.push({
        ...b,
        region,
        x: cx + (col - (cols - 1) / 2) * BUILDING_SPACING,
        z: cz + (row - (rows - 1) / 2) * BUILDING_SPACING,
      })
    })
  }
  return out
}

/** 島的邊長（正方形），容得下 count 棟大樓再加邊界 */
export function islandSize(count: number): number {
  return Math.ceil(Math.sqrt(Math.max(1, count))) * BUILDING_SPACING + 4
}

/** 每棟大樓是 2×2 地基、height 層高的方塊柱 */
export function buildingVoxels(placements: Placement[]): BuildingVoxel[] {
  const out: BuildingVoxel[] = []
  for (const p of placements) {
    for (let y = 0; y < p.height; y++) {
      for (const dx of [-0.5, 0.5]) {
        for (const dz of [-0.5, 0.5]) out.push({ id: p.id, x: p.x + dx, y: y + 0.5, z: p.z + dz })
      }
    }
  }
  return out
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/scene/layout/city.test.ts && npx tsc --noEmit`
Expected：全部 PASS。

- [ ] **Step 5：Commit**

```bash
git add src/scene/layout/city.ts src/scene/layout/city.test.ts
git commit -m "feat(scene): add city layout with log-scaled building heights"
```

---

### Task 6：畫質設定、沙盒狀態、介面文字

**Files:**
- Create: `src/scene/quality.ts`, `src/store/sandbox.ts`, `src/ui/strings.ts`
- Test: `src/scene/quality.test.ts`, `src/store/sandbox.test.ts`

**Interfaces:**
- Consumes: `SliceAxis`（Task 4）
- Produces:
  - `type Quality = 'high' | 'low'`；`type BoxSpec = { w: number; d: number; total: number }`；`type QualityConfig = { etf: BoxSpec; fund: BoxSpec; shadows: boolean; dpr: [number, number] }`
  - `QUALITY: Record<Quality, QualityConfig>`；`detectQuality(env: { coarsePointer: boolean; cores: number | undefined }): Quality`；`readEnv(): { coarsePointer: boolean; cores: number | undefined }`
  - `type Picked = { productId: string; holdingId: string } | null`
  - `useSandbox`（zustand hook），state：`productId: string | null`、`sliceAxis: SliceAxis`、`slice: number`、`explode: number`、`explodeHeld: boolean`、`picked: Picked`；actions：`selectProduct(id)`、`setSliceAxis(a)`、`setSlice(v)`、`setExplode(v)`、`setExplodeHeld(b)`、`pick(p)`
  - `effectiveExplode(s: { explode: number; explodeHeld: boolean }): number`
  - `type SandboxInit = { productId?: string; sliceAxis?: SliceAxis; slice?: number; explode?: number }`；`parseSandboxQuery(search: string, knownProducts: ReadonlySet<string>): SandboxInit`
  - `T`（`src/ui/strings.ts`）：見下方完整內容

- [ ] **Step 1：撰寫失敗的測試 `src/scene/quality.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { QUALITY, detectQuality } from './quality'

describe('QUALITY', () => {
  it('fills whole layers and respects the block caps', () => {
    for (const q of ['high', 'low'] as const) {
      for (const spec of [QUALITY[q].etf, QUALITY[q].fund]) {
        expect(spec.total % (spec.w * spec.d), `${q}`).toBe(0)
      }
    }
    expect(QUALITY.high.etf.total).toBe(1000)
    expect(QUALITY.low.etf.total).toBeLessThanOrEqual(350)
  })
})

describe('detectQuality', () => {
  it('uses low quality for touch devices or few cores', () => {
    expect(detectQuality({ coarsePointer: true, cores: 16 })).toBe('low')
    expect(detectQuality({ coarsePointer: false, cores: 4 })).toBe('low')
    expect(detectQuality({ coarsePointer: false, cores: 8 })).toBe('high')
    expect(detectQuality({ coarsePointer: false, cores: undefined })).toBe('high')
  })
})
```

- [ ] **Step 2：撰寫失敗的測試 `src/store/sandbox.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSandbox, effectiveExplode, parseSandboxQuery } from './sandbox'

const known = new Set(['0050', 'QQQ'])

beforeEach(() => useSandbox.setState(useSandbox.getInitialState()))

describe('useSandbox', () => {
  it('starts on 0050 with nothing cut, exploded or picked', () => {
    const s = useSandbox.getState()
    expect(s.productId).toBe('0050')
    expect(s.slice).toBe(0)
    expect(s.explode).toBe(0)
    expect(s.picked).toBeNull()
  })

  it('selecting a product resets cut, explode and pick', () => {
    const s = useSandbox.getState()
    s.setSlice(0.5)
    s.setExplode(0.7)
    s.pick({ productId: '0050', holdingId: '2330' })
    s.selectProduct('QQQ')
    expect(useSandbox.getState()).toMatchObject({ productId: 'QQQ', slice: 0, explode: 0, picked: null })
  })

  it('clamps slider values to [0, 1] and maps NaN to 0', () => {
    const s = useSandbox.getState()
    s.setSlice(2)
    expect(useSandbox.getState().slice).toBe(1)
    s.setExplode(-1)
    expect(useSandbox.getState().explode).toBe(0)
    s.setSlice(Number.NaN)
    expect(useSandbox.getState().slice).toBe(0)
  })

  it('holding the explode key overrides the slider', () => {
    expect(effectiveExplode({ explode: 0.2, explodeHeld: false })).toBe(0.2)
    expect(effectiveExplode({ explode: 0.2, explodeHeld: true })).toBe(1)
  })
})

describe('parseSandboxQuery', () => {
  it('reads known products, axis and clamped sliders', () => {
    expect(parseSandboxQuery('?product=QQQ&axis=y&slice=0.5&explode=3', known)).toEqual({
      productId: 'QQQ', sliceAxis: 'y', slice: 0.5, explode: 1,
    })
  })

  it('ignores unknown products, bad axes and non-numbers', () => {
    expect(parseSandboxQuery('?product=NOPE&axis=w&slice=abc', known)).toEqual({})
    expect(parseSandboxQuery('', known)).toEqual({})
  })
})
```

- [ ] **Step 3：執行測試，確認失敗**

Run: `npx vitest run src/scene/quality.test.ts src/store/sandbox.test.ts`
Expected：FAIL，找不到模組。

- [ ] **Step 4：實作 `src/scene/quality.ts`**

```ts
export type Quality = 'high' | 'low'
export type BoxSpec = { w: number; d: number; total: number }
export type QualityConfig = { etf: BoxSpec; fund: BoxSpec; shadows: boolean; dpr: [number, number] }

/** ETF 是立方體（交易所櫃台上的混合方塊），基金是細長小塔 */
export const QUALITY: Record<Quality, QualityConfig> = {
  high: { etf: { w: 10, d: 10, total: 1000 }, fund: { w: 6, d: 6, total: 504 }, shadows: true, dpr: [1, 2] },
  low: { etf: { w: 7, d: 7, total: 343 }, fund: { w: 4, d: 4, total: 160 }, shadows: false, dpr: [1, 1.5] },
}

export function detectQuality(env: { coarsePointer: boolean; cores: number | undefined }): Quality {
  return env.coarsePointer || (env.cores ?? 8) <= 4 ? 'low' : 'high'
}

export function readEnv(): { coarsePointer: boolean; cores: number | undefined } {
  return {
    coarsePointer: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
  }
}
```

- [ ] **Step 5：實作 `src/store/sandbox.ts`**

```ts
import { create } from 'zustand'
import type { SliceAxis } from '../scene/layout/voxels'

export type Picked = { productId: string; holdingId: string } | null

type SandboxState = {
  productId: string | null
  sliceAxis: SliceAxis
  /** 切割量 0～1 */
  slice: number
  /** 拆開程度 0～1（拉桿） */
  explode: number
  /** 按住空白鍵時為 true，拆開程度視為 1 */
  explodeHeld: boolean
  picked: Picked
  selectProduct: (id: string | null) => void
  setSliceAxis: (a: SliceAxis) => void
  setSlice: (v: number) => void
  setExplode: (v: number) => void
  setExplodeHeld: (held: boolean) => void
  pick: (p: Picked) => void
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

export const useSandbox = create<SandboxState>()((set) => ({
  productId: '0050',
  sliceAxis: 'x',
  slice: 0,
  explode: 0,
  explodeHeld: false,
  picked: null,
  selectProduct: (id) => set({ productId: id, slice: 0, explode: 0, picked: null }),
  setSliceAxis: (a) => set({ sliceAxis: a }),
  setSlice: (v) => set({ slice: clamp01(v) }),
  setExplode: (v) => set({ explode: clamp01(v) }),
  setExplodeHeld: (held) => set({ explodeHeld: held }),
  pick: (p) => set({ picked: p }),
}))

export function effectiveExplode(s: { explode: number; explodeHeld: boolean }): number {
  return s.explodeHeld ? 1 : s.explode
}

export type SandboxInit = { productId?: string; sliceAxis?: SliceAxis; slice?: number; explode?: number }

/** 網址參數 → 初始狀態，例如 ?product=0050&axis=x&slice=0.5&explode=0（方便分享與截圖驗證） */
export function parseSandboxQuery(search: string, knownProducts: ReadonlySet<string>): SandboxInit {
  const q = new URLSearchParams(search)
  const out: SandboxInit = {}
  const product = q.get('product')
  if (product && knownProducts.has(product)) out.productId = product
  const axis = q.get('axis')
  if (axis === 'x' || axis === 'y' || axis === 'z') out.sliceAxis = axis
  for (const key of ['slice', 'explode'] as const) {
    const raw = q.get(key)
    if (raw === null) continue
    const n = Number(raw)
    if (Number.isFinite(n)) out[key] = clamp01(n)
  }
  return out
}
```

- [ ] **Step 6：建立 `src/ui/strings.ts`**

```ts
/** 所有介面文字（繁體中文）。新增文字一律加在這裡。 */
export const T = {
  appTitle: '積木城市',
  disclaimer: (date: string) => `資料為 ${date} 快照，僅供教學，不構成投資建議。`,
  heightNote: '大樓高度為市值的對數比例；籃子裡的方塊數量嚴格依照權重。',
  islands: { TW: '台灣島', US: '美國大陸' },
  regions: { TW: '台灣', US: '美國', GLOBAL: '全球' },
  exchange: '交易所櫃台',
  products: '選擇商品',
  etfs: 'ETF（照藍圖壓縮的混合方塊）',
  funds: '基金（怪手堆的小塔）',
  slice: '雷射刀切割',
  sliceAxis: { x: '直切（左右）', z: '直切（前後）', y: '橫切（上下）' },
  explode: '拆開',
  explodeHint: '桌機也可以按住空白鍵拆開',
  legend: '組成（依權重）',
  weight: '權重',
  asOf: '資料日期',
  source: '來源',
  unverified: '待驗證',
  aggregateNote: '這是彙總部位，不代表單一公司。',
  partOf: (name: string) => `${name} 的組成`,
  close: '關閉',
} as const
```

- [ ] **Step 7：執行測試，確認通過**

Run: `npx vitest run src/scene/quality.test.ts src/store/sandbox.test.ts && npx tsc --noEmit`
Expected：全部 PASS。

- [ ] **Step 8：Commit**

```bash
git add src/scene/quality.ts src/scene/quality.test.ts src/store/sandbox.ts src/store/sandbox.test.ts src/ui/strings.ts
git commit -m "feat: add quality presets, sandbox store with URL init, and UI strings"
```

---

### Task 7：截圖工具

**Files:**
- Create: `scripts/screenshot.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces：`npm run screenshot -- <url> <out.png> [width] [height] [waitMs]`。頁面有 console error 或 page error 時以 exit code 1 結束並印出錯誤；成功印出 `saved <out.png>`。截圖一律存到 `.superpowers/sdd/shots/`（已被 git 忽略）。

- [ ] **Step 1：安裝 Playwright 與 Chromium**

```bash
npm install -D playwright
npx playwright install chromium
```

Expected：安裝成功。如果 Chromium 因為缺系統函式庫無法啟動（WSL 常見），**不要用 sudo**，回報 BLOCKED 並附錯誤訊息。

- [ ] **Step 2：建立 `scripts/screenshot.mjs`**

```js
import { chromium } from 'playwright'

const [url = 'http://localhost:5173/', out = '.superpowers/sdd/shots/shot.png', w = '1280', h = '800', wait = '2000'] =
  process.argv.slice(2)

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(wait))
await page.screenshot({ path: out })
await browser.close()
if (errors.length) {
  console.error(`Console errors:\n${errors.join('\n')}`)
  process.exit(1)
}
console.log(`saved ${out}`)
```

- [ ] **Step 3：在 `package.json` 的 scripts 加入**

```json
    "screenshot": "node scripts/screenshot.mjs",
```

- [ ] **Step 4：用目前的示範方塊驗證工具**

```bash
mkdir -p .superpowers/sdd/shots
npx vite --port 5174 --strictPort &   # 背景啟動
sleep 3
npm run screenshot -- http://localhost:5174/ .superpowers/sdd/shots/task7-demo.png
kill %1
```

Expected：印出 `saved .superpowers/sdd/shots/task7-demo.png`。用 Read 工具打開這張 PNG，確認畫面中有淺藍背景與一顆橘色方塊（代表無頭瀏覽器的 WebGL 可用）。如果畫面全黑或沒有方塊，回報 BLOCKED 並附截圖路徑。

- [ ] **Step 5：Commit**

```bash
git add scripts/screenshot.mjs package.json package-lock.json
git commit -m "chore: add playwright screenshot tool for visual checks"
```

---

### Task 8：籃子 3D 元件（方塊、切割、拆開、點選）

**Files:**
- Create: `src/scene/materials.tsx`, `src/scene/VoxelInstances.tsx`, `src/scene/LaserPlane.tsx`, `src/scene/BasketView.tsx`, `src/scene/Scene.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes：`universe`、`isBasket`（data）；`allocateBlocks`（sim）；`productLooks`、`BlockLook`、`MaterialKind`（Task 3）；`voxels.ts` 全部（Task 4）；`QUALITY`、`Quality`、`detectQuality`、`readEnv`（Task 6）；`useSandbox`、`effectiveExplode`、`parseSandboxQuery`（Task 6）
- Produces：
  - `BlockMaterial({ kind }: { kind: MaterialKind })`
  - `VoxelInstances(props: { voxels: Voxel[]; looks: BlockLook[]; w: number; d: number; explode: number; cut: CutSpec | null; highlightGroup: number | null; onPick?: (group: number) => void })`
  - `LaserPlane(props: { cut: CutSpec; w: number; d: number; height: number })`
  - `BasketView(props: { productId: string; quality: Quality; position: [number, number, number] })`
  - `Scene(props: { quality: Quality })`；`EXCHANGE_POSITION: [number, number, number]`

- [ ] **Step 1：建立 `src/scene/materials.tsx`**

```tsx
import type { MaterialKind } from './palette'

/** 實際顏色由 InstancedMesh 的 instanceColor 提供，這裡只決定質感 */
export function BlockMaterial({ kind }: { kind: MaterialKind }) {
  switch (kind) {
    case 'matte':
      return <meshStandardMaterial roughness={0.8} metalness={0} />
    case 'metal':
      return <meshStandardMaterial roughness={0.35} metalness={0.7} />
    case 'diamond':
      return <meshPhysicalMaterial roughness={0.05} metalness={0} transmission={0.6} thickness={0.5} ior={2.4} />
    case 'glass':
      return <meshPhysicalMaterial roughness={0.15} transmission={0.5} thickness={0.3} transparent opacity={0.85} />
    case 'gold':
      return <meshStandardMaterial roughness={0.25} metalness={1} />
  }
}
```

- [ ] **Step 2：建立 `src/scene/VoxelInstances.tsx`**

```tsx
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, type InstancedMesh, Object3D } from 'three'
import type { BlockLook, MaterialKind } from './palette'
import { BlockMaterial } from './materials'
import { approach, explodeOffsetY, isHidden, voxelPosition, VOXEL_SCALE, type CutSpec, type Voxel } from './layout/voxels'

type Props = {
  voxels: Voxel[]
  looks: BlockLook[]
  w: number
  d: number
  explode: number
  cut: CutSpec | null
  highlightGroup: number | null
  onPick?: (group: number) => void
}

const DIM = 0.35

/** 依材質分組：一種材質一個 InstancedMesh */
export function VoxelInstances(props: Props) {
  const { voxels, looks } = props
  const byKind = useMemo(() => {
    const m = new Map<MaterialKind, Voxel[]>()
    for (const v of voxels) {
      const kind = looks[v.group]!.kind
      const list = m.get(kind)
      if (list) list.push(v)
      else m.set(kind, [v])
    }
    return [...m]
  }, [voxels, looks])
  return (
    <>
      {byKind.map(([kind, vs]) => (
        <KindMesh key={`${kind}-${vs.length}`} {...props} kind={kind} voxels={vs} />
      ))}
    </>
  )
}

function KindMesh({ kind, voxels, looks, w, d, explode, cut, highlightGroup, onPick }: Props & { kind: MaterialKind }) {
  const ref = useRef<InstancedMesh>(null)
  const anim = useRef({ explode, dirty: true })
  const dummy = useMemo(() => new Object3D(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const c = new Color()
    voxels.forEach((v, i) => {
      c.set(looks[v.group]!.color)
      if (highlightGroup !== null && v.group !== highlightGroup) c.multiplyScalar(DIM)
      mesh.setColorAt(i, c)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [voxels, looks, highlightGroup])

  useLayoutEffect(() => {
    anim.current.dirty = true
  }, [voxels, cut, w, d])

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const a = anim.current
    const next = approach(a.explode, explode, dt)
    if (!a.dirty && Math.abs(next - a.explode) < 1e-4) return
    a.explode = Math.abs(next - explode) < 1e-3 ? explode : next
    a.dirty = false
    voxels.forEach((v, i) => {
      const [x, y, z] = voxelPosition(v, w, d)
      dummy.position.set(x, y + explodeOffsetY(v.group, a.explode), z)
      dummy.scale.setScalar(cut !== null && isHidden(v, cut) ? 0 : VOXEL_SCALE)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId === undefined) return
    const v = voxels[e.instanceId]
    if (v) onPick?.(v.group)
  }

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, voxels.length]} onClick={handleClick} castShadow receiveShadow>
      <boxGeometry />
      <BlockMaterial kind={kind} />
    </instancedMesh>
  )
}
```

- [ ] **Step 3：建立 `src/scene/LaserPlane.tsx`**

```tsx
import { DoubleSide } from 'three'
import { cutPlanePosition, type CutSpec } from './layout/voxels'

const PAD = 1

function LaserMaterial() {
  return <meshBasicMaterial color="#ff2d6f" transparent opacity={0.28} side={DoubleSide} depthWrite={false} />
}

/** 雷射刀的切面；height 為籃子含拆開位移的總高 */
export function LaserPlane({ cut, w, d, height }: { cut: CutSpec; w: number; d: number; height: number }) {
  const p = cutPlanePosition(cut, w, d)
  if (cut.axis === 'y') {
    return (
      <mesh position={[0, p, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w + PAD, d + PAD]} />
        <LaserMaterial />
      </mesh>
    )
  }
  if (cut.axis === 'x') {
    return (
      <mesh position={[p, height / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[d + PAD, height + PAD]} />
        <LaserMaterial />
      </mesh>
    )
  }
  return (
    <mesh position={[0, height / 2, p]}>
      <planeGeometry args={[w + PAD, height + PAD]} />
      <LaserMaterial />
    </mesh>
  )
}
```

- [ ] **Step 4：建立 `src/scene/BasketView.tsx`**

```tsx
import { useMemo } from 'react'
import { universe } from '../data'
import { allocateBlocks } from '../sim/allocate'
import { useSandbox, effectiveExplode } from '../store/sandbox'
import { productLooks } from './palette'
import { QUALITY, type Quality } from './quality'
import { cutThreshold, EXPLODE_GAP, layersFor, sizeAlong, stackVoxels, type CutSpec } from './layout/voxels'
import { VoxelInstances } from './VoxelInstances'
import { LaserPlane } from './LaserPlane'

type Props = { productId: string; quality: Quality; position: [number, number, number] }

/** 把 ETF／基金換算成方塊：ETF 是立方體，基金是小塔；方塊數嚴格依權重。 */
export function BasketView({ productId, quality, position }: Props) {
  const product = universe.get(productId)
  if (!product?.holdings) throw new Error(`not a basket: ${productId}`)
  const holdings = product.holdings
  const spec = product.type === 'etf' ? QUALITY[quality].etf : QUALITY[quality].fund
  const layers = layersFor(spec.total, spec.w, spec.d)

  const looks = useMemo(() => productLooks(universe, productId), [productId])
  const voxels = useMemo(
    () => stackVoxels(allocateBlocks(holdings.map((h) => ({ id: h.id, weight: h.weightPct })), spec.total), spec.w, spec.d),
    [holdings, spec],
  )

  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox(effectiveExplode)
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)

  const cut = useMemo<CutSpec | null>(
    () => (slice > 0 ? { axis: sliceAxis, threshold: cutThreshold(sizeAlong(sliceAxis, spec.w, spec.d, layers), slice) } : null),
    [slice, sliceAxis, spec, layers],
  )
  const idx = picked?.productId === productId ? holdings.findIndex((h) => h.id === picked.holdingId) : -1

  return (
    <group position={position}>
      <VoxelInstances
        voxels={voxels}
        looks={looks}
        w={spec.w}
        d={spec.d}
        explode={explode}
        cut={cut}
        highlightGroup={idx >= 0 ? idx : null}
        onPick={(g) => pick({ productId, holdingId: holdings[g]!.id })}
      />
      {cut && <LaserPlane cut={cut} w={spec.w} d={spec.d} height={layers + EXPLODE_GAP * holdings.length} />}
    </group>
  )
}
```

- [ ] **Step 5：建立 `src/scene/Scene.tsx`**

```tsx
import { OrbitControls } from '@react-three/drei'
import { useSandbox } from '../store/sandbox'
import { BasketView } from './BasketView'
import type { Quality } from './quality'

/** 交易所櫃台的位置：兩座島中間偏前 */
export const EXCHANGE_POSITION: [number, number, number] = [0, 0, 14]
const PEDESTAL_HEIGHT = 0.6

function Pedestal() {
  return (
    <mesh position={[EXCHANGE_POSITION[0], PEDESTAL_HEIGHT / 2, EXCHANGE_POSITION[2]]} receiveShadow castShadow>
      <boxGeometry args={[12, PEDESTAL_HEIGHT, 12]} />
      <meshStandardMaterial color="#e9e4d8" />
    </mesh>
  )
}

export function Scene({ quality }: { quality: Quality }) {
  const productId = useSandbox((s) => s.productId)
  return (
    <>
      <color attach="background" args={['#cfe8ff']} />
      <hemisphereLight args={['#ffffff', '#b0c4de', 0.8]} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.5} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#9cc9e8" />
      </mesh>
      <Pedestal />
      {productId && (
        <BasketView
          key={`${productId}-${quality}`}
          productId={productId}
          quality={quality}
          position={[EXCHANGE_POSITION[0], PEDESTAL_HEIGHT, EXCHANGE_POSITION[2]]}
        />
      )}
      <OrbitControls makeDefault target={[0, 4, 10]} maxPolarAngle={Math.PI * 0.48} minDistance={8} maxDistance={90} />
    </>
  )
}
```

- [ ] **Step 6：改寫 `src/App.tsx`**

```tsx
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { QUALITY, detectQuality, readEnv } from './scene/quality'
import { useSandbox } from './store/sandbox'

export default function App() {
  const quality = useMemo(() => detectQuality(readEnv()), [])
  const cfg = QUALITY[quality]
  const pick = useSandbox((s) => s.pick)
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows={cfg.shadows} dpr={cfg.dpr} camera={{ position: [0, 16, 36], fov: 45 }} onPointerMissed={() => pick(null)}>
        <Scene quality={quality} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 7：改寫 `src/main.tsx`，用網址參數初始化狀態**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { universe } from './data'
import { isBasket } from './data/schema'
import { parseSandboxQuery, useSandbox } from './store/sandbox'

const baskets = new Set([...universe.values()].filter(isBasket).map((a) => a.id))
useSandbox.setState(parseSandboxQuery(window.location.search, baskets))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 8：型別檢查、測試、建置**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected：全部通過（three.js chunk 體積警告可忽略）。

- [ ] **Step 9：截圖驗證**

背景啟動 `npx vite --port 5174 --strictPort`，然後：

```bash
npm run screenshot -- "http://localhost:5174/" .superpowers/sdd/shots/task8-0050.png
npm run screenshot -- "http://localhost:5174/?product=0050&axis=x&slice=0.5" .superpowers/sdd/shots/task8-0050-cut.png
npm run screenshot -- "http://localhost:5174/?product=JH_BALANCED&explode=1" .superpowers/sdd/shots/task8-jh-explode.png
```

用 Read 打開三張圖，在報告中逐張描述你看到的畫面：
- `task8-0050.png`：櫃台上有一顆 10×10×10 的方塊，下半部約 57% 是藍色（台積電），上方有灰色（其他台股）
- `task8-0050-cut.png`：方塊被切掉一半，有半透明粉紅切面，切面上看得到依權重厚薄的水平地層
- `task8-jh-explode.png`：一座 6×6 的小塔，各持股的地層上下分開

任何一張不符，修正後重拍。截圖工具回報 console error 也要修。結束後關閉 dev server。

- [ ] **Step 10：Commit**

```bash
git add src/scene/materials.tsx src/scene/VoxelInstances.tsx src/scene/LaserPlane.tsx src/scene/BasketView.tsx src/scene/Scene.tsx src/App.tsx src/main.tsx
git commit -m "feat(scene): render baskets as voxels with laser cut, explode and picking"
```

---

### Task 9：積木城市

**Files:**
- Create: `src/scene/City.tsx`
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes：`cityLayout`、`buildingVoxels`、`islandSize`、`ISLAND_CENTERS`（Task 5）；`lookFor`（Task 3）；`VOXEL_SCALE`（Task 4）；`useSandbox`（Task 6）；`T`（Task 6）
- Produces：`City()`。點大樓時 `pick({ productId: stockId, holdingId: stockId })`。

- [ ] **Step 1：建立 `src/scene/City.tsx`**

```tsx
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Color, type InstancedMesh, Object3D } from 'three'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { T } from '../ui/strings'
import { lookFor } from './palette'
import { VOXEL_SCALE } from './layout/voxels'
import { buildingVoxels, cityLayout, islandSize, ISLAND_CENTERS, type Region } from './layout/city'

const ISLAND_COLORS: Record<Region, string> = { TW: '#a5d6a7', US: '#e6d3a3' }
const ISLAND_THICKNESS = 0.5

const labelStyle = {
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  fontSize: 12,
  padding: '1px 6px',
  borderRadius: 6,
  background: 'rgba(255,255,255,0.85)',
  color: '#1f2933',
} as const

/** 兩座島與大樓；每棟大樓是一根方塊柱，所有大樓共用一個 InstancedMesh */
export function City() {
  const placements = useMemo(() => cityLayout([...universe.values()]), [])
  const voxels = useMemo(() => buildingVoxels(placements), [placements])
  const ref = useRef<InstancedMesh>(null)
  const pick = useSandbox((s) => s.pick)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    voxels.forEach((v, i) => {
      o.position.set(v.x, v.y, v.z)
      o.scale.setScalar(VOXEL_SCALE)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      c.set(lookFor(universe.get(v.id)!).color)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [voxels])

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId === undefined) return
    const v = voxels[e.instanceId]
    if (v) pick({ productId: v.id, holdingId: v.id })
  }

  return (
    <group>
      {(['TW', 'US'] as const).map((region) => {
        const [x, z] = ISLAND_CENTERS[region]
        const size = islandSize(placements.filter((p) => p.region === region).length)
        return (
          <group key={region}>
            <mesh position={[x, -ISLAND_THICKNESS / 2, z]} receiveShadow>
              <boxGeometry args={[size, ISLAND_THICKNESS, size]} />
              <meshStandardMaterial color={ISLAND_COLORS[region]} />
            </mesh>
            <Html position={[x, 0.2, z + size / 2 + 1]} center distanceFactor={40} style={{ ...labelStyle, fontSize: 16, fontWeight: 600 }}>
              {T.islands[region]}
            </Html>
          </group>
        )
      })}
      <instancedMesh ref={ref} args={[undefined, undefined, voxels.length]} castShadow receiveShadow onClick={onClick}>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      {placements.map((p) => (
        <Html key={p.id} position={[p.x, p.height + 0.8, p.z]} center distanceFactor={30} style={labelStyle}>
          {universe.get(p.id)!.name}
        </Html>
      ))}
    </group>
  )
}
```

- [ ] **Step 2：在 `src/scene/Scene.tsx` 加入城市**

在 import 區加入：
```tsx
import { City } from './City'
```
在 `<Pedestal />` 之前加入：
```tsx
      <City />
```

- [ ] **Step 3：型別檢查、測試、建置**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected：全部通過。

- [ ] **Step 4：截圖驗證**

背景啟動 `npx vite --port 5174 --strictPort`，然後：

```bash
npm run screenshot -- "http://localhost:5174/" .superpowers/sdd/shots/task9-city.png
```

用 Read 打開，在報告中描述：左邊綠色的台灣島、右邊米色的美國大陸，島上有高低不同的方塊大樓（台積電、輝達等最高），每棟有中文名稱標籤，前方櫃台上是 0050 方塊。標籤過度重疊到看不清楚時，調小 `distanceFactor` 或字級後重拍。結束後關閉 dev server。

- [ ] **Step 5：Commit**

```bash
git add src/scene/City.tsx src/scene/Scene.tsx
git commit -m "feat(scene): add block city islands and buildings"
```

---

### Task 10：沙盒介面

**Files:**
- Create: `src/ui/model.ts`, `src/ui/SandboxPanel.tsx`, `src/ui/PickInfoPanel.tsx`, `src/ui/Disclaimer.tsx`, `src/ui/useExplodeKey.ts`, `src/ui/ui.css`
- Modify: `src/App.tsx`, `index.html`
- Test: `src/ui/model.test.ts`

**Interfaces:**
- Consumes：`universe`、`SNAPSHOT_DATE`、`isVerified`（data）；`productLooks`（Task 3）；`useSandbox`、`Picked`（Task 6）；`T`（Task 6）
- Produces：
  - `productGroups(u: Universe): { etfs: Asset[]; funds: Asset[] }`
  - `type LegendRow = { id: string; name: string; weightPct: number; color: string; aggregate: boolean }`；`legendRows(u: Universe, productId: string): LegendRow[]`
  - `formatPct(pct: number): string`
  - `type PickInfo = { title: string; subtitle: string; weightPct: number | null; asOf: string; verified: boolean; aggregate: boolean; sources: string[] }`；`pickInfo(u: Universe, picked: Picked): PickInfo | null`
  - 元件 `SandboxPanel()`、`PickInfoPanel()`、`Disclaimer()`；hook `useExplodeKey()`

- [ ] **Step 1：撰寫失敗的測試 `src/ui/model.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { productGroups, legendRows, formatPct, pickInfo } from './model'

describe('productGroups', () => {
  it('splits baskets into ETFs and funds in data order', () => {
    const g = productGroups(universe)
    expect(g.etfs.map((a) => a.id)).toEqual(['0050', 'QQQ', 'SPY'])
    expect(g.funds.map((a) => a.id)).toEqual([
      'ALLIANZ_TAIWAN', 'JH_BALANCED', 'SCHRODER_GLOBAL_INCOME_BOND', 'SCHRODER_GLOBAL_INCOME_BOND_BACKLOAD', 'ALLIANZ_INCOME_GROWTH',
    ])
  })
})

describe('legendRows', () => {
  it('lists holdings with names, weights and distinct colors', () => {
    const rows = legendRows(universe, '0050')
    expect(rows[0]).toMatchObject({ id: '2330', name: '台積電', weightPct: 57.35, aggregate: false })
    expect(rows.at(-1)).toMatchObject({ id: 'OTHER_TW_STOCK', aggregate: true })
    expect(new Set(rows.map((r) => r.color)).size).toBe(rows.length)
  })

  it('returns nothing for non-baskets', () => {
    expect(legendRows(universe, '2330')).toEqual([])
  })
})

describe('formatPct', () => {
  it('shows two decimals', () => {
    expect(formatPct(57.35)).toBe('57.35%')
    expect(formatPct(5.6)).toBe('5.60%')
  })
})

describe('pickInfo', () => {
  it('describes a holding inside a basket with the basket date and holdings flag', () => {
    expect(pickInfo(universe, { productId: '0050', holdingId: '2330' })).toMatchObject({
      title: '台積電', subtitle: '元大台灣50 的組成', weightPct: 57.35, asOf: '2026-08-01', verified: true, aggregate: false,
    })
  })

  it('flags unverified holdings and aggregate buckets', () => {
    expect(pickInfo(universe, { productId: 'JH_BALANCED', holdingId: 'NVDA' })?.verified).toBe(false)
    expect(pickInfo(universe, { productId: '0050', holdingId: 'OTHER_TW_STOCK' })?.aggregate).toBe(true)
  })

  it('describes a building (a stock on its own)', () => {
    const info = pickInfo(universe, { productId: '2330', holdingId: '2330' })
    expect(info).toMatchObject({ title: '台積電', weightPct: null })
    expect(info?.subtitle).toContain('台灣')
  })

  it('returns null for nothing picked or unknown ids', () => {
    expect(pickInfo(universe, null)).toBeNull()
    expect(pickInfo(universe, { productId: 'NOPE', holdingId: 'NOPE' })).toBeNull()
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/ui/model.test.ts`
Expected：FAIL，找不到 `./model`。

- [ ] **Step 3：實作 `src/ui/model.ts`**

```ts
import type { Asset } from '../data/schema'
import type { Universe } from '../data/universe'
import { isVerified } from '../data/verified'
import { productLooks } from '../scene/palette'
import type { Picked } from '../store/sandbox'
import { T } from './strings'

export function productGroups(u: Universe): { etfs: Asset[]; funds: Asset[] } {
  const all = [...u.values()]
  return { etfs: all.filter((a) => a.type === 'etf'), funds: all.filter((a) => a.type === 'fund') }
}

export type LegendRow = { id: string; name: string; weightPct: number; color: string; aggregate: boolean }

export function legendRows(u: Universe, productId: string): LegendRow[] {
  const p = u.get(productId)
  if (!p?.holdings) return []
  const looks = productLooks(u, productId)
  return p.holdings.map((h, i) => {
    const a = u.get(h.id)!
    return { id: h.id, name: a.name, weightPct: h.weightPct, color: looks[i]!.color, aggregate: a.aggregate ?? false }
  })
}

export const formatPct = (pct: number): string => `${pct.toFixed(2)}%`

export type PickInfo = {
  title: string
  subtitle: string
  weightPct: number | null
  asOf: string
  verified: boolean
  aggregate: boolean
  sources: string[]
}

export function pickInfo(u: Universe, picked: Picked): PickInfo | null {
  if (!picked) return null
  const product = u.get(picked.productId)
  const holding = u.get(picked.holdingId)
  if (!product || !holding) return null
  if (product.holdings) {
    const h = product.holdings.find((x) => x.id === holding.id)
    if (!h) return null
    return {
      title: holding.name,
      subtitle: T.partOf(product.name),
      weightPct: h.weightPct,
      asOf: product.asOf,
      verified: isVerified(product, 'holdings'),
      aggregate: holding.aggregate ?? false,
      sources: product.source,
    }
  }
  const region = holding.region ? T.regions[holding.region] : ''
  return {
    title: holding.name,
    subtitle: [region, holding.nameEn].filter(Boolean).join('・'),
    weightPct: null,
    asOf: holding.asOf,
    verified: isVerified(holding, 'marketCap'),
    aggregate: holding.aggregate ?? false,
    sources: holding.source,
  }
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/ui/model.test.ts && npx tsc --noEmit`
Expected：全部 PASS。

- [ ] **Step 5：建立 `src/ui/useExplodeKey.ts`**

```ts
import { useEffect } from 'react'
import { useSandbox } from '../store/sandbox'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && t.type !== 'range')

/** 桌機：按住空白鍵拆開，放開復原 */
export function useExplodeKey() {
  const setHeld = useSandbox((s) => s.setExplodeHeld)
  useEffect(() => {
    const onKey = (held: boolean) => (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTyping(e.target)) return
      e.preventDefault()
      setHeld(held)
    }
    const down = onKey(true)
    const up = onKey(false)
    const blur = () => setHeld(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [setHeld])
}
```

- [ ] **Step 6：建立 `src/ui/SandboxPanel.tsx`**

```tsx
import { useMemo } from 'react'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { formatPct, legendRows, productGroups } from './model'
import { T } from './strings'

export function SandboxPanel() {
  const { etfs, funds } = useMemo(() => productGroups(universe), [])
  const productId = useSandbox((s) => s.productId)
  const sliceAxis = useSandbox((s) => s.sliceAxis)
  const slice = useSandbox((s) => s.slice)
  const explode = useSandbox((s) => s.explode)
  const { selectProduct, setSliceAxis, setSlice, setExplode, pick } = useSandbox.getState()
  const rows = useMemo(() => (productId ? legendRows(universe, productId) : []), [productId])

  const chip = (id: string, name: string) => (
    <button key={id} className="chip" aria-pressed={id === productId} onClick={() => selectProduct(id)}>
      {name}
    </button>
  )

  return (
    <aside className="panel">
      <h1 className="panel__title">{T.appTitle}</h1>

      <section>
        <h2>{T.products}</h2>
        <h3>{T.etfs}</h3>
        <div className="chips">{etfs.map((a) => chip(a.id, a.name))}</div>
        <h3>{T.funds}</h3>
        <div className="chips">{funds.map((a) => chip(a.id, a.name))}</div>
      </section>

      <section>
        <h2>{T.slice}</h2>
        <div className="seg" role="group" aria-label={T.slice}>
          {(['x', 'z', 'y'] as const).map((ax) => (
            <button key={ax} aria-pressed={ax === sliceAxis} onClick={() => setSliceAxis(ax)}>
              {T.sliceAxis[ax]}
            </button>
          ))}
        </div>
        <input type="range" min={0} max={1} step={0.01} value={slice} aria-label={T.slice} onChange={(e) => setSlice(Number(e.target.value))} />
      </section>

      <section>
        <h2>{T.explode}</h2>
        <input type="range" min={0} max={1} step={0.01} value={explode} aria-label={T.explode} onChange={(e) => setExplode(Number(e.target.value))} />
        <p className="hint">{T.explodeHint}</p>
      </section>

      {productId && (
        <section>
          <h2>{T.legend}</h2>
          <ul className="legend">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => pick({ productId, holdingId: r.id })}>
                  <span className="swatch" style={{ background: r.color }} />
                  <span className="legend__name">{r.name}</span>
                  <span className="legend__pct">{formatPct(r.weightPct)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="hint">{T.heightNote}</p>
    </aside>
  )
}
```

- [ ] **Step 7：建立 `src/ui/PickInfoPanel.tsx`**

```tsx
import { useMemo } from 'react'
import { universe } from '../data'
import { useSandbox } from '../store/sandbox'
import { formatPct, pickInfo } from './model'
import { T } from './strings'

export function PickInfoPanel() {
  const picked = useSandbox((s) => s.picked)
  const pick = useSandbox((s) => s.pick)
  const info = useMemo(() => pickInfo(universe, picked), [picked])
  if (!info) return null
  return (
    <div className="info" role="dialog" aria-label={info.title}>
      <button className="info__close" aria-label={T.close} onClick={() => pick(null)}>
        ×
      </button>
      <h2>{info.title}</h2>
      {info.subtitle && <p className="info__sub">{info.subtitle}</p>}
      {info.weightPct !== null && (
        <p>
          {T.weight}：<strong>{formatPct(info.weightPct)}</strong>
        </p>
      )}
      <p>
        {T.asOf}：{info.asOf} {!info.verified && <span className="badge">{T.unverified}</span>}
      </p>
      {info.aggregate && <p className="hint">{T.aggregateNote}</p>}
      {info.sources.length > 0 && (
        <p className="info__src">
          {T.source}：
          {info.sources.map((s) =>
            s.startsWith('http') ? (
              <a key={s} href={s} target="_blank" rel="noreferrer">
                {new URL(s).hostname}
              </a>
            ) : (
              <span key={s}>{s}</span>
            ),
          )}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 8：建立 `src/ui/Disclaimer.tsx`**

```tsx
import { SNAPSHOT_DATE } from '../data'
import { T } from './strings'

export function Disclaimer() {
  return <div className="disclaimer">{T.disclaimer(SNAPSHOT_DATE)}</div>
}
```

- [ ] **Step 9：建立 `src/ui/ui.css`**

```css
:root {
  --bg: #cfe8ff;
  --surface: rgba(255, 255, 255, 0.92);
  --text: #1f2933;
  --muted: #52606d;
  --accent: #ff2d6f;
  --chip: #eef2f7;
  --chip-on: #1f2933;
  --chip-on-text: #ffffff;
  --border: rgba(31, 41, 51, 0.12);
  --badge: #b45309;
  font-family: 'Noto Sans TC', system-ui, -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  color: var(--text);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --surface: rgba(24, 28, 36, 0.92);
    --text: #e4e7eb;
    --muted: #9aa5b1;
    --chip: #2a313c;
    --chip-on: #e4e7eb;
    --chip-on-text: #11151c;
    --border: rgba(228, 231, 235, 0.14);
    --badge: #fbbf24;
  }
}
html, body { margin: 0; height: 100%; background: var(--bg); }
* { box-sizing: border-box; }

.app { position: fixed; inset: 0; }

.panel {
  position: fixed; top: 12px; left: 12px; bottom: 12px; width: 300px;
  overflow-y: auto; padding: 14px 16px; border-radius: 14px;
  background: var(--surface); border: 1px solid var(--border);
  backdrop-filter: blur(8px);
}
.panel__title { margin: 0 0 8px; font-size: 20px; }
.panel h2 { margin: 14px 0 6px; font-size: 14px; }
.panel h3 { margin: 8px 0 4px; font-size: 12px; color: var(--muted); font-weight: 500; }
.panel input[type='range'] { width: 100%; accent-color: var(--accent); }

.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip, .seg button {
  border: 0; border-radius: 999px; padding: 5px 10px; font: inherit; font-size: 12px;
  background: var(--chip); color: var(--text); cursor: pointer;
}
.chip[aria-pressed='true'], .seg button[aria-pressed='true'] { background: var(--chip-on); color: var(--chip-on-text); }
.seg { display: flex; gap: 4px; margin-bottom: 6px; }

.legend { list-style: none; margin: 0; padding: 0; }
.legend button {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 4px 2px;
  border: 0; background: none; font: inherit; font-size: 13px; color: var(--text); cursor: pointer; text-align: left;
}
.swatch { width: 12px; height: 12px; border-radius: 3px; flex: none; }
.legend__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend__pct { font-variant-numeric: tabular-nums; color: var(--muted); }
.hint { font-size: 12px; color: var(--muted); margin: 6px 0 0; }

.info {
  position: fixed; top: 56px; right: 12px; width: 280px; padding: 14px 16px; border-radius: 14px;
  background: var(--surface); border: 1px solid var(--border);
}
.info h2 { margin: 0 24px 4px 0; font-size: 18px; }
.info p { margin: 6px 0; font-size: 13px; }
.info__sub { color: var(--muted); }
.info__close { position: absolute; top: 8px; right: 10px; border: 0; background: none; font-size: 20px; color: var(--muted); cursor: pointer; }
.info__src a, .info__src span { margin-right: 6px; color: var(--muted); word-break: break-all; }
.badge { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 6px; font-size: 11px; color: var(--badge); border: 1px solid currentColor; }

.disclaimer {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  max-width: calc(100% - 24px); padding: 6px 12px; border-radius: 999px; font-size: 12px;
  background: var(--surface); border: 1px solid var(--border); color: var(--muted); text-align: center;
}

@media (max-width: 720px) {
  .panel { top: auto; left: 0; right: 0; bottom: 0; width: auto; max-height: 42vh; border-radius: 14px 14px 0 0; }
  .info { top: auto; bottom: calc(42vh + 8px); left: 12px; right: 12px; width: auto; }
  .disclaimer { top: 8px; left: 8px; right: 8px; transform: none; max-width: none; border-radius: 10px; }
}
```

- [ ] **Step 10：改寫 `src/App.tsx`**

```tsx
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { QUALITY, detectQuality, readEnv } from './scene/quality'
import { useSandbox } from './store/sandbox'
import { SandboxPanel } from './ui/SandboxPanel'
import { PickInfoPanel } from './ui/PickInfoPanel'
import { Disclaimer } from './ui/Disclaimer'
import { useExplodeKey } from './ui/useExplodeKey'
import './ui/ui.css'

export default function App() {
  const quality = useMemo(() => detectQuality(readEnv()), [])
  const cfg = QUALITY[quality]
  const pick = useSandbox((s) => s.pick)
  useExplodeKey()
  return (
    <div className="app">
      <Canvas shadows={cfg.shadows} dpr={cfg.dpr} camera={{ position: [0, 16, 36], fov: 45 }} onPointerMissed={() => pick(null)}>
        <Scene quality={quality} />
      </Canvas>
      <SandboxPanel />
      <PickInfoPanel />
      <Disclaimer />
    </div>
  )
}
```

- [ ] **Step 11：在 `index.html` 的 `<head>` 加入字型，並移除 body 的行內樣式**

在 `<title>` 之後加入：
```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600&display=swap" rel="stylesheet" />
```
把 `<body style="margin:0">` 改成 `<body>`。

- [ ] **Step 12：型別檢查、測試、建置**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected：全部通過。

- [ ] **Step 13：截圖驗證（桌機與手機）**

背景啟動 `npx vite --port 5174 --strictPort`，然後：

```bash
npm run screenshot -- "http://localhost:5174/" .superpowers/sdd/shots/task10-desktop.png
npm run screenshot -- "http://localhost:5174/?product=0050&axis=x&slice=0.5" .superpowers/sdd/shots/task10-cut.png
npm run screenshot -- "http://localhost:5174/?product=ALLIANZ_INCOME_GROWTH&explode=1" .superpowers/sdd/shots/task10-aig.png 1280 800
npm run screenshot -- "http://localhost:5174/" .superpowers/sdd/shots/task10-mobile.png 390 844
```

用 Read 打開四張圖，在報告中逐張描述：
- 桌機：左側面板（商品按鈕、切割、拆開、組成圖例）、上方免責聲明、城市與 0050 方塊同時可見，面板沒有擋住籃子
- 切割：同 Task 8，且面板上「直切（左右）」被選取
- 安聯收益成長：小塔分層，可轉債（金屬）、高收益債（玻璃）、股票（霧面）質感不同
- 手機：面板變成底部抽屜，免責聲明在頂部，畫面不會橫向捲動

如果籃子被面板擋住，調整 `Scene.tsx` 的 OrbitControls `target` 或相機位置後重拍，並在報告中說明調整。結束後關閉 dev server。

- [ ] **Step 14：Commit**

```bash
git add src/ui src/App.tsx index.html
git commit -m "feat(ui): add sandbox panel, pick info, disclaimer and explode key"
```
