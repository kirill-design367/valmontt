/**
 * Снимает статический экспорт в реальных разрешениях и меряет частоту кадров
 * во время входной анимации и параллакса.
 *
 *   node scripts/shoot.mjs [outDir]
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
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (!p.startsWith(BASE)) {
    res.writeHead(404).end('outside basePath')
    return
  }
  p = p.slice(BASE.length) || '/'
  let file = path.join(ROOT, p)
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

await new Promise((r) => server.listen(4321, r))
const origin = `http://127.0.0.1:4321${BASE}`

// в этом окружении Chromium уже стоит — качать ничего не надо
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--force-device-scale-factor=1', '--no-sandbox'],
})

const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, path: '/' },
  { name: 'desktop-2560x1440', width: 2560, height: 1440, path: '/' },
  { name: 'mobile-390x844', width: 390, height: 844, path: '/', mobile: true },
  { name: 'fonts-1920x1080', width: 1920, height: 1080, path: '/fonts/', full: true },
]

const failures = []

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 1,
    isMobile: !!v.mobile,
    hasTouch: !!v.mobile,
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && failures.push(`${v.name}: ${m.text()}`))
  page.on('requestfailed', (r) => failures.push(`${v.name}: ${r.url()} ${r.failure()?.errorText}`))

  await page.goto(origin + v.path, { waitUntil: 'networkidle' })

  await page.waitForTimeout(3200) // вход отыгран целиком

  await page.screenshot({ path: path.join(SHOTS, `${v.name}.png`), fullPage: !!v.full })

  // проверка «строго 100vh, без скролла»
  const overflow = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  if (!v.full && (overflow.scrollH > overflow.clientH || overflow.scrollW > overflow.clientW)) {
    failures.push(`${v.name}: страница прокручивается ${JSON.stringify(overflow)}`)
  }

  console.log(`✓ ${v.name}`, JSON.stringify(overflow))
  await ctx.close()
}

/* ---- раскадровка входа --------------------------------------------------
 * Снимать надо от commit, а не от networkidle: к networkidle таймлайн уже
 * отыгран и в кадре только финал.
 * ---------------------------------------------------------------------- */
{
  const c = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(origin + '/', { waitUntil: 'commit' })
  // ждём фактический старт таймлайна — он отложен до декодирования снимка
  await p.waitForFunction(() => {
    const el = document.querySelector('[data-wordmark]')
    return el && parseFloat(getComputedStyle(el).opacity) > 0.02
  })
  let prev = 0
  for (const t of [150, 500, 1000, 1600, 2400]) {
    await p.waitForTimeout(t - prev)
    prev = t
    await p.screenshot({ path: path.join(SHOTS, `entrance-${String(t).padStart(4, '0')}ms.png`) })
  }
  await c.close()
}

/* ---- частота кадров ---------------------------------------------------- *
 * Каждый замер — в отдельном контексте и по очереди: две анимирующие
 * страницы в одном браузере отбирают друг у друга процессор, и цифры плывут.
 * Берём медиану из трёх прогонов.
 * ---------------------------------------------------------------------- */
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

const ceiling = median(
  await Promise.all([0, 1, 2].map(() => 0)).then(() =>
    Promise.resolve([]).then(async () => {
      const r = []
      for (let i = 0; i < 3; i++) {
        r.push(await solo(async (p) => {
          await p.goto('data:text/html,<body style="background:#000">')
          return p.evaluate(`(${SAMPLER})(1200)`)
        }))
      }
      return r
    }),
  ),
)

const entranceRuns = []
for (let i = 0; i < 3; i++) {
  entranceRuns.push(
    await solo(async (p) => {
      await p.goto(origin + '/', { waitUntil: 'commit' })
      return p.evaluate(`(async () => {
        await new Promise((done) => {
          const poll = () => {
            const el = document.querySelector('[data-wordmark]')
            if (el && parseFloat(getComputedStyle(el).opacity) > 0.02) return done()
            requestAnimationFrame(poll)
          }
          poll()
        })
        return (${SAMPLER})(2100)
      })()`)
    }),
  )
}
const entranceFps = median(entranceRuns)

const steady = await solo(async (p) => {
  await p.goto(origin + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3200)
  const idle = await p.evaluate(`(${SAMPLER})(1200)`)
  const moving = await p.evaluate(`(async () => {
    let x = 0
    const drive = setInterval(() => {
      x = (x + 40) % innerWidth
      dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: (x / 3) % innerHeight }))
    }, 16)
    const fps = await (${SAMPLER})(1800)
    clearInterval(drive)
    return fps
  })()`)
  return { idle, moving }
})

console.log('FPS', JSON.stringify({ entrance: entranceFps, ...steady, ceiling }))
if (steady.moving < ceiling * 0.9) failures.push(`параллакс ${steady.moving} fps против потолка ${ceiling}`)
if (entranceFps < ceiling * 0.85) failures.push(`вход ${entranceFps} fps против потолка ${ceiling}`)

await browser.close()
server.close()

if (failures.length) {
  console.error('\nПРОБЛЕМЫ:')
  for (const f of failures) console.error(' •', f)
  process.exit(1)
}
console.log('\nвсё чисто')
