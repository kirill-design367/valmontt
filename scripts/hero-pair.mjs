/**
 * Снимок hero из ЛЮБОГО собранного экспорта — чтобы «до/после» показывать
 * кадрами, а не по памяти. Прошлую версию собираем в отдельном worktree:
 *
 *     git worktree add --detach /tmp/before <коммит>
 *     ln -s "$PWD/node_modules" /tmp/before/node_modules
 *     (cd /tmp/before && NEXT_PUBLIC_BASE_PATH=/valmontt npx next build)
 *     node scripts/hero-pair.mjs /tmp/before/out shots do
 *     node scripts/hero-pair.mjs out shots posle
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2]
const OUT = process.argv[3]
const PREFIX = process.argv[4]
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
await new Promise((r) => srv.listen(4590, r))

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
for (const [tag, w, h, m] of [['desktop', 1920, 1080, false], ['mobile', 390, 844, true]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: m, hasTouch: m })
  const p = await c.newPage()
  await p.goto(`http://127.0.0.1:4590${BASE}/`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400) // вход отыгран целиком
  await p.screenshot({ path: path.join(OUT, `${PREFIX}-hero-${tag}.png`) })
  await c.close()
}
await b.close()
srv.close()
console.log('снято', PREFIX)
