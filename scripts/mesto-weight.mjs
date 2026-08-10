/**
 * Сколько на самом деле весит /mesto.
 *
 * Не сумма файлов в public, а то, что браузер реально скачал: <picture>
 * отдаёт по медиазапросу одну ветку из трёх форматов, а внеэкранные кадры
 * висят на lazy и до прокрутки не грузятся. Считаем два числа на каждое
 * устройство — «при открытии» и «после того, как пролистали всю ленту».
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const T = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2',
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
await new Promise((r) => srv.listen(4737, r))
const o = `http://127.0.0.1:4737${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const кб = (n) => `${(n / 1024).toFixed(0)} КБ`

for (const [имя, viewport, моб] of [
  ['десктоп 1920×1080', { width: 1920, height: 1080 }, false],
  ['телефон 390×844', { width: 390, height: 844 }, true],
]) {
  const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
  const p = await c.newPage()

  const снимки = new Map()
  p.on('response', async (r) => {
    const u = r.url()
    if (!/\.(avif|webp|jpe?g)$/i.test(u)) return
    try {
      снимки.set(u.split('/').pop(), (await r.body()).length)
    } catch {}
  })

  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  const приОткрытии = [...снимки.entries()]

  // прокручиваем всю ленту — подтягиваются остальные кадры
  await p.evaluate((моб) => {
    const шаг = моб ? innerHeight * 0.7 : innerWidth * 0.8
    let y = 0
    const t = setInterval(() => {
      y += 80
      scrollTo(0, Math.min(y, шаг * 4))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 80 }))
      if (y >= шаг * 4) clearInterval(t)
    }, 16)
  }, моб)
  await p.waitForTimeout(4500)

  const всего = [...снимки.values()].reduce((a, x) => a + x, 0)
  const сразу = приОткрытии.reduce((a, [, x]) => a + x, 0)
  console.log(`\n${имя}`)
  console.log(`   при открытии   ${кб(сразу)}  (${приОткрытии.length} файл(ов))`)
  console.log(`   вся лента      ${кб(всего)}  (${снимки.size} файлов)`)
  ;[...снимки.entries()].sort().forEach(([n, s]) => console.log(`      ${n.padEnd(22)} ${кб(s)}`))
  await c.close()
}

/* Для сравнения — что лежало раньше и что лежит теперь на диске. */
const сумма = (файлы) => файлы.reduce((a, f) => a + (fs.existsSync(f) ? fs.statSync(f).size : 0), 0)
const now = fs.readdirSync('public/place').map((f) => path.join('public/place', f))
const avif = now.filter((f) => f.endsWith('.avif'))
console.log(`\nна диске сейчас: ${now.length} файлов, ${кб(сумма(now))} всего, из них AVIF ${кб(сумма(avif))}`)

await b.close()
srv.close()
