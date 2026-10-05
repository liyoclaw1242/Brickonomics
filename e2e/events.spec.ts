import { test, expect } from '@playwright/test'
import { setRange, settled } from './helpers'

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

// Plan 7 review：過 eventWhen 門檻的事件要立刻開始（不能再等 1.5 秒的鏡頭備援）。
// 門檻之前事件不存在；拖到谷底的那一刻地震的時鐘就開始走（DEV 記錄 clock-start）。
test('s-dd: crossing the trough gate starts the quake clock right away (no second camera wait)', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/?quality=high&course=intermediate&step=s-dd')
  await settled(page)
  await expect(page.locator('.step-reveal.is-revealed').first()).toBeAttached()
  await page.waitForTimeout(500)
  const log = () => page.evaluate(() => (window as unknown as { __BCI_EVENT_LOG__?: { what: string; at: number }[] }).__BCI_EVENT_LOG__ ?? [])
  expect((await log()).filter((e) => e.what === 'clock-start:quake')).toEqual([]) // 門檻之前沒有地震
  const [gateAt, framesAt] = await page.getByLabel('時間軸', { exact: false }).first().evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(el, '5')
    const t = performance.now()
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return [t, (window as unknown as { __BCI_FRAMES__?: number }).__BCI_FRAMES__ ?? 0]
  })
  await expect.poll(async () => (await log()).filter((e) => e.what === 'clock-start:quake').length, { timeout: 10_000 }).toBe(1)
  const start = (await log()).find((e) => e.what === 'clock-start:quake')!
  const frames = await page.evaluate(() => (window as unknown as { __BCI_FRAMES__?: number }).__BCI_FRAMES__ ?? 0)
  console.log(`quake clock started ${Math.round(start.at - gateAt)} ms after the gate (${frames - framesAt} frames so far)`)
  expect(start.at - gateAt).toBeLessThan(500) // 舊的寫法要等 1500 ms 的鏡頭備援
  // 而且只開始一次：舊的寫法先偷跑一幀、又收回，1.5 秒後才真正重新開始（第二筆 clock-start）
  await page.waitForTimeout(2500)
  expect((await log()).filter((e) => e.what === 'clock-start:quake')).toHaveLength(1)
})

// Plan 7 review：事件不自己掛燈（燈數一變，所有受光材質要重新編譯）。b-rate 過門檻（寒流）前後、再到 b-infl（熱浪）、e-dca（晴天），燈數都一樣。
test('event lights: the scene light count never changes across the b-rate gate and the weather steps', async ({ page }) => {
  test.setTimeout(120_000)
  const lights = () => page.evaluate(() => (window as unknown as { __BCI_LIGHTS__?: number }).__BCI_LIGHTS__ ?? -1)
  await page.goto('/?quality=high&course=intermediate&step=b-rate')
  await settled(page)
  await page.waitForTimeout(300)
  const before = await lights()
  expect(before).toBeGreaterThan(0)
  await setRange(page, '市場利率', 0.05)
  await page.waitForTimeout(1500)
  expect(await lights()).toBe(before)
  await setRange(page, '市場利率', 0.03)
  await page.waitForTimeout(500)
  expect(await lights()).toBe(before)
  for (const step of ['b-infl', 'e-dca']) {
    await page.goto(`/?quality=high&course=intermediate&step=${step}`)
    await settled(page)
    await page.waitForTimeout(1500)
    expect(await lights(), step).toBe(before)
  }
})
