import { expect, type Page } from '@playwright/test'

/** 目前的鏡頭啟動序號（每次 rig 啟動 +1） */
export async function cameraSeq(page: Page): Promise<number> {
  return Number((await page.locator('body').getAttribute('data-camera-seq')) ?? '0')
}

/** 等鏡頭到位；after 為動作前的序號，確保等到的是動作之後的那次移動 */
export async function settled(page: Page, after = 0) {
  await expect.poll(() => cameraSeq(page), { timeout: 30_000 }).toBeGreaterThan(after)
  await expect(page.locator('body')).toHaveAttribute('data-camera-settled', 'true', { timeout: 30_000 })
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
