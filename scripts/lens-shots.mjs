/**
 * Линза: снимки покоя и наведения, проверка что подложка стекла загружена
 * и села на своё место. Заодно — чем рисует сам браузер в этой песочнице.
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
await new Promise((r) => srv.listen(4540, r))
const origin = `http://127.0.0.1:4540${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

/* чем рисует браузер: от этого зависит, как читать цифры fps */
{
  const c = await b.newContext()
  const p = await c.newPage()
  await p.goto('data:text/html,<canvas id=c>')
  const gl = await p.evaluate(() => {
    const g = document.querySelector('canvas').getContext('webgl')
    const d = g && g.getExtension('WEBGL_debug_renderer_info')
    return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'нет webgl'
  })
  console.log('рендерер:', gl)
  await c.close()
}

for (const [tag, w, h, m] of [['desktop', 1920, 1080, false], ['mobile', 390, 844, true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: m, hasTouch: m })
  const p = await c.newPage()
  const seen = []
  p.on('response', (r) => seen.push(r.url()))

  await p.goto(origin + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)

  await p.screenshot({ path: path.join(OUT, `v6-lens-rest-${tag}.png`), clip: await clip(p) })

  // наведение мышью: React слушает pointerover
  await p.evaluate(() => {
    const el = document.querySelector('[data-lens]')
    el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }))
  })
  await p.waitForTimeout(1400)
  await p.screenshot({ path: path.join(OUT, `v6-lens-hover-${tag}.png`), clip: await clip(p) })

  /* Совпадение считаем при замороженном масштабе: дыхание и наведение
     увеличивают рамку вместе со стеклом — это и есть эффект увеличительного
     стекла, но для проверки посадки он мешает. */
  const glass = await p.evaluate(() => {
    const st = document.createElement('style')
    st.textContent = '[data-lens]{transform:none!important}'
    document.head.appendChild(st)
    const g = document.querySelector('[data-frost-blur] > span')
    const bg = document.querySelector('[data-bg-image]')
    const r = g.getBoundingClientRect()
    const rb = bg.getBoundingClientRect()
    return {
      картинка: getComputedStyle(g).backgroundImage.slice(0, 62),
      расхождениеX: Math.round(r.left - rb.left),
      расхождениеY: Math.round(r.top - rb.top),
      размерX: Math.round(r.width - rb.width),
      размерY: Math.round(r.height - rb.height),
    }
  })
  console.log(tag, JSON.stringify(glass))

  // стекло обязано совпасть с подложкой hero пиксель в пиксель (± пара px
  // на границы и параллакс переднего плана)
  for (const k of ['расхождениеX', 'расхождениеY', 'размерX', 'размерY']) {
    if (Math.abs(glass[k]) > 4) bad.push(`${tag}: стекло не совпало с кадром, ${k} = ${glass[k]} px`)
  }

  const fetched = seen.some((u) => u.includes('-glass.'))
  console.log(tag, 'подложка стекла загружена:', fetched)
  if (!fetched) bad.push(`${tag}: файл стекла не запрошен — при первом наведении будет пустая рамка`)

  await c.close()
}

async function clip(p) {
  const box = await p.locator('[data-lens]').boundingBox()
  const pad = 90
  return {
    x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
    width: box.width + pad * 2, height: box.height + pad * 2,
  }
}

await b.close()
srv.close()
if (bad.length) { console.error('\nПРОБЛЕМЫ:'); bad.forEach((x) => console.error(' •', x)); process.exit(1) }
console.log('\nстекло на месте')
