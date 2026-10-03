import { test, expect } from '@playwright/test'
import { cameraSeq, setRange, settled } from './helpers'

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
  test.setTimeout(300_000) // 軟體渲染約 1fps，整段導覽 30+ 步要一至兩分鐘
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  const next = page.getByRole('button', { name: /下一步|進入沙盒/ })
  const ids = await page.evaluate(() => (window as unknown as { __BCI_STEP_IDS__: string[] }).__BCI_STEP_IDS__)
  let before = 0
  for (const id of ids) {
    await settled(page, before)
    const gate = GATES[id]
    if (gate) {
      await expect(next).toBeDisabled()
      await setRange(page, gate.label, gate.value)
    }
    await expect(next).toBeEnabled()
    before = await cameraSeq(page)
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
