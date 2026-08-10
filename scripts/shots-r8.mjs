/** Кадры восьмого круга: /fonts, сборка букв на полпути, перья. */
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
await new Promise((r) => srv.listen(4650, r))
const o = `http://127.0.0.1:4650${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

/* --- /fonts: два набора заголовка рядом --- */
{
  const c = await b.newContext({ viewport: { width: 1600, height: 1000 } })
  const p = await c.newPage()
  await p.goto(o + '/fonts/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  const box = await p.locator('section').first().boundingBox()
  await p.screenshot({
    path: path.join(OUT, 'v8-zagolovok-ab.png'),
    clip: { x: 0, y: Math.max(0, box.y - 20), width: 1600, height: Math.min(980, box.height + 60) },
  })
  await c.close()
}

/* --- сборка букв: три состояния манифеста --- */
for (const [имя, доля] of [['razlet', 0.08], ['pol', 0.55], ['sobrano', 1]]) {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)
  await p.evaluate((доля) => {
    const цель = document.querySelector('[data-letters]')
    const верх = цель.getBoundingClientRect().top + scrollY
    // start 'top 88%' … end 'top 42%' — идём по этому отрезку
    const a = верх - innerHeight * 0.88
    const b = верх - innerHeight * 0.42
    scrollTo(0, a + (b - a) * доля)
  }, доля)
  await p.waitForTimeout(1400)
  await p.screenshot({ path: path.join(OUT, `v8-bukvy-${имя}.png`) })
  await c.close()
}

/* --- перья: резкое движение курсора --- */
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)
  /* Частица живёт 0.8 с: если сначала подвигать курсор, а потом снимать,
     к моменту снимка не останется ни одной. Поэтому шлейф крутится фоном,
     и кадр берётся прямо посреди него. */
  await p.evaluate(() => {
    let a = 0
    window.__perья = setInterval(() => {
      a += 0.55
      dispatchEvent(new PointerEvent('pointermove', {
        clientX: 960 + 620 * Math.sin(a),
        clientY: 540 + 330 * Math.cos(a * 1.3),
        bubbles: true,
        pointerType: 'mouse',
      }))
    }, 16)
  })
  await p.waitForTimeout(500)
  await p.screenshot({ path: path.join(OUT, 'v8-perya.png') })
  await p.evaluate(() => clearInterval(window.__перья))
  await c.close()
}

await b.close()
srv.close()
console.log('кадры сняты')
