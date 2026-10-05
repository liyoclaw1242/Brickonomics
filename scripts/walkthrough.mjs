import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

// node scripts/walkthrough.mjs [base] [outDir] [width] [height] [theme]
// theme：dusk（預設）或 day；有傳就在每個 URL 加 &theme=（只預覽，不寫入 localStorage）
const [base = 'http://localhost:5174', out = '.superpowers/sdd/shots/walk', w = '1280', h = '800', theme] = process.argv.slice(2)
if (theme !== undefined && theme !== 'dusk' && theme !== 'day') {
  console.error(`theme must be dusk or day: ${theme}`)
  process.exit(2)
}
const themeQuery = theme ? `&theme=${theme}` : ''
const mobile = Number(w) <= 720
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, hasTouch: mobile, isMobile: mobile })
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}/?quality=high&course=beginner${themeQuery}`, { waitUntil: 'networkidle' })
  // 每門可上的課、照課程順序：檔名＝課程-編號-步驟 id
  const courses = await page.evaluate(() => window.__BCI_COURSES__)
  for (const [course, ids] of Object.entries(courses)) {
    for (const [i, id] of ids.entries()) {
      await page.goto(`${base}/?course=${course}&step=${id}&quality=high${themeQuery}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('body[data-camera-seq]', { timeout: 15000 }).catch(() => {})
      await page
        .waitForSelector('body[data-camera-settled="true"]', { timeout: 15000 })
        .catch(() => page.waitForTimeout(3500))
      // 鏡頭停下後：文字淡入（每段 80ms）＋大數字長出來（600ms）＋色調漸變（400ms）
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${out}/${course}-${String(i).padStart(2, '0')}-${id}.png`, timeout: 90000 }) // 軟體渲染＋連續繪製的步驟（計費表）截圖較慢
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
