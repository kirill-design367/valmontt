/**
 * Геометрия обложки на трёх разрешениях:
 *  — срез вордмарка в долях шага столбца (цель ~30 % сверху и снизу)
 *  — заголовок: две строки, левая половина кадра, зазор до вордмарка ≥ 15 % ширины
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
await new Promise((r) => srv.listen(4600, r))
const o = `http://127.0.0.1:4600${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

for (const [tag, w, h, m] of [
  ['1920', 1920, 1080, false],
  ['2560', 2560, 1440, false],
  ['390', 390, 844, true],
]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: m, hasTouch: m })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)

  const g = await p.evaluate(() => {
    const wm = document.querySelector('[data-wordmark]')
    const r = wm.getBoundingClientRect()
    const шаг = r.height / 8
    // Меряем сам набор, а не блок: строка — блочный элемент во всю ширину
    // колонки, и её rect ничего не говорит о том, где кончаются литеры.
    const строки = [...document.querySelectorAll('[data-line]')].map((s) => {
      const rng = document.createRange()
      rng.selectNodeContents(s)
      return rng.getBoundingClientRect()
    })
    const правыйКрайЗаголовка = Math.max(...строки.map((s) => s.right))
    return {
      кегль: +parseFloat(getComputedStyle(wm).fontSize).toFixed(1),
      шаг: Math.round(шаг),
      столбец: +(r.height / innerHeight).toFixed(3),
      срезСверхуДоляШага: +(-r.top / шаг).toFixed(3),
      срезСнизуДоляШага: +((r.bottom - innerHeight) / шаг).toFixed(3),
      строкЗаголовка: строки.length,
      заголовокДоляШирины: +(правыйКрайЗаголовка / innerWidth).toFixed(3),
      зазорДоВордмарка: +((r.left - правыйКрайЗаголовка) / innerWidth).toFixed(3),
      кегльЗаголовка: +parseFloat(getComputedStyle(document.querySelector('[data-line]')).fontSize).toFixed(1),
      // весь текстовый блок целиком: заголовок, лид и кнопка лежат в одной
      // обёртке, поэтому меряем её, а не отдельные куски
      ...(() => {
        const b = document.querySelector('h2').parentElement.getBoundingClientRect()
        return {
          блокСверху: +(b.top / innerHeight).toFixed(3),
          блокСнизу: +((innerHeight - b.bottom) / innerHeight).toFixed(3),
        }
      })(),
    }
  })
  console.log(tag.padEnd(5), JSON.stringify(g))

  for (const k of ['срезСверхуДоляШага', 'срезСнизуДоляШага']) {
    if (Math.abs(g[k] - 0.3) > 0.05) bad.push(`${tag}: ${k} = ${g[k]} вместо ~0.30`)
  }
  if (g.строкЗаголовка !== 2) bad.push(`${tag}: заголовок в ${g.строкЗаголовка} строки вместо двух`)
  // «левая половина» — требование десктопной композиции; на 390 px её нет
  if (!m && g.заголовокДоляШирины > 0.5) bad.push(`${tag}: заголовок вышел за левую половину (${g.заголовокДоляШирины})`)
  if (g.зазорДоВордмарка < 0.15) bad.push(`${tag}: до вордмарка ${Math.round(g.зазорДоВордмарка * 100)} % вместо 15`)
  // блок опущен, но не должен упереться в нижний край и потерять воздух сверху
  if (g.блокСнизу < 0.06) bad.push(`${tag}: под блоком ${Math.round(g.блокСнизу * 100)} % высоты — наезжает на нижний край`)
  if (g.блокСверху < 0.14) bad.push(`${tag}: над блоком ${Math.round(g.блокСверху * 100)} % высоты — воздуха сверху не осталось`)

  await p.screenshot({ path: path.join(OUT, `v7-hero-${tag}.png`) })
  await c.close()
}

await b.close()
srv.close()
if (bad.length) { console.error('\nПРОБЛЕМЫ:'); bad.forEach((x) => console.error(' •', x)); process.exit(1) }
console.log('\nгеометрия сошлась')
