/**
 * Снимает статический экспорт во всех разрешениях, проверяет маршруты
 * и меряет фактическую частоту кадров.
 *
 *   npm run build && node scripts/shoot.mjs [каталог-снимков]
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const SHOTS = path.resolve(process.argv[2] ?? 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (!p.startsWith(BASE)) return res.writeHead(404).end('вне basePath')
  p = p.slice(BASE.length) || '/'
  let file = path.join(ROOT, p)
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return res.writeHead(404).end('нет файла')
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

await new Promise((r) => server.listen(4321, r))
const origin = `http://127.0.0.1:4321${BASE}`

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--force-device-scale-factor=1', '--no-sandbox'],
})

const ROUTES = [
  { path: '/', name: 'glavnaya' },
  { path: '/programma/', name: 'programma' },
  { path: '/gosti/', name: 'gosti' },
  { path: '/mesto/', name: 'mesto' },
  { path: '/zapis/', name: 'zapis' },
]

const SIZES = [
  { tag: 'desktop', width: 1920, height: 1080 },
  { tag: 'wide', width: 2560, height: 1440, only: '/' },
  { tag: 'mobile', width: 390, height: 844, mobile: true },
]

const failures = []
const note = (m) => failures.push(m)

/* ---- 1. каждый маршрут отдаётся по прямой ссылке и рисуется без ошибок ---- */
for (const size of SIZES) {
  for (const route of ROUTES) {
    if (size.only && size.only !== route.path) continue

    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      isMobile: !!size.mobile,
      hasTouch: !!size.mobile,
    })
    const page = await ctx.newPage()
    page.on('console', (m) => m.type() === 'error' && note(`${route.name}/${size.tag}: ${m.text()}`))
    page.on('requestfailed', (r) =>
      note(`${route.name}/${size.tag}: не загрузилось ${r.url()}`),
    )

    const resp = await page.goto(origin + route.path, { waitUntil: 'networkidle' })
    if (!resp || resp.status() !== 200) {
      note(`${route.name}: прямая ссылка отдала ${resp?.status()}`)
    }
    await page.waitForTimeout(route.path === '/' ? 3400 : 1800)

    await page.screenshot({ path: path.join(SHOTS, `${route.name}-${size.tag}.png`) })

    // горизонтальной прокрутки быть не должно нигде
    const box = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      sh: document.documentElement.scrollHeight,
    }))
    if (box.sw > box.cw + 1) note(`${route.name}/${size.tag}: горизонтальный скролл ${box.sw}>${box.cw}`)

    // hero — ровно один экран без скролла внутри себя
    if (route.path === '/') {
      const heroH = await page.evaluate(() => {
        const m = document.querySelector('main')
        return m ? Math.round(m.getBoundingClientRect().height) : 0
      })
      if (Math.abs(heroH - size.height) > 2) {
        note(`hero/${size.tag}: высота ${heroH} вместо ${size.height}`)
      }
    }

    console.log(`✓ ${route.name.padEnd(10)} ${size.tag.padEnd(8)} высота страницы ${box.sh}`)
    await ctx.close()
  }
}

/* ---- 2. полностраничные снимки внутренних страниц ---------------------- */
for (const route of ROUTES.slice(1)) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  await page.goto(origin + route.path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  // /gosti и /mesto держатся на pin/sticky — полностраничный снимок их ломает
  if (route.path === '/programma/' || route.path === '/zapis/') {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1400)
    await page.screenshot({ path: path.join(SHOTS, `${route.name}-full.png`), fullPage: true })
  }
  await ctx.close()
}

/* ---- 3. частота кадров ------------------------------------------------- */
const SAMPLER = `async (ms) => {
  let n = 0
  const t0 = performance.now()
  await new Promise((done) => {
    const tick = () => { n++; performance.now() - t0 < ms ? requestAnimationFrame(tick) : done() }
    requestAnimationFrame(tick)
  })
  return Math.round((n / (performance.now() - t0)) * 1000)
}`

const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]

async function solo(fn) {
  const c = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  const out = await fn(p)
  await c.close()
  return out
}

// потолок этого рендерера — пустая страница в тех же условиях
const ceilingRuns = []
for (let i = 0; i < 3; i++) {
  ceilingRuns.push(
    await solo(async (p) => {
      await p.goto('data:text/html,<body style="background:#000">')
      return p.evaluate(`(${SAMPLER})(1200)`)
    }),
  )
}
const ceiling = median(ceilingRuns)

const fps = { ceiling }

// скролл по каждой странице
for (const route of ROUTES) {
  fps[route.name] = await solo(async (p) => {
    await p.goto(origin + route.path, { waitUntil: 'networkidle' })
    await p.waitForTimeout(route.path === '/' ? 3400 : 1600)
    return p.evaluate(`(async () => {
      let y = 0
      const drive = setInterval(() => {
        y += 90
        window.scrollTo(0, y % Math.max(1, document.body.scrollHeight - innerHeight))
        dispatchEvent(new WheelEvent('wheel', { deltaY: 90 }))
      }, 16)
      const f = await (${SAMPLER})(2000)
      clearInterval(drive)
      return f
    })()`)
  })
}

// переход между страницами: меряем ровно во время шторы
fps.perehod = await solo(async (p) => {
  await p.goto(origin + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)
  return p.evaluate(`(async () => {
    const link = [...document.querySelectorAll('a')].find(a => a.getAttribute('href')?.includes('programma'))
    link.click()
    return (${SAMPLER})(1400)
  })()`)
})

console.log('\\nFPS', JSON.stringify(fps))
for (const [k, v] of Object.entries(fps)) {
  if (k === 'ceiling') continue
  if (v < ceiling * 0.9) note(`${k}: ${v} fps против потолка ${ceiling}`)
}

await browser.close()
server.close()

if (failures.length) {
  console.error('\\nПРОБЛЕМЫ:')
  for (const f of failures) console.error(' •', f)
  process.exit(1)
}
console.log('\\nвсё чисто')
