/**
 * Когда именно приходит выход с финального экрана.
 * Отсчёт от момента, как введён верный код, — то, что видит человек.
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
  '.woff2': 'font/woff2', '.txt': 'text/plain',
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
await new Promise((r) => srv.listen(4757, r))
const o = `http://127.0.0.1:4757${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
const p = await c.newPage()
await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)

const вехи = await p.evaluate(async () => {
  const поля = [...document.querySelectorAll('input')]
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  const t0 = performance.now()
  поля.forEach((f, i) => {
    f.focus()
    set.call(f, '1847'[i])
    f.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const засечь = (условие) =>
    new Promise((готово) => {
      const тик = () => {
        if (условие()) готово(Math.round(performance.now() - t0))
        else requestAnimationFrame(тик)
      }
      requestAnimationFrame(тик)
    })
  const постер = await засечь(() => {
    const el = document.querySelector('[class*="Zamok_final"]')
    return el && getComputedStyle(el).visibility === 'visible' && +getComputedStyle(el).opacity > 0.9
  })
  const кнопкаНачало = await засечь(() => {
    const a = document.querySelector('[class*="Zamok_final"] a.pill')
    return a && +getComputedStyle(a).opacity > 0.02
  })
  const кнопкаПолностью = await засечь(() => {
    const a = document.querySelector('[class*="Zamok_final"] a.pill')
    return a && +getComputedStyle(a).opacity > 0.98
  })
  return { постер, кнопкаНачало, кнопкаПолностью }
})

console.log('от ввода верного кода:')
console.log(`  постер показался           ${вехи.постер} мс`)
console.log(`  кнопка начала проявляться  ${вехи.кнопкаНачало} мс`)
console.log(`  кнопка видна полностью     ${вехи.кнопкаПолностью} мс`)
const ок = вехи.кнопкаПолностью >= 1500 && вехи.кнопкаПолностью <= 3000
console.log(ок ? '\nпримерно на второй секунде — как просили' : '\n✗ мимо второй секунды')

await b.close()
srv.close()
process.exit(ок ? 0 : 1)
