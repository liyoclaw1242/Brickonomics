import { expect, type Page } from '@playwright/test'

/** 等鏡頭到位 */
export async function settled(page: Page) {
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
