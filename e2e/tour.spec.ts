import { test, expect } from '@playwright/test'
import { cameraSeq, setRange, settled } from './helpers'

// 需要先操作才能前進的步驟：門檻（control 與 min）直接取自課程資料，這裡只負責 control → 畫面上的名稱
const CONTROL_LABEL: Record<string, string> = {
  slice: '雷射刀切割',
  explode: '拆開',
  years: '持有年數',
  periods: '經過年數',
  phase: '時間軸',
  frontLoad: '假設的前收手續費',
}

test('walks the whole tour by clicking 下一步 and unlocks the sandbox', async ({ page }) => {
  test.setTimeout(300_000) // 軟體渲染約 1fps，整段導覽 30+ 步要一至兩分鐘
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?quality=high')
  const next = page.getByRole('button', { name: /下一步|進入沙盒/ })
  const ids = await page.evaluate(() => (window as unknown as { __BCI_STEP_IDS__: string[] }).__BCI_STEP_IDS__)
  const gates = await page.evaluate(() => (window as unknown as { __BCI_STEP_GATES__: { id: string; control: string; min: number }[] }).__BCI_STEP_GATES__)
  const GATES = new Map(gates.map((g) => [g.id, g]))
  expect(GATES.size).toBeGreaterThan(0)
  let before = 0
  for (const id of ids) {
    await settled(page, before)
    const gate = GATES.get(id)
    if (gate) {
      await expect(next).toBeDisabled()
      const label = CONTROL_LABEL[gate.control]
      expect(label, `no label for control ${gate.control}`).toBeTruthy()
      await setRange(page, label!, gate.min)
    }
    await expect(next).toBeEnabled()
    before = await cameraSeq(page)
    await next.click()
  }
  await expect(page.getByRole('button', { name: '重看導覽' })).toBeVisible()
  expect(errors).toEqual([])
})

test('resumes from the last step after reload', async ({ page }) => {
  await page.goto('/?level=2&step=1&quality=high')
  await settled(page)
  await page.goto('/?quality=high')
  await expect(page.getByText('第 2 關', { exact: false })).toBeVisible()
})
