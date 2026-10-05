import { test, expect } from '@playwright/test'
import { settled } from './helpers'

const STRUCK = '台積電被打中'

// 事件時鐘：c-1（烏雲，靜態事件，時鐘直接在終點）→ c-2（閃電）時，舊的 t 不能讓 c-2 一進來就算「已經打中」。
// 打中標籤必須在 c-2 的畫面「先看」（面板文字出現＝鏡頭停下、事件時鐘開始）之後才出現。
test('c-1 → c-2: the strike label waits for the strike, never carries over from the cloud step', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto('/?quality=high&course=beginner&step=c-1')
  await settled(page)
  await expect(page.locator('.step-reveal.is-revealed').first()).toBeAttached()
  await expect(page.getByText(STRUCK)).toHaveCount(0)

  // 在頁面裡記下：c-2 面板文字出現（reveal）與打中標籤第一次出現的時間
  await page.evaluate((needle) => {
    const w = window as unknown as { __ev: { revealAt?: number; struckAt?: number; armed: boolean; hidden: boolean } }
    w.__ev = { armed: false, hidden: false }
    const mo = new MutationObserver(() => {
      const ev = w.__ev
      if (!ev.armed) return
      const shown = !!document.querySelector('.step-reveal.is-revealed')
      // 換步驟時面板文字先藏起來（c-1 的 is-revealed 被拿掉），之後再出現才算 c-2 的 reveal
      if (!shown) ev.hidden = true
      else if (ev.hidden && ev.revealAt === undefined) ev.revealAt = performance.now()
      if (ev.struckAt === undefined && document.body.innerText.includes(needle)) ev.struckAt = performance.now()
    })
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
  }, STRUCK)

  const next = page.locator('.step-nav button.primary')
  await next.evaluate((el) => {
    ;(window as unknown as { __ev: { armed: boolean } }).__ev.armed = true
    ;(el as HTMLButtonElement).click()
  })
  // 剛換到 c-2：還沒打
  await expect(page.getByText(STRUCK)).toHaveCount(0)
  // 鏡頭停下、閃電打下來之後才出現
  await expect(page.getByText(STRUCK)).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator('.step-reveal.is-revealed').first()).toBeAttached()
  const ev = await page.evaluate(() => (window as unknown as { __ev: { revealAt?: number; struckAt?: number } }).__ev)
  expect(ev.revealAt, 'c-2 panel revealed').toBeDefined()
  expect(ev.struckAt, 'strike label appeared').toBeDefined()
  expect(ev.struckAt!).toBeGreaterThan(ev.revealAt!)
  // 3D 那邊（打中標籤、損傷）每一次 commit 都記下（DEV）：連只存在一瞬間的「已經打中」也不能早於 c-2 的 reveal
  const log = await page.evaluate(() => (window as unknown as { __BCI_EVENT_LOG__?: { what: string; at: number }[] }).__BCI_EVENT_LOG__ ?? [])
  const struck = log.filter((e) => e.what === 'struck' || e.what === 'shock-damage')
  expect(struck.map((e) => e.what).sort()).toEqual(['shock-damage', 'struck'])
  for (const e of struck) expect(e.at, `${e.what} committed before the c-2 reveal`).toBeGreaterThan(ev.revealAt!)
  expect(errors).toEqual([])
})
