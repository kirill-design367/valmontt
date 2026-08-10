/**
 * fps новых сцен восьмого круга: сборка букв, перья по курсору, hero целиком.
 * Каждая сцена — три прогона, берётся медиана; потолок снимается на пустой
 * странице тем же рендерером.
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
await new Promise((r) => srv.listen(4620, r))
const o = `http://127.0.0.1:4620${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const FPS = `async (ms)=>{let n=0;const t0=performance.now();await new Promise(d=>{const t=()=>{n++;performance.now()-t0<ms?requestAnimationFrame(t):d()};requestAnimationFrame(t)});return Math.round(n/(performance.now()-t0)*1000)}`
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1]

const прогон = async (route, тело, ms = 2600) => {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(route === '/' ? 3400 : 2000)
  const f = await p.evaluate(`(async()=>{ ${тело} const f = await (${FPS})(${ms}); clearInterval(таймер); return f })()`)
  await c.close()
  return f
}

const сцены = {
  'потолок пустой страницы': async () => {
    const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
    const p = await c.newPage()
    await p.goto('data:text/html,<body style="background:#000">')
    const f = await p.evaluate(`(${FPS})(1500)`)
    await c.close()
    return f
  },

  'hero в покое': () => прогон('/', 'const таймер = 0;'),

  'hero с параллаксом': () => прогон('/', `
    let a = 0
    const таймер = setInterval(() => {
      a += 0.12
      dispatchEvent(new PointerEvent('pointermove', {
        clientX: innerWidth * (0.5 + 0.35 * Math.sin(a)),
        clientY: innerHeight * (0.5 + 0.3 * Math.cos(a)),
        bubbles: true, pointerType: 'mouse',
      }))
    }, 16)
  `),

  'перья по курсору': () => прогон('/', `
    // резкие рывки: именно они рождают частицы
    let a = 0
    const таймер = setInterval(() => {
      a += 0.55
      dispatchEvent(new PointerEvent('pointermove', {
        clientX: innerWidth * (0.5 + 0.4 * Math.sin(a)),
        clientY: innerHeight * (0.5 + 0.35 * Math.cos(a * 1.3)),
        bubbles: true, pointerType: 'mouse',
      }))
    }, 16)
  `),

  'сборка букв — манифест': () => прогон('/', `
    const цель = document.querySelector('[data-letters]')
    let y = цель.getBoundingClientRect().top + scrollY - innerHeight
    const таймер = setInterval(() => { y += 24; scrollTo(0, y); dispatchEvent(new WheelEvent('wheel', { deltaY: 24 })) }, 16)
  `),

  'сборка букв — хронология': () => прогон('/programma/', `
    let y = 0
    const таймер = setInterval(() => { y += 26; scrollTo(0, y); dispatchEvent(new WheelEvent('wheel', { deltaY: 26 })) }, 16)
  `),

  'сборка букв — бестиарий': () => прогон('/gosti/', `
    let y = 0
    const таймер = setInterval(() => { y += 26; scrollTo(0, y); dispatchEvent(new WheelEvent('wheel', { deltaY: 26 })) }, 16)
  `),

  'сборка букв — место': () => прогон('/mesto/', `
    let y = 0
    const таймер = setInterval(() => { y += 26; scrollTo(0, y); dispatchEvent(new WheelEvent('wheel', { deltaY: 26 })) }, 16)
  `),
}

const итог = {}
for (const [имя, fn] of Object.entries(сцены)) {
  const прогоны = []
  for (let i = 0; i < 3; i++) прогоны.push(await fn())
  итог[имя] = med(прогоны)
  console.log(имя.padEnd(26), String(итог[имя]).padStart(3), '  прогоны', прогоны.join('/'))
}

console.log('\n' + JSON.stringify(итог))
await b.close()
srv.close()
