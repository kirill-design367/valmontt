/** Кадры всех пяти страниц: десктоп и телефон. */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const OUT = path.resolve('shots')
const МЕТКА = process.argv[2] ?? 'v10'
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
await new Promise((r) => srv.listen(4720, r))
const o = `http://127.0.0.1:4720${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

/** Плавный проезд до нужной точки: сборка букв идёт по скроллу. */
const доехать = async (p, y) => {
  if (!y) return
  await p.evaluate((y) => {
    let n = 0
    const t = setInterval(() => {
      n += 40
      scrollTo(0, Math.min(n, y))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }))
      if (n >= y) clearInterval(t)
    }, 16)
  }, y)
  await p.waitForTimeout(2400)
}

const СЦЕНЫ = [
  ['glavnaya', '/', 0],
  ['glavnaya-manifest', '/', 1150],
  ['glavnaya-vhod', '/', 2300],
  ['glavnaya-final', '/', 3600],
  ['programma', '/programma/', 700],
  ['gosti', '/gosti/', 0],
  ['gosti-nizh', '/gosti/', 1100],
  ['mesto', '/mesto/', 600],
  ['zapis', '/zapis/', 0],
]

for (const [имя, маршрут, y] of СЦЕНЫ) {
  for (const [tag, w, h, m] of [['desktop', 1920, 1080, false], ['mobile', 390, 844, true]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m })
    const p = await c.newPage()
    await p.goto(o + маршрут, { waitUntil: 'networkidle' })
    await p.waitForTimeout(маршрут === '/' ? 3400 : 2000)
    await доехать(p, m ? Math.round(y * 0.8) : y)
    await p.screenshot({ path: path.join(OUT, `${МЕТКА}-${имя}-${tag}.png`) })
    await c.close()
  }
}

await b.close()
srv.close()
console.log('кадры сняты')
