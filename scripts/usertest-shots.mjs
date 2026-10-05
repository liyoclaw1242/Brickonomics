// 使用者測試截圖：每一步拍「剛進來」，有拉桿的步驟再拍「拉到底之後」
// 用法：node scripts/usertest-shots.mjs [base] [out] [w] [h] [course]
//   course＝beginner|intermediate（選填）：只拍那門課的步驟，檔名照課程順序編號；不填＝每門可上的課都拍（檔名前加課程 id）
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const [base = 'http://localhost:5173', out = '.superpowers/usertest/r1', w = '1280', h = '800', course] = process.argv.slice(2)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } })
  await page.goto(`${base}/?quality=high&course=beginner`, { waitUntil: 'networkidle' })
  const courses = await page.evaluate(() => window.__BCI_COURSES__)
  if (course !== undefined && !courses[course]) throw new Error(`unknown course ${course}（${Object.keys(courses).join(' 或 ')}）`)
  const keep = Object.entries(courses)
    .filter(([c]) => course === undefined || c === course)
    .flatMap(([c, ids]) => ids.map((id, i) => ({ c, id, name: `${course ? '' : `${c}-`}${String(i + 1).padStart(2, '0')}-${id}` })))
  for (const { c, id, name } of keep) {
    await page.goto(`${base}/?course=${c}&step=${id}&quality=high`, { waitUntil: 'networkidle' })
    await page.waitForSelector('body[data-camera-settled="true"]', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${out}/${name}-a.png` })
    const ranges = page.locator('.panel input[type=range]')
    const count = await ranges.count()
    if (count > 0) {
      for (let r = 0; r < count; r++) {
        await ranges.nth(r).evaluate((el) => {
          const input = el
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
          setter.call(input, input.max)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
      }
      await page.waitForTimeout(2500)
      await page.screenshot({ path: `${out}/${name}-b.png` })
    }
  }
} finally {
  await browser.close()
}
