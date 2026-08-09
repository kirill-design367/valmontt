/**
 * Аудит ссылок и Lighthouse по продакшн-сборке под /valmontt.
 *
 *   node scripts/audit.mjs links      — каждая ссылка кликом и прямым адресом
 *   node scripts/audit.mjs lighthouse — мобильная и десктоп, главная
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const PORT = 4500
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain', '.svg': 'image/svg+xml',
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (!p.startsWith(BASE)) return res.writeHead(404).end()
  p = p.slice(BASE.length) || '/'
  let file = path.join(ROOT, p)
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'public, max-age=31536000',
  })
  fs.createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(PORT, r))
const origin = `http://127.0.0.1:${PORT}${BASE}`

const mode = process.argv[2] ?? 'links'

if (mode === 'links') {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  })
  const PAGES = ['/', '/programma/', '/gosti/', '/mesto/', '/zapis/', '/fonts/']
  const bad = []

  // 1. прямой адрес
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const r = await page.goto(origin + p, { waitUntil: 'domcontentloaded' })
    if (!r || r.status() !== 200) bad.push(`прямой адрес ${p}: ${r?.status()}`)
    else console.log(`прямой адрес  ${p.padEnd(13)} 200`)
    await ctx.close()
  }

  // 2. клик по каждой ссылке
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(origin + p, { waitUntil: 'networkidle' })
    await page.waitForTimeout(p === '/' ? 3400 : 1200)

    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        text: (a.textContent || '').trim().slice(0, 22),
      })),
    )
    const internal = links.filter((l) => l.href.startsWith('/valmontt'))
    if (!internal.length) bad.push(`${p}: внутренних ссылок не найдено`)
    if (links.some((l) => l.href === '#')) bad.push(`${p}: есть href="#"`)

    const seen = new Set()
    for (const l of internal) {
      if (seen.has(l.href)) continue
      seen.add(l.href)
      await page.goto(origin + p, { waitUntil: 'networkidle' })
      await page.waitForTimeout(p === '/' ? 3400 : 1200)
      await page.evaluate((h) => {
        const a = [...document.querySelectorAll('a[href]')].find((x) => x.getAttribute('href') === h)
        a.scrollIntoView({ block: 'center' })
        a.click()
      }, l.href)
      await page.waitForTimeout(1900) // штора 0.5 + пауза + 0.5
      const now = new URL(page.url()).pathname
      const want = l.href
      if (now !== want) bad.push(`${p} → клик «${l.text}» (${want}) увёл на ${now}`)
      else console.log(`клик          ${p.padEnd(13)} «${l.text.padEnd(20)}» → ${want}`)
    }
    await ctx.close()
  }

  await browser.close()
  server.close()
  if (bad.length) {
    console.error('\nБИТЫЕ ССЫЛКИ:')
    bad.forEach((b) => console.error(' •', b))
    process.exit(1)
  }
  console.log('\nвсе ссылки живые')
}

if (mode === 'lighthouse') {
  const lighthouse = (await import('lighthouse')).default
  const { launch } = await import('chrome-launcher')

  const chrome = await launch({
    chromePath: '/opt/pw-browsers/chromium',
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  })

  const out = {}
  for (const preset of ['mobile', 'desktop']) {
    const r = await lighthouse(
      origin + '/',
      { port: chrome.port, output: 'json', logLevel: 'error' },
      preset === 'desktop'
        ? (await import('lighthouse/core/config/desktop-config.js')).default
        : undefined,
    )
    const c = r.lhr.categories
    const a = r.lhr.audits
    out[preset] = {
      производительность: Math.round(c.performance.score * 100),
      доступность: Math.round(c.accessibility.score * 100),
      практики: Math.round(c['best-practices'].score * 100),
      seo: Math.round(c.seo.score * 100),
      LCP: a['largest-contentful-paint'].displayValue,
      FCP: a['first-contentful-paint'].displayValue,
      TBT: a['total-blocking-time'].displayValue,
      CLS: a['cumulative-layout-shift'].displayValue,
      SI: a['speed-index'].displayValue,
      LCPэлемент: (a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? '?').slice(0, 110),
      главныеПотери: (a['diagnostics'] ? '' : '') + (r.lhr.audits['render-blocking-resources']?.displayValue ?? '—'),
    }
    console.log(preset, JSON.stringify(out[preset], null, 1))
  }
  fs.writeFileSync(process.argv[3] ?? 'lighthouse.json', JSON.stringify(out, null, 2))
  await chrome.kill()
  server.close()
}
