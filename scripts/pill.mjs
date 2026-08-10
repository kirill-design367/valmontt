/** Наведение на пилюлю: четыре обещанных изменения и возврат. */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const OUT = path.resolve('shots')
const T = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain',
}
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0])
  if (!p.startsWith(BASE)) return r.writeHead(404).end()
  p = p.slice(BASE.length) || '/'
  let f = path.join(ROOT, p)
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html')
  if (!fs.existsSync(f)) return r.writeHead(404).end()
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(r)
})
await new Promise((r) => srv.listen(4710, r))
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
const p = await c.newPage()
await p.goto(`http://127.0.0.1:4710${BASE}/`, { waitUntil: 'networkidle' })
await p.waitForTimeout(3400)

const снять = () =>
  p.evaluate(() => {
    // в навигации тоже есть ссылка на /zapis/, и она идёт в DOM раньше —
    // поэтому пилюлю находим через её собственную иконку
    const el = document.querySelector('[data-pill-icon]').closest('a')
    const cs = getComputedStyle(el)
    const icon = el.querySelector('[data-pill-icon]')
    // до первого наведения transform ещё 'none' — DOMMatrix на нём падает
    const мат = (v) => (v === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(v))
    return {
      заливка: cs.backgroundColor,
      сдвигY: +мат(cs.transform).f.toFixed(2),
      иконкаX: +мат(getComputedStyle(icon).transform).e.toFixed(2),
      свечение: +getComputedStyle(el, '::after').opacity,
    }
  })

const box = await p.locator('a:has([data-pill-icon])').first().boundingBox()
const покой = await снять()
await p.screenshot({
  path: path.join(OUT, 'v9-pilyulya-pokoy.png'),
  clip: { x: box.x - 40, y: box.y - 40, width: box.width + 80, height: box.height + 80 },
})

await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await p.waitForTimeout(120)
const половина = await снять()
await p.waitForTimeout(400)
const наведено = await снять()
await p.screenshot({
  path: path.join(OUT, 'v9-pilyulya-navedenie.png'),
  clip: { x: box.x - 40, y: box.y - 40, width: box.width + 80, height: box.height + 80 },
})

await p.mouse.move(200, 200)
await p.waitForTimeout(400)
const вернулось = await снять()

console.log('покой    ', JSON.stringify(покой))
console.log('120 мс   ', JSON.stringify(половина))
console.log('наведено ', JSON.stringify(наведено))
console.log('вернулось', JSON.stringify(вернулось))

const серее = (a, b) => {
  const ч = (s) => s.match(/\d+/g).slice(0, 3).map(Number)
  return ч(b).reduce((s, v, i) => s + v, 0) < ч(a).reduce((s, v) => s + v, 0) - 10
}
if (!серее(покой.заливка, наведено.заливка)) bad.push(`заливка не потемнела: ${покой.заливка} → ${наведено.заливка}`)
if (Math.abs(наведено.иконкаX - 4) > 0.5) bad.push(`иконка сдвинулась на ${наведено.иконкаX} px вместо 4`)
if (Math.abs(наведено.сдвигY + 2) > 0.5) bad.push(`пилюля поднялась на ${-наведено.сдвигY} px вместо 2`)
if (наведено.свечение < 0.95) bad.push(`свечение не загорелось: ${наведено.свечение}`)
if (половина.иконкаX < 0.5 || половина.иконкаX > 3.9) {
  bad.push(`за 120 мс иконка ушла на ${половина.иконкаX} px — кривая не похожа на 0.25 с`)
}
if (Math.abs(вернулось.иконкаX) > 0.3 || Math.abs(вернулось.сдвигY) > 0.3 || вернулось.свечение > 0.05) {
  bad.push('после ухода курсора состояние не вернулось')
}

await b.close()
srv.close()
if (bad.length) { console.error('\nПРОБЛЕМЫ:'); bad.forEach((x) => console.error(' •', x)); process.exit(1) }
console.log('\nпилюля в порядке')
