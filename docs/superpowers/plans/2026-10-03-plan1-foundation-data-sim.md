# 積木城市 Plan 1：基礎建設、資料快照、計算引擎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建好專案骨架、經 zod 驗證的靜態資料快照，以及純 TypeScript 計算引擎（方塊分配、持股攤平、重疊、情境衝擊、配息、費用），並用測試完整覆蓋。

**Architecture:** Vite + React + R3F 專案骨架，本計畫只放一個示範方塊確認 3D 能跑。`src/data/` 放 JSON 快照與 zod schema，`parseUniverse` 負責交叉驗證（id 是否存在、權重總和、循環持股）。`src/sim/` 全部是不碰畫面的純函式，之後的 3D 與 UI 計畫只會呼叫這些函式。

**Tech Stack:** Node ≥ 20、Vite、TypeScript（strict）、React 19、three、@react-three/fiber、@react-three/drei、zustand、zod（v4）、Vitest。

**規格：** `docs/superpowers/specs/2026-10-03-block-city-invest-design.md`

**計畫路線圖（本檔只涵蓋 Plan 1）：**
- Plan 1：基礎建設、資料快照、計算引擎（本檔）
- Plan 2：3D 基礎元件（城市、大樓、方塊材質、EtfCube、FundTower、Slicer、Exploder）與最小沙盒
- Plan 3：關卡系統、UI 疊層、金幣水滴與三道門的視覺化
- Plan 4：地底章節、效能降級、WebGL 備案、Playwright 端到端測試

## Global Constraints

- 介面只用繁體中文；本計畫沒有介面文字。
- 全站不談稅。證交稅只當作交易成本（賣出費用）處理。
- 持股權重一律用**百分比**，欄位名稱 `weightPct`（57.35 代表 57.35%）。
- 費率與報酬率一律用**小數**（0.0014 代表 0.14%）。
- 資料日期格式為 `YYYY-MM-DD`。
- 籃子（`etf`／`fund`）的持股權重總和必須是 100 ± 0.5，否則建置失敗。
- 尚未驗證的欄位在 `verified` 中標成 `false`；不可以把未驗證的數字當成事實寫進註解或文件。
- 「配息來自本金」只用示意參數演示，不套在任何真實基金上。
- TypeScript strict，不可以使用 `any`。

---

## File Structure

| 檔案 | 職責 |
|---|---|
| `package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、`.gitignore` | 專案骨架與 Vitest 設定 |
| `src/main.tsx`、`src/App.tsx` | 進入點；目前只有示範方塊 |
| `src/data/schema.ts` | zod `AssetSchema`、`Asset` 型別、類型常數 |
| `src/data/universe.ts` | `parseUniverse`：交叉驗證，產生 `Universe` |
| `src/data/snapshot/*.json` | 靜態快照：個股、資產類別桶、ETF、基金 |
| `src/data/index.ts` | 載入快照並匯出 `universe`、`SNAPSHOT_DATE` |
| `src/sim/allocate.ts` | 用最大餘數法把權重換算成方塊數量 |
| `src/sim/holdings.ts` | 攤平巢狀持股，得到各底層資產的曝險 |
| `src/sim/overlap.ts` | 兩個商品之間的重疊持股 |
| `src/sim/scenario.ts` | 假設情境的衝擊傳遞 |
| `src/sim/dividend.ts` | 除息守恆、配息型與累積型、配息來自本金 |
| `src/sim/fees.ts` | 三道門費用、持有年數對應的剩餘價值、交叉年 |
| `docs/data-sources.md` | 資料查證紀錄 |

測試檔放在被測檔案旁邊，命名為 `*.test.ts`。

---

### Task 1：專案骨架

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: 無
- Produces: `npm test`（vitest run）、`npm run build`、`npm run dev`；Vitest 會收集 `src/**/*.test.ts`

- [ ] **Step 1：建立 `package.json`**

```json
{
  "name": "block-city-invest",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2：安裝相依套件**

```bash
npm install react react-dom three @react-three/fiber @react-three/drei zustand zod
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/three vitest
```

Expected：安裝成功，產生 `package-lock.json`。

- [ ] **Step 3：建立 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4：建立 `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 5：建立 `index.html`、`src/main.tsx`、`src/App.tsx`、`.gitignore`**

`index.html`：
```html
<!doctype html>
<html lang="zh-Hant-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>積木城市</title>
  </head>
  <body style="margin:0">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`：
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx`：
```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#cfe8ff' }}>
      <Canvas camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 3]} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="#f4a261" />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
```

`.gitignore`：
```
node_modules
dist
*.local
```

- [ ] **Step 6：確認建置成功**

Run: `npm run build`
Expected：`tsc` 沒有錯誤，Vite 輸出 `dist/`。three.js 的 chunk 體積警告可以忽略。

- [ ] **Step 7：手動確認畫面**

Run: `npm run dev`，打開顯示的網址。
Expected：淺藍背景上有一顆橘色方塊，可以用滑鼠旋轉。確認後停止 dev server。

- [ ] **Step 8：Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src/main.tsx src/App.tsx
git commit -m "chore: scaffold vite + react three fiber project"
```

---

### Task 2：資產 schema 與 universe 驗證

**Files:**
- Create: `src/data/schema.ts`, `src/data/universe.ts`
- Test: `src/data/universe.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `AssetSchema`（zod）、`type Asset`、`type AssetType`、`ASSET_TYPES`、`isBasket(a: Asset): boolean`
  - `type Universe = ReadonlyMap<string, Asset>`
  - `parseUniverse(raw: unknown[]): Universe`，失敗時丟出 `UniverseError`（`errors: string[]`）
  - `WEIGHT_TOLERANCE_PCT = 0.5`

- [ ] **Step 1：撰寫失敗的測試 `src/data/universe.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseUniverse, UniverseError } from './universe'

const stock = (id: string) => ({ id, name: id, type: 'stock', asOf: '2026-10-01', source: [] })
const basket = (id: string, holdings: { id: string; weightPct: number }[]) => ({
  id, name: id, type: 'etf', holdings, asOf: '2026-10-01', source: ['https://example.com'],
})

function errorsOf(raw: unknown[]): string[] {
  try {
    parseUniverse(raw)
  } catch (e) {
    if (e instanceof UniverseError) return e.errors
    throw e
  }
  return []
}

describe('parseUniverse', () => {
  it('accepts a valid universe and indexes by id', () => {
    const u = parseUniverse([stock('A'), stock('B'), basket('E', [{ id: 'A', weightPct: 60 }, { id: 'B', weightPct: 40 }])])
    expect(u.size).toBe(3)
    expect(u.get('E')?.holdings?.[0]?.weightPct).toBe(60)
  })

  it('rejects schema violations with the item index', () => {
    const errs = errorsOf([{ id: 'A', name: 'A', type: 'stock', asOf: '2026/10/01', source: [] }])
    expect(errs[0]).toMatch(/^#0: asOf/)
  })

  it('rejects duplicate ids', () => {
    expect(errorsOf([stock('A'), stock('A')])).toContain('duplicate id A')
  })

  it('rejects holdings that reference unknown ids', () => {
    expect(errorsOf([stock('A'), basket('E', [{ id: 'A', weightPct: 50 }, { id: 'X', weightPct: 50 }])]))
      .toContain('E: unknown holding X')
  })

  it('rejects baskets whose weights do not sum to 100 ± 0.5', () => {
    const errs = errorsOf([stock('A'), basket('E', [{ id: 'A', weightPct: 98 }])])
    expect(errs[0]).toMatch(/^E: holdings sum 98\.00%/)
  })

  it('tolerates rounding within 0.5%', () => {
    expect(() => parseUniverse([stock('A'), stock('B'), basket('E', [{ id: 'A', weightPct: 60.3 }, { id: 'B', weightPct: 40 }])])).not.toThrow()
  })

  it('rejects baskets without holdings and non-baskets with holdings', () => {
    const errs = errorsOf([
      { ...stock('S'), holdings: [{ id: 'S', weightPct: 100 }] },
      { id: 'E', name: 'E', type: 'etf', asOf: '2026-10-01', source: [] },
    ])
    expect(errs).toHaveLength(2)
  })

  it('rejects holding cycles', () => {
    const errs = errorsOf([basket('E1', [{ id: 'E2', weightPct: 100 }]), basket('E2', [{ id: 'E1', weightPct: 100 }])])
    expect(errs.some((e) => e.startsWith('cycle:'))).toBe(true)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/data/universe.test.ts`
Expected：FAIL，原因是找不到 `./universe` 模組。

- [ ] **Step 3：實作 `src/data/schema.ts`**

```ts
import { z } from 'zod'

export const ASSET_TYPES = [
  'stock',
  'govBond',
  'corpBond',
  'highYieldBond',
  'convertible',
  'bondMixed', // 未細分的債券部位
  'gold',
  'cash',
  'other', // 持股中「其他」的彙總桶
  'etf',
  'fund',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]

const BASKET_TYPES: readonly AssetType[] = ['etf', 'fund']

const HoldingSchema = z.object({
  id: z.string().min(1),
  weightPct: z.number().positive().max(100),
})

const FeesSchema = z.object({
  frontLoad: z.number().min(0).max(0.1).optional(),
  expenseRatio: z.number().min(0).max(0.05).optional(),
  distributionFee: z.number().min(0).max(0.05).optional(),
  cdsc: z.array(z.number().min(0).max(0.1)).optional(), // 第 1 年、第 2 年⋯的遞延手續費
})

export const AssetSchema = z
  .object({
    id: z.string().regex(/^[A-Z0-9_]+$/),
    name: z.string().min(1),
    nameEn: z.string().optional(),
    type: z.enum(ASSET_TYPES),
    region: z.enum(['TW', 'US', 'GLOBAL']).optional(),
    sector: z.string().optional(),
    domicile: z.enum(['onshore', 'offshore']).optional(),
    agent: z.string().optional(),
    holdings: z.array(HoldingSchema).optional(),
    fees: FeesSchema.optional(),
    distribution: z
      .object({
        frequency: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'none']),
        classes: z.array(z.enum(['accumulating', 'distributing'])).optional(),
      })
      .optional(),
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.array(z.string().min(1)),
    verified: z.record(z.string(), z.boolean()).optional(),
    notes: z.string().optional(),
  })
  .superRefine((a, ctx) => {
    const basket = BASKET_TYPES.includes(a.type)
    if (basket && !a.holdings?.length) {
      ctx.addIssue({ code: 'custom', path: ['holdings'], message: 'basket requires holdings' })
    }
    if (!basket && a.holdings) {
      ctx.addIssue({ code: 'custom', path: ['holdings'], message: 'only etf/fund may have holdings' })
    }
  })

export type Asset = z.infer<typeof AssetSchema>

export function isBasket(a: Asset): boolean {
  return BASKET_TYPES.includes(a.type)
}
```

- [ ] **Step 4：實作 `src/data/universe.ts`**

```ts
import { AssetSchema, type Asset } from './schema'

export type Universe = ReadonlyMap<string, Asset>

export const WEIGHT_TOLERANCE_PCT = 0.5

export class UniverseError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Invalid universe:\n${errors.join('\n')}`)
    this.name = 'UniverseError'
  }
}

export function parseUniverse(raw: unknown[]): Universe {
  const errors: string[] = []
  const map = new Map<string, Asset>()

  raw.forEach((item, i) => {
    const r = AssetSchema.safeParse(item)
    if (!r.success) {
      errors.push(`#${i}: ${r.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`)
      return
    }
    if (map.has(r.data.id)) {
      errors.push(`duplicate id ${r.data.id}`)
      return
    }
    map.set(r.data.id, r.data)
  })

  let refsOk = true
  for (const a of map.values()) {
    if (!a.holdings) continue
    const sum = a.holdings.reduce((s, h) => s + h.weightPct, 0)
    if (Math.abs(sum - 100) > WEIGHT_TOLERANCE_PCT) {
      errors.push(`${a.id}: holdings sum ${sum.toFixed(2)}% (expected 100±${WEIGHT_TOLERANCE_PCT})`)
    }
    for (const h of a.holdings) {
      if (!map.has(h.id)) {
        errors.push(`${a.id}: unknown holding ${h.id}`)
        refsOk = false
      }
    }
  }

  if (refsOk) errors.push(...findCycles(map))
  if (errors.length) throw new UniverseError(errors)
  return map
}

function findCycles(map: Map<string, Asset>): string[] {
  const state = new Map<string, 'visiting' | 'done'>()
  const found: string[] = []
  const visit = (id: string, path: string[]) => {
    const s = state.get(id)
    if (s === 'done') return
    if (s === 'visiting') {
      found.push(`cycle: ${[...path.slice(path.indexOf(id)), id].join(' -> ')}`)
      return
    }
    state.set(id, 'visiting')
    for (const h of map.get(id)?.holdings ?? []) visit(h.id, [...path, id])
    state.set(id, 'done')
  }
  for (const id of map.keys()) visit(id, [])
  return found
}
```

- [ ] **Step 5：執行測試，確認通過**

Run: `npx vitest run src/data/universe.test.ts`
Expected：8 個測試 PASS。

- [ ] **Step 6：Commit**

```bash
git add src/data/schema.ts src/data/universe.ts src/data/universe.test.ts
git commit -m "feat(data): add asset schema and universe validation"
```

---

### Task 3：資料快照與建置時驗證

**Files:**
- Create: `src/data/snapshot/stocks.json`, `src/data/snapshot/buckets.json`, `src/data/snapshot/etfs.json`, `src/data/snapshot/funds.json`, `src/data/index.ts`
- Test: `src/data/snapshot.test.ts`
- Modify: `package.json`（scripts 加入 `prebuild`）

**Interfaces:**
- Consumes: `parseUniverse`、`Universe`（Task 2）
- Produces: `universe: Universe`、`SNAPSHOT_DATE = '2026-10-03'`。資產 id：`2330`、`NVDA`、`TSLA`、`0050`、`QQQ`、`SPY`、`ALLIANZ_TAIWAN`、`JH_BALANCED`、`SCHRODER_GLOBAL_INCOME_BOND`、`ALLIANZ_INCOME_GROWTH` 等（完整清單見下方 JSON）

快照數字來自 2026-10-03 的研究。標成 `false` 的欄位會在 Task 10 查證。

- [ ] **Step 1：撰寫失敗的測試 `src/data/snapshot.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe, SNAPSHOT_DATE } from './index'

const weightOf = (basketId: string, holdingId: string) =>
  universe.get(basketId)?.holdings?.find((h) => h.id === holdingId)?.weightPct

describe('snapshot', () => {
  it('loads and validates', () => {
    expect(SNAPSHOT_DATE).toBe('2026-10-03')
    expect(universe.size).toBeGreaterThan(20)
  })

  it('contains the products named in the spec', () => {
    for (const id of ['2330', 'NVDA', 'TSLA', '0050', 'QQQ', 'SPY', 'ALLIANZ_TAIWAN', 'JH_BALANCED', 'SCHRODER_GLOBAL_INCOME_BOND', 'ALLIANZ_INCOME_GROWTH', 'GOLD']) {
      expect(universe.has(id), id).toBe(true)
    }
  })

  it('keeps the key teaching facts', () => {
    expect(weightOf('0050', '2330')).toBe(57.35)
    expect(weightOf('ALLIANZ_TAIWAN', '2330')).toBe(4.87)
    expect(weightOf('QQQ', 'NVDA')).toBe(8.33)
    expect(weightOf('SPY', 'NVDA')).toBe(8.45)
    expect(weightOf('JH_BALANCED', 'NVDA')).toBe(5.86)
    expect(weightOf('ALLIANZ_INCOME_GROWTH', 'NVDA')).toBe(2.81)
  })

  it('every basket has sources and a verified map', () => {
    for (const a of universe.values()) {
      if (a.type !== 'etf' && a.type !== 'fund') continue
      expect(a.source.length, a.id).toBeGreaterThan(0)
      expect(a.verified, a.id).toBeDefined()
    }
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/data/snapshot.test.ts`
Expected：FAIL，原因是找不到 `./index` 模組。

- [ ] **Step 3：建立 `src/data/snapshot/stocks.json`**

```json
[
  { "id": "2330", "name": "台積電", "nameEn": "TSMC", "type": "stock", "region": "TW", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "2454", "name": "聯發科", "nameEn": "MediaTek", "type": "stock", "region": "TW", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "2308", "name": "台達電", "nameEn": "Delta Electronics", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "2317", "name": "鴻海", "nameEn": "Hon Hai", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "6223", "name": "旺矽", "type": "stock", "region": "TW", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "3017", "name": "奇鋐", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "5274", "name": "信驊", "type": "stock", "region": "TW", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "3037", "name": "欣興", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "8046", "name": "南電", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "6669", "name": "緯穎", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "3443", "name": "創意", "type": "stock", "region": "TW", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "6274", "name": "台燿", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "3189", "name": "景碩", "type": "stock", "region": "TW", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "NVDA", "name": "輝達", "nameEn": "NVIDIA", "type": "stock", "region": "US", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "TSLA", "name": "特斯拉", "nameEn": "Tesla", "type": "stock", "region": "US", "sector": "auto", "asOf": "2026-10-03", "source": [] },
  { "id": "AAPL", "name": "蘋果", "nameEn": "Apple", "type": "stock", "region": "US", "sector": "electronics", "asOf": "2026-10-03", "source": [] },
  { "id": "MSFT", "name": "微軟", "nameEn": "Microsoft", "type": "stock", "region": "US", "sector": "software", "asOf": "2026-10-03", "source": [] },
  { "id": "MU", "name": "美光", "nameEn": "Micron", "type": "stock", "region": "US", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "GOOGL", "name": "Alphabet", "nameEn": "Alphabet", "type": "stock", "region": "US", "sector": "internet", "asOf": "2026-10-03", "source": [] },
  { "id": "AMZN", "name": "亞馬遜", "nameEn": "Amazon", "type": "stock", "region": "US", "sector": "internet", "asOf": "2026-10-03", "source": [] },
  { "id": "AVGO", "name": "博通", "nameEn": "Broadcom", "type": "stock", "region": "US", "sector": "semiconductor", "asOf": "2026-10-03", "source": [] },
  { "id": "JPM", "name": "摩根大通", "nameEn": "JPMorgan Chase", "type": "stock", "region": "US", "sector": "finance", "asOf": "2026-10-03", "source": [] }
]
```

- [ ] **Step 4：建立 `src/data/snapshot/buckets.json`**

```json
[
  { "id": "OTHER_TW_STOCK", "name": "其他台股", "type": "other", "region": "TW", "asOf": "2026-10-03", "source": [] },
  { "id": "OTHER_US_STOCK", "name": "其他美股", "type": "other", "region": "US", "asOf": "2026-10-03", "source": [] },
  { "id": "CASH", "name": "現金", "type": "cash", "asOf": "2026-10-03", "source": [] },
  { "id": "US_TREASURY", "name": "美國公債", "type": "govBond", "region": "US", "asOf": "2026-10-03", "source": [] },
  { "id": "BOND_MIXED_US", "name": "其他債券（未細分）", "type": "bondMixed", "region": "US", "asOf": "2026-10-03", "source": [] },
  { "id": "GLOBAL_BOND_MIXED", "name": "全球債券（未細分）", "type": "bondMixed", "region": "GLOBAL", "asOf": "2026-10-03", "source": [] },
  { "id": "CONVERTIBLE_US", "name": "美國可轉債", "type": "convertible", "region": "US", "asOf": "2026-10-03", "source": [] },
  { "id": "US_HIGH_YIELD", "name": "美國高收益債", "type": "highYieldBond", "region": "US", "asOf": "2026-10-03", "source": [] },
  { "id": "GOLD", "name": "黃金", "type": "gold", "region": "GLOBAL", "asOf": "2026-10-03", "source": [] }
]
```

- [ ] **Step 5：建立 `src/data/snapshot/etfs.json`**

```json
[
  {
    "id": "0050", "name": "元大台灣50", "type": "etf", "region": "TW",
    "holdings": [
      { "id": "2330", "weightPct": 57.35 },
      { "id": "2454", "weightPct": 5.64 },
      { "id": "2308", "weightPct": 3.47 },
      { "id": "2317", "weightPct": 2.98 },
      { "id": "OTHER_TW_STOCK", "weightPct": 30.56 }
    ],
    "fees": { "expenseRatio": 0.0014 },
    "distribution": { "frequency": "semiannual", "classes": ["distributing"] },
    "asOf": "2026-09-26",
    "source": ["Yahoo奇摩股市 0050 持股頁（2026-09-26）"],
    "verified": { "holdings": true, "fees": true, "distribution": true },
    "notes": "費用為經理費約 0.11% + 保管費 0.03%（級距制，2025-01 起）"
  },
  {
    "id": "QQQ", "name": "Invesco QQQ", "nameEn": "Invesco QQQ Trust", "type": "etf", "region": "US",
    "holdings": [
      { "id": "NVDA", "weightPct": 8.33 },
      { "id": "AAPL", "weightPct": 7.35 },
      { "id": "MSFT", "weightPct": 5.76 },
      { "id": "MU", "weightPct": 5.02 },
      { "id": "TSLA", "weightPct": 2.82 },
      { "id": "OTHER_US_STOCK", "weightPct": 70.72 }
    ],
    "fees": { "expenseRatio": 0.002 },
    "distribution": { "frequency": "quarterly", "classes": ["distributing"] },
    "asOf": "2026-09-30",
    "source": ["https://stockanalysis.com/etf/qqq/holdings/"],
    "verified": { "holdings": true, "fees": false, "distribution": false }
  },
  {
    "id": "SPY", "name": "SPDR 標普500", "nameEn": "SPDR S&P 500 ETF Trust", "type": "etf", "region": "US",
    "holdings": [
      { "id": "NVDA", "weightPct": 8.45 },
      { "id": "AAPL", "weightPct": 7.3 },
      { "id": "MSFT", "weightPct": 5.76 },
      { "id": "TSLA", "weightPct": 1.51 },
      { "id": "OTHER_US_STOCK", "weightPct": 76.98 }
    ],
    "fees": { "expenseRatio": 0.000945 },
    "distribution": { "frequency": "quarterly", "classes": ["distributing"] },
    "asOf": "2026-10-01",
    "source": ["https://stockanalysis.com/etf/spy/holdings/", "https://www.ssga.com/us/en/intermediary/etfs/spdr-sp-500-etf-trust-spy"],
    "verified": { "holdings": true, "fees": true, "distribution": false }
  }
]
```

- [ ] **Step 6：建立 `src/data/snapshot/funds.json`**

```json
[
  {
    "id": "ALLIANZ_TAIWAN", "name": "安聯台灣大壩基金", "nameEn": "Allianz Global Investors Taiwan Fund",
    "type": "fund", "region": "TW", "domicile": "onshore", "agent": "安聯投信",
    "holdings": [
      { "id": "6223", "weightPct": 8.65 },
      { "id": "3017", "weightPct": 6.44 },
      { "id": "2330", "weightPct": 4.87 },
      { "id": "5274", "weightPct": 4.77 },
      { "id": "3037", "weightPct": 4.62 },
      { "id": "8046", "weightPct": 4.11 },
      { "id": "6669", "weightPct": 3.71 },
      { "id": "3443", "weightPct": 3.56 },
      { "id": "6274", "weightPct": 3.55 },
      { "id": "3189", "weightPct": 3.52 },
      { "id": "OTHER_TW_STOCK", "weightPct": 46.66 },
      { "id": "CASH", "weightPct": 5.54 }
    ],
    "fees": { "expenseRatio": 0.016 },
    "distribution": { "frequency": "none", "classes": ["accumulating"] },
    "asOf": "2026-08-31",
    "source": ["https://tw.allianzgi.com/documents/mDDO01"],
    "verified": { "holdings": true, "fees": false, "distribution": false },
    "notes": "expenseRatio 目前只有經理費 1.60%，不是總費用率；配息級別未查到"
  },
  {
    "id": "JH_BALANCED", "name": "駿利亨德森平衡基金", "nameEn": "Janus Henderson Balanced Fund",
    "type": "fund", "region": "US", "domicile": "offshore", "agent": "野村投信（總代理）",
    "holdings": [
      { "id": "NVDA", "weightPct": 5.86 },
      { "id": "MSFT", "weightPct": 4.46 },
      { "id": "GOOGL", "weightPct": 4.11 },
      { "id": "AMZN", "weightPct": 3.01 },
      { "id": "AAPL", "weightPct": 2.98 },
      { "id": "AVGO", "weightPct": 2.19 },
      { "id": "MU", "weightPct": 1.69 },
      { "id": "JPM", "weightPct": 1.46 },
      { "id": "OTHER_US_STOCK", "weightPct": 38.39 },
      { "id": "US_TREASURY", "weightPct": 4.19 },
      { "id": "BOND_MIXED_US", "weightPct": 30.36 },
      { "id": "CASH", "weightPct": 1.3 }
    ],
    "fees": { "expenseRatio": 0.0188 },
    "distribution": { "frequency": "monthly", "classes": ["accumulating", "distributing"] },
    "asOf": "2026-08-31",
    "source": [
      "https://www.janushenderson.com/en-sg/investor/product/janus-henderson-balanced-fund/",
      "https://www.janushenderson.com/en-us/investor/product/balanced-fund/",
      "https://tw.stock.yahoo.com/fund/holdings/F00001F7IJ:FO"
    ],
    "verified": { "holdings": false, "fees": true, "distribution": true },
    "notes": "股債比例（股 64.15／債 34.55／現金 1.30）暫用美國版 JANBX 代替；US_TREASURY 只計前十大中的單一公債，其餘債券併入 BOND_MIXED_US。級別：A2 累積、A5／A6 月配"
  },
  {
    "id": "SCHRODER_GLOBAL_INCOME_BOND", "name": "施羅德環球基金系列－環球收息債券",
    "type": "fund", "region": "GLOBAL", "domicile": "offshore", "agent": "施羅德投信（總代理）",
    "holdings": [{ "id": "GLOBAL_BOND_MIXED", "weightPct": 100 }],
    "fees": { "expenseRatio": 0.011 },
    "distribution": { "frequency": "monthly", "classes": ["accumulating", "distributing"] },
    "asOf": "2026-10-02",
    "source": ["https://tw.stock.yahoo.com/fund/basic-info/F00000Y90J:FO"],
    "verified": { "holdings": false, "fees": false, "distribution": true, "nameEn": false },
    "notes": "前十大以公債期貨與交換合約為主，畫面只呈現資產類別；公債與公司債、投資等級與非投資等級的拆分待查。expenseRatio 目前只有經理費"
  },
  {
    "id": "ALLIANZ_INCOME_GROWTH", "name": "安聯收益成長基金", "nameEn": "Allianz Income and Growth",
    "type": "fund", "region": "US", "domicile": "offshore", "agent": "安聯投信（總代理）",
    "holdings": [
      { "id": "NVDA", "weightPct": 2.81 },
      { "id": "AAPL", "weightPct": 2.44 },
      { "id": "GOOGL", "weightPct": 2.53 },
      { "id": "AMZN", "weightPct": 1.49 },
      { "id": "MU", "weightPct": 1.1 },
      { "id": "AVGO", "weightPct": 0.97 },
      { "id": "OTHER_US_STOCK", "weightPct": 20.57 },
      { "id": "CONVERTIBLE_US", "weightPct": 31.98 },
      { "id": "US_HIGH_YIELD", "weightPct": 30.4 },
      { "id": "CASH", "weightPct": 5.71 }
    ],
    "fees": { "expenseRatio": 0.0156 },
    "distribution": { "frequency": "monthly", "classes": ["accumulating", "distributing"] },
    "asOf": "2026-06-30",
    "source": ["https://dokumenty.analizy.pl/pobierz/fzg/AGI026_A_USD/KA/2026-06-30"],
    "verified": { "holdings": false, "fees": true, "distribution": true },
    "notes": "三大類約 31.98／31.91／30.40%，來源圖表標籤不清，暫定為可轉債／股票／高收益債；GOOGL 合併兩檔 Alphabet 證券（1.36 + 1.17）"
  }
]
```

- [ ] **Step 7：建立 `src/data/index.ts`**

```ts
import stocks from './snapshot/stocks.json'
import buckets from './snapshot/buckets.json'
import etfs from './snapshot/etfs.json'
import funds from './snapshot/funds.json'
import { parseUniverse } from './universe'

export const SNAPSHOT_DATE = '2026-10-03'

export const universe = parseUniverse([...stocks, ...buckets, ...etfs, ...funds])

export type { Universe } from './universe'
export type { Asset, AssetType } from './schema'
```

- [ ] **Step 8：執行測試，確認通過**

Run: `npx vitest run src/data`
Expected：`universe.test.ts` 與 `snapshot.test.ts` 全部 PASS。如果 `parseUniverse` 丟出錯誤，依照錯誤訊息修正 JSON，**不要放寬容差**。

- [ ] **Step 9：在 `package.json` 的 scripts 加入建置時驗證**

在 `"build"` 那一行之前加入：
```json
    "prebuild": "vitest run src/data",
```

Run: `npm run build`
Expected：先跑資料測試且通過，接著 `tsc` 與 Vite 建置成功。

- [ ] **Step 10：Commit**

```bash
git add src/data/snapshot src/data/index.ts src/data/snapshot.test.ts package.json
git commit -m "feat(data): add 2026-10-03 snapshot with build-time validation"
```

---

### Task 4：`sim/allocate`：最大餘數法方塊分配

**Files:**
- Create: `src/sim/allocate.ts`
- Test: `src/sim/allocate.test.ts`

**Interfaces:**
- Consumes: 無
- Produces: `allocateBlocks(weights: { id: string; weight: number }[], total: number): { id: string; count: number }[]`。輸出順序與輸入相同；`count` 總和等於 `total`；餘數相同時，排在前面的優先。

- [ ] **Step 1：撰寫失敗的測試 `src/sim/allocate.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { allocateBlocks } from './allocate'

describe('allocateBlocks', () => {
  it('uses the largest remainder method (0050-like weights, 1000 blocks)', () => {
    const r = allocateBlocks(
      [
        { id: '2330', weight: 57.35 },
        { id: '2454', weight: 5.64 },
        { id: '2308', weight: 3.47 },
        { id: '2317', weight: 2.98 },
        { id: 'OTHER', weight: 30.56 },
      ],
      1000,
    )
    expect(r).toEqual([
      { id: '2330', count: 573 },
      { id: '2454', count: 56 },
      { id: '2308', count: 35 },
      { id: '2317', count: 30 },
      { id: 'OTHER', count: 306 },
    ])
  })

  it('always sums to total even when weights do not sum to 100', () => {
    const r = allocateBlocks([{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }], 10)
    expect(r.reduce((s, x) => s + x.count, 0)).toBe(10)
    expect(r.map((x) => x.count)).toEqual([4, 3, 3])
  })

  it('returns zeros for total 0 and rejects invalid input', () => {
    expect(allocateBlocks([{ id: 'a', weight: 1 }], 0)).toEqual([{ id: 'a', count: 0 }])
    expect(() => allocateBlocks([], 10)).toThrow()
    expect(() => allocateBlocks([{ id: 'a', weight: -1 }], 10)).toThrow()
    expect(() => allocateBlocks([{ id: 'a', weight: 1 }], 2.5)).toThrow()
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/sim/allocate.test.ts`
Expected：FAIL，原因是找不到 `./allocate` 模組。

- [ ] **Step 3：實作 `src/sim/allocate.ts`**

```ts
export type WeightInput = { id: string; weight: number }
export type BlockCount = { id: string; count: number }

/** 依權重分配整數方塊數，總和恆等於 total（最大餘數法；餘數相同時，排在前面的優先）。 */
export function allocateBlocks(weights: WeightInput[], total: number): BlockCount[] {
  if (!Number.isInteger(total) || total < 0) throw new Error(`total must be a non-negative integer: ${total}`)
  if (weights.length === 0) throw new Error('weights must not be empty')
  if (weights.some((w) => !(w.weight >= 0))) throw new Error('weights must be non-negative')
  const sum = weights.reduce((s, w) => s + w.weight, 0)
  if (sum <= 0) throw new Error('weights must not all be zero')

  const raw = weights.map((w) => (w.weight / sum) * total)
  const counts = raw.map(Math.floor)
  let left = total - counts.reduce((s, c) => s + c, 0)
  const order = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    counts[i] += 1
    left -= 1
  }
  return weights.map((w, i) => ({ id: w.id, count: counts[i] }))
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/sim/allocate.test.ts`
Expected：3 個測試 PASS。

- [ ] **Step 5：Commit**

```bash
git add src/sim/allocate.ts src/sim/allocate.test.ts
git commit -m "feat(sim): allocate blocks by largest remainder"
```

---

### Task 5：`sim/holdings`：攤平巢狀持股

**Files:**
- Create: `src/sim/holdings.ts`
- Test: `src/sim/holdings.test.ts`

**Interfaces:**
- Consumes: `Universe`、`parseUniverse`（Task 2）
- Produces: `type Exposure = Map<string, number>`（底層資產 id 對應到占商品的比例，0～1）；`flatten(u: Universe, id: string): Exposure`。非籃子資產回傳 `{id → 1}`；不存在的 id 會丟出錯誤。

- [ ] **Step 1：撰寫失敗的測試 `src/sim/holdings.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseUniverse } from '../data/universe'
import { flatten } from './holdings'

const s = (id: string) => ({ id, name: id, type: 'stock', asOf: '2026-10-01', source: [] })
const b = (id: string, type: 'etf' | 'fund', holdings: { id: string; weightPct: number }[]) => ({
  id, name: id, type, holdings, asOf: '2026-10-01', source: ['x'],
})

const u = parseUniverse([
  s('A'),
  s('B'),
  b('E', 'etf', [{ id: 'A', weightPct: 40 }, { id: 'B', weightPct: 60 }]),
  b('F', 'fund', [{ id: 'E', weightPct: 50 }, { id: 'A', weightPct: 50 }]),
])

describe('flatten', () => {
  it('returns the asset itself for a leaf', () => {
    expect([...flatten(u, 'A')]).toEqual([['A', 1]])
  })

  it('converts percent weights to fractions', () => {
    const e = flatten(u, 'E')
    expect(e.get('A')).toBeCloseTo(0.4)
    expect(e.get('B')).toBeCloseTo(0.6)
  })

  it('merges nested exposure to the same leaf', () => {
    const f = flatten(u, 'F')
    expect(f.get('A')).toBeCloseTo(0.7) // 0.5 * 0.4 + 0.5
    expect(f.get('B')).toBeCloseTo(0.3)
    expect(f.has('E')).toBe(false)
  })

  it('throws on unknown ids', () => {
    expect(() => flatten(u, 'NOPE')).toThrow('unknown asset NOPE')
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/sim/holdings.test.ts`
Expected：FAIL，原因是找不到 `./holdings` 模組。

- [ ] **Step 3：實作 `src/sim/holdings.ts`**

```ts
import type { Universe } from '../data/universe'

/** 底層資產 id → 占商品的比例（0～1） */
export type Exposure = Map<string, number>

export function flatten(u: Universe, id: string): Exposure {
  const asset = u.get(id)
  if (!asset) throw new Error(`unknown asset ${id}`)
  const out: Exposure = new Map()
  if (!asset.holdings) {
    out.set(id, 1)
    return out
  }
  for (const h of asset.holdings) {
    for (const [leaf, f] of flatten(u, h.id)) {
      out.set(leaf, (out.get(leaf) ?? 0) + (f * h.weightPct) / 100)
    }
  }
  return out
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/sim/holdings.test.ts`
Expected：4 個測試 PASS。

- [ ] **Step 5：Commit**

```bash
git add src/sim/holdings.ts src/sim/holdings.test.ts
git commit -m "feat(sim): flatten nested holdings into exposure"
```

---

### Task 6：`sim/overlap`：重疊持股

**Files:**
- Create: `src/sim/overlap.ts`
- Test: `src/sim/overlap.test.ts`

**Interfaces:**
- Consumes: `flatten`、`Exposure`（Task 5）；`Universe`、`AssetType`（Task 2）
- Produces: `type OverlapRow = { id: string; a: number; b: number; shared: number }`；`overlap(u: Universe, aId: string, bId: string): { rows: OverlapRow[]; total: number }`。`rows` 依 `shared` 由大到小排序；`other`、`cash`、`bondMixed` 這三種彙總桶不算重疊。

- [ ] **Step 1：撰寫失敗的測試 `src/sim/overlap.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseUniverse } from '../data/universe'
import { universe } from '../data'
import { overlap } from './overlap'

const s = (id: string, type = 'stock') => ({ id, name: id, type, asOf: '2026-10-01', source: [] })
const e = (id: string, holdings: { id: string; weightPct: number }[]) => ({
  id, name: id, type: 'etf', holdings, asOf: '2026-10-01', source: ['x'],
})

describe('overlap', () => {
  const u = parseUniverse([
    s('X'),
    s('Y'),
    s('Z'),
    s('O', 'other'),
    e('P', [{ id: 'X', weightPct: 10 }, { id: 'Y', weightPct: 5 }, { id: 'O', weightPct: 85 }]),
    e('Q', [{ id: 'X', weightPct: 8 }, { id: 'Z', weightPct: 2 }, { id: 'O', weightPct: 90 }]),
  ])

  it('reports shared exposure as min of both sides and ignores buckets', () => {
    const r = overlap(u, 'P', 'Q')
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0]?.id).toBe('X')
    expect(r.rows[0]?.a).toBeCloseTo(0.1)
    expect(r.rows[0]?.b).toBeCloseTo(0.08)
    expect(r.rows[0]?.shared).toBeCloseTo(0.08)
    expect(r.total).toBeCloseTo(0.08)
  })

  it('finds NVDA shared by QQQ and SPY in the real snapshot', () => {
    const r = overlap(universe, 'QQQ', 'SPY')
    expect(r.rows.map((x) => x.id)).toEqual(['NVDA', 'AAPL', 'MSFT', 'TSLA'])
    expect(r.rows[0]?.shared).toBeCloseTo(0.0833)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/sim/overlap.test.ts`
Expected：FAIL，原因是找不到 `./overlap` 模組。

- [ ] **Step 3：實作 `src/sim/overlap.ts`**

```ts
import type { Universe } from '../data/universe'
import type { AssetType } from '../data/schema'
import { flatten } from './holdings'

export type OverlapRow = { id: string; a: number; b: number; shared: number }

/** 彙總桶不代表特定公司，算進重疊會誤導 */
const NOT_COMPARABLE: readonly AssetType[] = ['other', 'cash', 'bondMixed']

export function overlap(u: Universe, aId: string, bId: string): { rows: OverlapRow[]; total: number } {
  const ea = flatten(u, aId)
  const eb = flatten(u, bId)
  const rows: OverlapRow[] = []
  for (const [id, a] of ea) {
    const b = eb.get(id)
    if (b === undefined) continue
    const type = u.get(id)?.type
    if (type && NOT_COMPARABLE.includes(type)) continue
    rows.push({ id, a, b, shared: Math.min(a, b) })
  }
  rows.sort((x, y) => y.shared - x.shared)
  return { rows, total: rows.reduce((s, r) => s + r.shared, 0) }
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/sim/overlap.test.ts`
Expected：2 個測試 PASS。QQQ 對 SPY 的重疊依序為 NVDA 0.0833、AAPL 0.0730、MSFT 0.0576、TSLA 0.0151。

- [ ] **Step 5：Commit**

```bash
git add src/sim/overlap.ts src/sim/overlap.test.ts
git commit -m "feat(sim): compute holding overlap between products"
```

---

### Task 7：`sim/scenario`：假設情境衝擊

**Files:**
- Create: `src/sim/scenario.ts`
- Test: `src/sim/scenario.test.ts`

**Interfaces:**
- Consumes: `flatten`（Task 5）；`universe`（Task 3）
- Produces: `type Shocks = Record<string, number>`（底層資產 id 對應到漲跌幅小數，-0.3 代表跌 30%）；`shockImpact(u: Universe, productId: string, shocks: Shocks): number`，回傳商品的漲跌幅小數，只計直接曝險

- [ ] **Step 1：撰寫失敗的測試 `src/sim/scenario.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { universe } from '../data'
import { shockImpact } from './scenario'

describe('shockImpact', () => {
  it('2330 -30% moves 0050 by about -17.2%', () => {
    expect(shockImpact(universe, '0050', { '2330': -0.3 })).toBeCloseTo(-0.17205, 5)
  })

  it('the same shock barely moves 安聯台灣大壩', () => {
    expect(shockImpact(universe, 'ALLIANZ_TAIWAN', { '2330': -0.3 })).toBeCloseTo(-0.01461, 5)
  })

  it('a stock held directly takes the full shock', () => {
    expect(shockImpact(universe, '2330', { '2330': -0.3 })).toBeCloseTo(-0.3)
  })

  it('combines multiple shocks and ignores unrelated assets', () => {
    // SPY: NVDA 8.45% * -0.2 + TSLA 1.51% * -0.5 = -0.0169 - 0.00755
    expect(shockImpact(universe, 'SPY', { NVDA: -0.2, TSLA: -0.5, '2330': -0.9 })).toBeCloseTo(-0.02445, 5)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/sim/scenario.test.ts`
Expected：FAIL，原因是找不到 `./scenario` 模組。

- [ ] **Step 3：實作 `src/sim/scenario.ts`**

```ts
import type { Universe } from '../data/universe'
import { flatten } from './holdings'

/** 底層資產 id → 漲跌幅（小數，-0.3 代表跌 30%） */
export type Shocks = Record<string, number>

/** 假設情境下商品的漲跌幅；只計直接曝險，不模擬連動效應。 */
export function shockImpact(u: Universe, productId: string, shocks: Shocks): number {
  let impact = 0
  for (const [id, fraction] of flatten(u, productId)) {
    impact += fraction * (shocks[id] ?? 0)
  }
  return impact
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/sim/scenario.test.ts`
Expected：4 個測試 PASS。

- [ ] **Step 5：Commit**

```bash
git add src/sim/scenario.ts src/sim/scenario.test.ts
git commit -m "feat(sim): propagate hypothetical shocks through holdings"
```

---

### Task 8：`sim/dividend`：除息、配息型與累積型、配息來自本金

**Files:**
- Create: `src/sim/dividend.ts`
- Test: `src/sim/dividend.test.ts`

**Interfaces:**
- Consumes: 無
- Produces:
  - `exDividend(price: number, dividend: number): { price: number; cash: number }`
  - `type DistributionParams = { initialValue: number; incomeYield: number; priceReturn: number; payoutRate: number; periods: number; mode: 'payout' | 'accumulate' }`
  - `type PeriodState = { period: number; value: number; cashReceived: number; fromPrincipal: number; total: number }`
  - `simulateDistribution(p: DistributionParams): PeriodState[]`，長度為 `periods + 1`，第 0 筆是初始狀態

每期的模型：
- `income = value × incomeYield`
- `value' = value × (1 + priceReturn) + income − payout`
- `payout = value × payoutRate`（累積型為 0）
- `fromPrincipal` 累加 `max(0, payout − income)`

- [ ] **Step 1：撰寫失敗的測試 `src/sim/dividend.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { exDividend, simulateDistribution } from './dividend'

describe('exDividend', () => {
  it('conserves value: price drops by exactly the cash paid', () => {
    const r = exDividend(100, 5)
    expect(r).toEqual({ price: 95, cash: 5 })
    expect(r.price + r.cash).toBe(100)
  })

  it('rejects negative or larger-than-price dividends', () => {
    expect(() => exDividend(100, -1)).toThrow()
    expect(() => exDividend(100, 101)).toThrow()
  })
})

describe('simulateDistribution', () => {
  const base = { initialValue: 100, incomeYield: 0.05, priceReturn: 0, periods: 2 }

  it('starts with the initial state', () => {
    const s = simulateDistribution({ ...base, payoutRate: 0.05, mode: 'payout' })
    expect(s).toHaveLength(3)
    expect(s[0]).toEqual({ period: 0, value: 100, cashReceived: 0, fromPrincipal: 0, total: 100 })
  })

  it('accumulating class compounds income into value', () => {
    const last = simulateDistribution({ ...base, payoutRate: 0.05, mode: 'accumulate' }).at(-1)!
    expect(last.value).toBeCloseTo(110.25)
    expect(last.cashReceived).toBe(0)
  })

  it('distributing class pays income out and ends with a lower total', () => {
    const last = simulateDistribution({ ...base, payoutRate: 0.05, mode: 'payout' }).at(-1)!
    expect(last.value).toBeCloseTo(100)
    expect(last.cashReceived).toBeCloseTo(10)
    expect(last.total).toBeCloseTo(110)
    expect(last.fromPrincipal).toBe(0)
  })

  it('paying out more than income eats principal (illustrative only)', () => {
    const s = simulateDistribution({ initialValue: 100, incomeYield: 0.03, priceReturn: 0, payoutRate: 0.06, periods: 1, mode: 'payout' })
    expect(s[1]?.value).toBeCloseTo(97)
    expect(s[1]?.cashReceived).toBeCloseTo(6)
    expect(s[1]?.fromPrincipal).toBeCloseTo(3)
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/sim/dividend.test.ts`
Expected：FAIL，原因是找不到 `./dividend` 模組。

- [ ] **Step 3：實作 `src/sim/dividend.ts`**

```ts
/** 除息：方塊縮小的量剛好等於拿到的金幣（價值守恆）。 */
export function exDividend(price: number, dividend: number): { price: number; cash: number } {
  if (dividend < 0 || dividend > price) throw new Error(`invalid dividend ${dividend} for price ${price}`)
  return { price: price - dividend, cash: dividend }
}

export type DistributionParams = {
  initialValue: number
  /** 每期內部產出（股利、利息）占價值的比例 */
  incomeYield: number
  /** 每期價格漲跌（不含產出） */
  priceReturn: number
  /** 每期配出占價值的比例；mode 為 accumulate 時忽略 */
  payoutRate: number
  periods: number
  mode: 'payout' | 'accumulate'
}

export type PeriodState = {
  period: number
  value: number
  cashReceived: number
  /** 累計配出超過產出的部分（配息來自本金） */
  fromPrincipal: number
  total: number
}

export function simulateDistribution(p: DistributionParams): PeriodState[] {
  let value = p.initialValue
  let cashReceived = 0
  let fromPrincipal = 0
  const states: PeriodState[] = [{ period: 0, value, cashReceived, fromPrincipal, total: value }]
  for (let period = 1; period <= p.periods; period++) {
    const income = value * p.incomeYield
    const payout = p.mode === 'payout' ? value * p.payoutRate : 0
    fromPrincipal += Math.max(0, payout - income)
    value = value * (1 + p.priceReturn) + income - payout
    cashReceived += payout
    states.push({ period, value, cashReceived, fromPrincipal, total: value + cashReceived })
  }
  return states
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/sim/dividend.test.ts`
Expected：6 個測試 PASS。

- [ ] **Step 5：Commit**

```bash
git add src/sim/dividend.ts src/sim/dividend.test.ts
git commit -m "feat(sim): model ex-dividend, payout vs accumulate, payout from principal"
```

---

### Task 9：`sim/fees`：三道門與持有年數

**Files:**
- Create: `src/sim/fees.ts`
- Test: `src/sim/fees.test.ts`

**Interfaces:**
- Consumes: `Asset['fees']` 型別（Task 2）
- Produces:
  - `type FeeProfile = { entry: number; annual: number[]; exitByYear: number[]; exitDefault: number }`
  - `type TradingCost = { buy: number; sell: number }`
  - `profileFromFees(fees: Asset['fees'], trading?: TradingCost): FeeProfile`
  - `valueAfter(p: FeeProfile, years: number, opts?: { amount?: number; grossReturn?: number }): number`：在第 `years` 年年底賣出時拿回的金額
  - `firstYearAhead(a: FeeProfile, b: FeeProfile, maxYears?: number, opts?): number | null`：`a` 的剩餘價值第一次超過 `b` 的年份

模型：
- `valueAfter = amount × (1 − entry) × [(1 + g) × Π(1 − annual_i)]^years × (1 − exit(years))`
- `exit(y) = exitByYear[y − 1] ?? exitDefault`
- 同一道門的多項費用用乘法合併：`1 − (1 − x)(1 − y)`

- [ ] **Step 1：撰寫失敗的測試 `src/sim/fees.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { profileFromFees, valueAfter, firstYearAhead, type FeeProfile } from './fees'

// 示意費率，不是任何真實基金
const front: FeeProfile = { entry: 0.05, annual: [0.01], exitByYear: [], exitDefault: 0 }
const back: FeeProfile = { entry: 0, annual: [0.01, 0.01], exitByYear: [0.04, 0.03, 0.02, 0.01], exitDefault: 0 }

describe('valueAfter', () => {
  it('front-load: entry gate then annual drag', () => {
    expect(valueAfter(front, 1)).toBeCloseTo(94.05, 4) // 100 * 0.95 * 0.99
    expect(valueAfter(front, 6)).toBeCloseTo(89.4406, 3)
  })

  it('back-load: annual drag includes distribution fee, exit gate declines by year', () => {
    expect(valueAfter(back, 1)).toBeCloseTo(94.0896, 4) // 100 * 0.9801 * 0.96
    expect(valueAfter(back, 4)).toBeCloseTo(91.3517, 3)
    expect(valueAfter(back, 5)).toBeCloseTo(90.4382, 3) // CDSC 已歸零
  })

  it('applies gross return and amount', () => {
    expect(valueAfter({ entry: 0, annual: [], exitByYear: [], exitDefault: 0 }, 2, { amount: 1000, grossReturn: 0.1 })).toBeCloseTo(1210)
  })
})

describe('firstYearAhead', () => {
  it('front-load overtakes back-load in year 6 for these illustrative fees', () => {
    expect(firstYearAhead(front, back)).toBe(6)
  })

  it('returns null when a never overtakes b within maxYears', () => {
    // 第 1～3 年 front（94.05、93.11、92.18）都低於 back（94.09、93.18、92.27）
    expect(firstYearAhead(front, back, 3)).toBeNull()
  })
})

describe('profileFromFees', () => {
  it('maps fund fees to gates', () => {
    const p = profileFromFees({ frontLoad: 0.03, expenseRatio: 0.015 })
    expect(p.entry).toBeCloseTo(0.03)
    expect(p.annual).toEqual([0.015])
    expect(p.exitByYear).toEqual([])
    expect(p.exitDefault).toBe(0)
  })

  it('combines trading costs multiplicatively with load and CDSC', () => {
    const p = profileFromFees({ expenseRatio: 0.0014, cdsc: [0.04] }, { buy: 0.001425, sell: 0.002425 })
    expect(p.entry).toBeCloseTo(0.001425)
    expect(p.annual).toEqual([0.0014])
    expect(p.exitByYear[0]).toBeCloseTo(1 - 0.96 * (1 - 0.002425))
    expect(p.exitDefault).toBeCloseTo(0.002425)
  })

  it('handles missing fees', () => {
    expect(profileFromFees(undefined)).toEqual({ entry: 0, annual: [], exitByYear: [], exitDefault: 0 })
  })
})
```


- [ ] **Step 2：執行測試，確認失敗**

Run: `npx vitest run src/sim/fees.test.ts`
Expected：FAIL，原因是找不到 `./fees` 模組。

- [ ] **Step 3：實作 `src/sim/fees.ts`**

```ts
import type { Asset } from '../data/schema'

export type FeeProfile = {
  /** 入口門：買進時扣除的比例 */
  entry: number
  /** 持有中：每年各項內扣費率（經理費、分銷費⋯） */
  annual: number[]
  /** 出口門：第 1 年、第 2 年⋯賣出時扣除的比例 */
  exitByYear: number[]
  /** 出口門：超出 exitByYear 之後的賣出成本 */
  exitDefault: number
}

export type TradingCost = { buy: number; sell: number }

const combine = (x: number, y: number) => 1 - (1 - x) * (1 - y)

export function profileFromFees(fees: Asset['fees'], trading: TradingCost = { buy: 0, sell: 0 }): FeeProfile {
  const annual = [fees?.expenseRatio, fees?.distributionFee].filter((r): r is number => r !== undefined && r > 0)
  return {
    entry: combine(fees?.frontLoad ?? 0, trading.buy),
    annual,
    exitByYear: (fees?.cdsc ?? []).map((c) => combine(c, trading.sell)),
    exitDefault: trading.sell,
  }
}

export function valueAfter(p: FeeProfile, years: number, opts: { amount?: number; grossReturn?: number } = {}): number {
  const amount = opts.amount ?? 100
  const growth = 1 + (opts.grossReturn ?? 0)
  const keepPerYear = p.annual.reduce((k, r) => k * (1 - r), 1)
  const exit = years >= 1 ? (p.exitByYear[years - 1] ?? p.exitDefault) : (p.exitByYear[0] ?? p.exitDefault)
  return amount * (1 - p.entry) * Math.pow(growth * keepPerYear, years) * (1 - exit)
}

/** a 的剩餘價值第一次超過 b 的年份（1..maxYears）；都沒有超過時回傳 null */
export function firstYearAhead(
  a: FeeProfile,
  b: FeeProfile,
  maxYears = 30,
  opts: { amount?: number; grossReturn?: number } = {},
): number | null {
  for (let y = 1; y <= maxYears; y++) {
    if (valueAfter(a, y, opts) > valueAfter(b, y, opts)) return y
  }
  return null
}
```

- [ ] **Step 4：執行測試，確認通過**

Run: `npx vitest run src/sim/fees.test.ts`
Expected：全部 PASS。

- [ ] **Step 5：執行全部測試與建置**

Run: `npm test && npm run build`
Expected：所有測試 PASS，建置成功。

- [ ] **Step 6：Commit**

```bash
git add src/sim/fees.ts src/sim/fees.test.ts
git commit -m "feat(sim): model fee gates and holding-period cost"
```

---

### Task 10：資料查證

**Files:**
- Create: `docs/data-sources.md`
- Modify: `src/data/snapshot/etfs.json`, `src/data/snapshot/funds.json`
- Test: `src/data/snapshot.test.ts`（必須維持通過）

**Interfaces:**
- Consumes: Task 3 的快照
- Produces: 更新後的快照與 `verified` 標記；`docs/data-sources.md` 逐項列出查證結果與來源

用網路搜尋與官方文件查證下列項目。**查不到就維持 `false`，並在 `docs/data-sources.md` 寫明「查無」；不可以猜測數字。**

- [ ] **Step 1：查證 ETF**
  - QQQ 費用率（Invesco 官網），以及 QQQ、SPY 的配息頻率
  - 0050 的來源改成實際網址（元大投信或 Yahoo 持股頁網址）

- [ ] **Step 2：查證基金**
  - 安聯台灣大壩：總費用率、是否有配息級別
  - 駿利亨德森平衡（境外版）：實際股債比例（駿利亨德森亞洲或台灣官網月報）
  - 施羅德環球收息債券：英文正式名稱（施羅德官網）；公債／公司債、投資等級／非投資等級的比例。查到的話，把 `GLOBAL_BOND_MIXED` 拆成具體的資產類別桶（必要時在 `buckets.json` 新增 `GLOBAL_GOV_BOND`、`GLOBAL_IG_CORP`、`GLOBAL_HIGH_YIELD`）
  - 安聯收益成長：三大類比例各自對應哪一類（安聯投信月報）

- [ ] **Step 3：查證前收與後收費率**
  - 四檔基金在台灣主要銷售平台上的前收手續費上限、後收型（例如 B 股或 N 股）的分銷費與遞延手續費（CDSC）級距
  - 查到的話，在該基金的 `fees` 填入 `frontLoad`；後收級別另外建一筆資產，例如 `JH_BALANCED_BACKLOAD`，持股與主級別相同，`fees` 填入 `distributionFee` 與 `cdsc`

- [ ] **Step 4：撰寫 `docs/data-sources.md`**

格式如下，每項一列：
```markdown
# 資料來源與查證紀錄（快照 2026-10-03）

| 資產 | 欄位 | 數值 | 狀態 | 來源 | 查證日 |
|---|---|---|---|---|---|
| QQQ | expenseRatio | 0.20% | 已驗證／查無 | <URL> | 2026-10-xx |
```

- [ ] **Step 5：更新 JSON 並執行測試**

把查證過的欄位改成 `true`，修正數值與來源。

Run: `npm test && npm run build`
Expected：全部 PASS。如果新數值改變了 `snapshot.test.ts` 或 `scenario.test.ts` 裡寫死的數字，就更新測試的期望值，並在 commit 訊息中說明原因。

- [ ] **Step 6：Commit**

```bash
git add docs/data-sources.md src/data/snapshot src/data/snapshot.test.ts src/sim/scenario.test.ts
git commit -m "data: verify snapshot fields and record sources"
```
