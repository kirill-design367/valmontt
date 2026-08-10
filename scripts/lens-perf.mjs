/**
 * Диагностика линзы: что именно съедает кадры.
 *
 * Пять прогонов на одном и том же билде. Разница между ними — ответ на вопрос
 * «тормозит от backdrop-filter, от дыхания или от параллакса».
 *
 *   покой                — ничего не трогаем, линза только дышит
 *   наведение            — наведение туда-обратно, курсор неподвижен
 *   наведение+параллакс  — то же плюс движение курсора (боевой случай)
 *   без backdrop         — то же, но backdrop-filter снят стилями
 *   без дыхания          — то же, но цикл масштаба убит
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
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
await new Promise((r) => srv.listen(4530, r))
const origin = `http://127.0.0.1:4530${BASE}`

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

/** Счётчик кадров: сколько rAF успело пройти за ms. */
const FPS = `async (ms)=>{let n=0;const t0=performance.now();await new Promise(d=>{const t=()=>{n++;performance.now()-t0<ms?requestAnimationFrame(t):d()};requestAnimationFrame(t)});return Math.round(n/(performance.now()-t0)*1000)}`

const run = async (label, { hover = false, move = false, kill = '' }) => {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(origin + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)

  const fps = await p.evaluate(`(async()=>{
    const el = document.querySelector('[data-lens]')
    ${kill}
    const timers = []
    if (${hover}) {
      let on = false
      timers.push(setInterval(() => {
        on = !on
        el.dispatchEvent(new PointerEvent(on ? 'pointerover' : 'pointerout', { bubbles: true, pointerType: 'mouse' }))
        el.dispatchEvent(new PointerEvent(on ? 'pointerenter' : 'pointerleave', { bubbles: true, pointerType: 'mouse' }))
      }, 750))
    }
    if (${move}) {
      let a = 0
      timers.push(setInterval(() => {
        a += 0.12
        dispatchEvent(new PointerEvent('pointermove', {
          clientX: innerWidth * (0.5 + 0.35 * Math.sin(a)),
          clientY: innerHeight * (0.5 + 0.3 * Math.cos(a)),
          bubbles: true, pointerType: 'mouse',
        }))
      }, 16))
    }
    const f = await (${FPS})(3000)
    timers.forEach(clearInterval)
    return f
  })()`)

  await c.close()
  return [label, fps]
}

const ceiling = await (async () => {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto('data:text/html,<body style="background:#000">')
  const f = await p.evaluate(`(${FPS})(1500)`)
  await c.close()
  return f
})()

const out = { потолок: ceiling }
for (const [label, cfg] of [
  ['покой', {}],
  ['наведение', { hover: true }],
  ['параллакс без линзы', { move: true }],
  ['наведение+параллакс', { hover: true, move: true }],
  ['без backdrop', {
    hover: true, move: true,
    kill: `for (const n of el.querySelectorAll('[data-frost-blur]')) { n.style.backdropFilter='none'; n.style.webkitBackdropFilter='none' }`,
  }],
  ['без дыхания', {
    // GSAP пишет масштаб в inline-стиль; правило с !important из таблицы
    // его перебивает — тень тика остаётся, а перерисовки от масштаба нет
    hover: true, move: true,
    kill: `{const st=document.createElement('style');st.textContent='[data-lens]{transform:scale(1)!important}';document.head.appendChild(st)}`,
  }],
]) {
  const passes = []
  for (let i = 0; i < 3; i++) passes.push((await run(label, cfg))[1])
  const v = passes.slice().sort((a, b) => a - b)[1]
  out[label] = v
  console.log(label.padEnd(22), v, '  прогоны', passes.join('/'))
}

console.log(JSON.stringify(out))
await b.close()
srv.close()
