/** Сверяет фактическую геометрию кадра с ТЗ. node scripts/measure.mjs */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain' }

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).slice(BASE.length) || '/'
  let file = path.join(ROOT, p)
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(4322, r))

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
})

for (const [w, h] of [[1920, 1080], [2560, 1440], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(`http://127.0.0.1:4322${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const m = await page.evaluate(() => {
    const r = (el) => (el ? el.getBoundingClientRect() : null)
    const wm = document.querySelector('[data-wordmark]')
    const wmRect = r(wm)

    // высота одной литеры = шаг столбца минус трекинг
    const cs = getComputedStyle(wm)
    const fs = parseFloat(cs.fontSize)
    const track = parseFloat(cs.letterSpacing) || 0
    const step = wmRect.height / 8

    // реальная высота глифа: меряем через Range на первой букве
    const range = document.createRange()
    range.setStart(wm.firstChild, 1)
    range.setEnd(wm.firstChild, 2) // «А»
    const glyph = range.getBoundingClientRect()

    const head = document.querySelector('h2')
    const headSpan = document.querySelector('[data-line]')
    const lens = document.querySelector('[data-lens]')
    const eyeX = parseFloat(getComputedStyle(document.querySelector('main')).getPropertyValue('--eye-x'))
    const eyeY = parseFloat(getComputedStyle(document.querySelector('main')).getPropertyValue('--eye-y'))
    const lede = document.querySelector('p')

    return {
      viewport: [innerWidth, innerHeight],
      wordmark: {
        fontSize: +fs.toFixed(1),
        letterSpacing: +track.toFixed(1),
        columnH: +wmRect.height.toFixed(0),
        columnVsViewport: +(wmRect.height / innerHeight).toFixed(3),
        stepPerLetter: +step.toFixed(1),
        glyphHeightА: +glyph.height.toFixed(1),
        cutTop: +(-wmRect.top).toFixed(0),
        cutBottom: +(wmRect.bottom - innerHeight).toFixed(0),
        right: +(innerWidth - wmRect.right).toFixed(0),
      },
      headline: {
        fontSize: +parseFloat(getComputedStyle(headSpan).fontSize).toFixed(1),
        topPct: +((r(head).top / innerHeight) * 100).toFixed(1),
        lines: document.querySelectorAll('[data-line]').length,
      },
      lede: { lines: Math.round(r(lede).height / parseFloat(getComputedStyle(lede).lineHeight)) },
      lens: lens
        ? {
            box: [+r(lens).width.toFixed(0), +r(lens).height.toFixed(0)],
            eyeInsideX: +((eyeX - r(lens).left) / r(lens).width).toFixed(3),
            eyeInsideY: +((eyeY - r(lens).top) / r(lens).height).toFixed(3),
          }
        : null,
    }
  })
  console.log(`\n=== ${w}×${h} ===`)
  console.log(JSON.stringify(m, null, 1))
  await ctx.close()
}

await browser.close()
server.close()
