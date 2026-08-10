/**
 * Четыре кадра локации с маркерами — по одному снимку на кадр, десктоп и
 * телефон. Маркеры к моменту съёмки уже найдены: показываем то состояние,
 * ради которого всё делалось.
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
  '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2',
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
await new Promise((r) => srv.listen(4739, r))
const o = `http://127.0.0.1:4739${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const ИМЕНА = ['doroga', 'vorota', 'zal', 'terrasa']

for (const [tag, viewport, моб] of [
  ['desktop', { width: 1920, height: 1080 }, false],
  ['mobile', { width: 390, height: 844 }, true],
]) {
  const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
  const p = await c.newPage()
  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)

  // раскрываем все четыре: кадр должен показать найденное состояние
  await p.evaluate(() => {
    document.querySelectorAll('[data-marker]').forEach((el) => {
      el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }))
    })
  })
  await p.waitForTimeout(700)
  // курсор ушёл — остаётся то, что видит гость после находки
  await p.evaluate(() => {
    document.querySelectorAll('[data-marker]').forEach((el) => {
      el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }))
      el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }))
    })
  })
  await p.waitForTimeout(600)

  for (let i = 0; i < 4; i++) {
    const рамка = (await p.$$('section'))[i]
    await рамка.screenshot({ path: path.join(OUT, `v11-kadr-${i + 1}-${ИМЕНА[i]}-${tag}.png`) })
  }
  console.log(`${tag}: четыре кадра сняты`)
  await c.close()
}

await b.close()
srv.close()
