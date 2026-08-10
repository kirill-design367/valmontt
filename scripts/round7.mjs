/**
 * Проверка седьмого круга правок:
 *  1. меню — равные промежутки, одна базовая линия, подчёркивание по наведению
 *  2. бургер — нет на обложке, выходит после неё, возвращается наверх и гаснет
 *  3. с hero сняты кружок, корзина и аватарки
 *  4. форма записи — одна сетка, приписки нет
 */
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
await new Promise((r) => srv.listen(4560, r))
const o = `http://127.0.0.1:4560${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

/* ---------------------------------------------------------------- меню --- */
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)

  const nav = await p.evaluate(() => {
    const links = [...document.querySelectorAll('nav a')]
    const rs = links.map((l) => l.getBoundingClientRect())
    const gaps = rs.slice(1).map((r, i) => Math.round(r.left - rs[i].right))
    const cs = links.map((l) => getComputedStyle(l))
    return {
      пунктов: links.length,
      промежутки: gaps,
      низ: rs.map((r) => Math.round(r.bottom)),
      кегли: [...new Set(cs.map((s) => s.fontSize))],
      трекинги: [...new Set(cs.map((s) => s.letterSpacing))],
    }
  })
  console.log('меню', JSON.stringify(nav))
  if (new Set(nav.промежутки).size !== 1) bad.push(`меню: промежутки неравные — ${nav.промежутки.join('/')}`)
  if (new Set(nav.низ).size !== 1) bad.push(`меню: базовая линия разъехалась — ${nav.низ.join('/')}`)
  if (nav.кегли.length !== 1 || nav.трекинги.length !== 1) bad.push('меню: кегль или трекинг пунктов различаются')

  // подчёркивание: до наведения ширины нет, после — есть, при уходе снова нет
  const box = await (await p.$('nav a')).boundingBox()
  const width = () => p.evaluate(() => {
    const a = document.querySelector('nav a')
    return +getComputedStyle(a, '::after').transform.split(/[(,]/)[1] || 0
  })
  const before = await width()
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await p.waitForTimeout(120)
  const half = await width()
  await p.waitForTimeout(400)
  const after = await width()
  await p.mouse.move(10, 600)
  await p.waitForTimeout(450)
  const gone = await width()
  console.log('подчёркивание', JSON.stringify({ покой: before, 'через 120мс': +half.toFixed(2), наведено: after, ушло: gone }))
  if (before > 0.02) bad.push('подчёркивание: видно в покое')
  if (after < 0.98) bad.push(`подчёркивание: не дорисовалось (${after})`)
  if (half < 0.2 || half > 0.98) bad.push(`подчёркивание: за 120 мс дошло до ${half} — кривая не похожа на 0.3 с`)
  if (gone > 0.02) bad.push(`подчёркивание: не убралось (${gone})`)

  await p.screenshot({ path: path.join(OUT, 'v6-nav-hover.png'), clip: { x: 560, y: 0, width: 800, height: 80 } })

  /* с hero снято */
  const gone2 = await p.evaluate(() => ({
    кружок: !!document.querySelector('[data-scroll-dot], [aria-label*="Пролистать"]'),
    корзина: !!document.querySelector('main svg path[d^="M2 4.4"]'),
    аватарки: document.querySelectorAll('main [class*="avatar"]').length,
    бургерНаHero: !!document.querySelector('main nav button'),
  }))
  console.log('снято с hero', JSON.stringify(gone2))
  for (const [k, v] of Object.entries(gone2)) if (v) bad.push(`hero: ${k} всё ещё в кадре`)

  await c.close()
}

/* -------------------------------------------------------------- бургер --- */
for (const [tag, w, h, m] of [['desktop', 1920, 1080, false], ['mobile', 390, 844, true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)

  const vis = () => p.evaluate(() => {
    const el = document.querySelector('button[aria-label*="меню"]')
    const cs = getComputedStyle(el)
    return { видно: cs.visibility === 'visible' && +cs.opacity > 0.5, прозрачность: +(+cs.opacity).toFixed(2) }
  })

  const наОбложке = await vis()
  await p.evaluate(() => scrollTo(0, innerHeight * 1.6))
  await p.waitForTimeout(1400)
  const послеОбложки = await vis()
  await p.evaluate(() => scrollTo(0, 0))
  await p.waitForTimeout(1400)
  const обратноНаверх = await vis()

  console.log(`бургер ${tag}`, JSON.stringify({ наОбложке, послеОбложки, обратноНаверх }))
  if (наОбложке.видно) bad.push(`бургер ${tag}: виден на обложке`)
  if (!послеОбложки.видно) bad.push(`бургер ${tag}: не вышел после обложки`)
  if (обратноНаверх.видно) bad.push(`бургер ${tag}: не убрался при возврате наверх`)

  if (tag === 'desktop') {
    await p.evaluate(() => scrollTo(0, innerHeight * 1.6))
    await p.waitForTimeout(1200)
    await p.click('button[aria-label*="меню"]')
    await p.waitForTimeout(1200)
    await p.screenshot({ path: path.join(OUT, 'v6-menu-open.png') })
  }

  await c.close()
}

/* --------------------------------------------------------------- форма --- */
for (const [tag, w, h, m] of [['desktop', 1440, 900, false], ['mobile', 390, 844, true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: m, hasTouch: m })
  const p = await c.newPage()
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)

  const form = await p.evaluate(() => {
    const inputs = [...document.querySelectorAll('form input')]
    const labels = [...document.querySelectorAll('form label > span')]
    const btn = document.querySelector('form button')
    const ri = inputs.map((i) => i.getBoundingClientRect())
    const rl = labels.map((l) => l.getBoundingClientRect())
    const cs = inputs.map((i) => getComputedStyle(i))
    return {
      длиныЛиний: ri.map((r) => Math.round(r.width)),
      толщиныЛиний: [...new Set(cs.map((s) => s.borderBottomWidth))],
      левыеКрая: [...new Set(ri.map((r) => Math.round(r.left)))],
      кеглиПодписей: [...new Set(labels.map((l) => getComputedStyle(l).fontSize))],
      трекингиПодписей: [...new Set(labels.map((l) => getComputedStyle(l).letterSpacing))],
      // Ряды сетки: поля с общим верхом стоят в одном ряду. Внутри ряда
      // сверяем базовые линии подписей, между рядами — просветы.
      рядыПодписей: Object.values(rl.reduce((acc, r) => {
        const k = Math.round(r.top)
        ;(acc[k] ||= []).push(Math.round(r.bottom))
        return acc
      }, {})).map((v) => [...new Set(v)].length),
      шагиМеждуРядами: (() => {
        const rows = Object.values(ri.reduce((acc, r) => {
          const k = Math.round(r.top)
          ;(acc[k] ||= []).push(r)
          return acc
        }, {})).map((v) => ({ top: Math.min(...v.map((r) => r.top)), bottom: Math.max(...v.map((r) => r.bottom)) }))
          .sort((a, b) => a.top - b.top)
        return rows.slice(1).map((r, i) => Math.round(r.top - rows[i].bottom))
      })(),
      левыйКрайКнопки: Math.round(btn.getBoundingClientRect().left),
      приписка: document.body.textContent.includes('никуда не отправляется'),
    }
  })
  console.log(`форма ${tag}`, JSON.stringify(form))

  if (new Set(form.длиныЛиний).size !== 1) bad.push(`форма ${tag}: линии разной длины — ${form.длиныЛиний.join('/')}`)
  if (form.толщиныЛиний.length !== 1) bad.push(`форма ${tag}: линии разной толщины`)
  if (form.кеглиПодписей.length !== 1 || form.трекингиПодписей.length !== 1) bad.push(`форма ${tag}: подписи разного набора`)
  if (form.приписка) bad.push(`форма ${tag}: приписка про отсутствие сервера осталась`)
  if (form.рядыПодписей.some((n) => n !== 1)) bad.push(`форма ${tag}: подписи внутри ряда не на одной базовой линии`)
  const шаги = form.шагиМеждуРядами
  if (Math.max(...шаги) - Math.min(...шаги) > 2) bad.push(`форма ${tag}: промежутки между рядами неравные — ${шаги.join('/')}`)
  if (!form.левыеКрая.includes(form.левыйКрайКнопки)) bad.push(`форма ${tag}: кнопка (${form.левыйКрайКнопки}) не на левой вертикали полей (${form.левыеКрая.join('/')})`)

  await p.screenshot({ path: path.join(OUT, `v6-zapis-${tag}.png`) })
  await c.close()
}

await b.close()
srv.close()
if (bad.length) { console.error('\nПРОБЛЕМЫ:'); bad.forEach((x) => console.error(' •', x)); process.exit(1) }
console.log('\nвсё чисто')
