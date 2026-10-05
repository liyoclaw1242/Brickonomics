// npm run build 之後執行（postbuild）：確認 DEV 專用的東西沒有被打包進正式版。
// 目前檢查：事件預覽頁（?eventPreview=，src/scene/events/EventPreview.tsx）。
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST = process.argv[2] ?? 'dist'
const FORBIDDEN = ['eventPreview', 'mountEventPreview', 'data-event-preview']

async function files(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await files(p)))
    else if (/\.(js|mjs|html)$/.test(e.name)) out.push(p)
  }
  return out
}

const hits = []
for (const f of await files(DIST)) {
  const text = await readFile(f, 'utf8')
  for (const word of FORBIDDEN) if (text.includes(word)) hits.push(`${f}: ${word}`)
}
if (hits.length) {
  console.error(`DEV-only code found in the production build:\n${hits.join('\n')}`)
  process.exit(1)
}
console.log(`check-dev-only: ok (${FORBIDDEN.join(', ')} not in ${DIST}/)`)
