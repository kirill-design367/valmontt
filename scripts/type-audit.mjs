/**
 * Аудит типографики по всем страницам.
 *
 * Обходит каждый элемент с собственным текстом, снимает вычисленные кегль,
 * трекинг и межстрочный — и сводит в таблицу. Плюс проверяет вертикальный
 * ритм: отступы между блоками должны быть кратны 8 px.
 *
 * Внутренние отступы контролов (пилюли, кнопки, поля) в ритм не входят —
 * их высоту задаёт кегль, а не сетка.
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
await new Promise((r) => srv.listen(4610, r))
const o = `http://127.0.0.1:4610${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const PAGES = ['/', '/programma/', '/gosti/', '/mesto/', '/zapis/']
const кегли = new Map()
const трекинги = new Map()
const межстрочные = new Map()
const ритм = []

const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
for (const route of PAGES) {
  const p = await c.newPage()
  await p.goto(o + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(route === '/' ? 3400 : 1600)

  const found = await p.evaluate(() => {
    const кегли = {}, трекинги = {}, межстрочные = {}, ритм = []
    const имя = (el) =>
      el.tagName.toLowerCase() +
      (el.className && typeof el.className === 'string'
        ? '.' + el.className.split(/\s+/)[0].replace(/__.*$/, '')
        : '')

    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue

      // Собственный текст: узел, у которого есть непустой текстовый ребёнок
      const свой = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (свой) {
        const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10
        // трекинг сводим в em: один и тот же токен в пикселях выглядит
        // разным на каждой ступени и раздувает таблицу на пустом месте
        const lsPx = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing)
        const ls = (Math.round((lsPx / parseFloat(cs.fontSize)) * 1000) / 1000) + 'em'
        const lh = cs.lineHeight === 'normal'
          ? 'normal'
          : (Math.round((parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)) * 100) / 100).toFixed(2)
        ;(кегли[fs] ||= []).push(имя(el))
        ;(трекинги[ls] ||= []).push(имя(el))
        ;(межстрочные[lh] ||= []).push(имя(el))
      }

      // Вертикальный ритм: только межблочные отступы
      const контрол = /^(button|input|a|svg|li)$/.test(el.tagName.toLowerCase())
      if (!контрол) {
        for (const [prop, v] of [
          ['margin-top', cs.marginTop],
          ['margin-bottom', cs.marginBottom],
          ['row-gap', cs.rowGap],
        ]) {
          const px = parseFloat(v)
          if (!px || Number.isNaN(px) || px < 0) continue
          if (Math.abs(px % 8) > 0.6 && Math.abs((px % 8) - 8) > 0.6) {
            ритм.push(`${имя(el)} ${prop} ${px}px`)
          }
        }
      }
    }
    return { кегли, трекинги, межстрочные, ритм }
  })

  for (const [ключ, карта] of [['кегли', кегли], ['трекинги', трекинги], ['межстрочные', межстрочные]]) {
    for (const [k, v] of Object.entries(found[ключ])) {
      const набор = карта.get(k) ?? new Set()
      v.forEach((x) => набор.add(x))
      карта.set(k, набор)
    }
  }
  found.ритм.forEach((x) => ритм.push(`${route} ${x}`))
  await p.close()
}
await c.close()

const печать = (заголовок, карта, порядок) => {
  console.log(`\n${заголовок}`)
  const строки = [...карта.entries()].sort((a, b) => порядок(a[0]) - порядок(b[0]))
  for (const [k, v] of строки) {
    console.log(`  ${String(k).padStart(8)}  ${[...v].sort().join(', ')}`)
  }
  console.log(`  ВСЕГО РАЗНЫХ: ${строки.length}`)
}

печать('КЕГЛИ (1920×1080)', кегли, (x) => -parseFloat(x))
печать('ТРЕКИНГИ', трекинги, (x) => parseFloat(x))
печать('МЕЖСТРОЧНЫЕ', межстрочные, (x) => parseFloat(x) || 99)

console.log(`\nВЕРТИКАЛЬНЫЙ РИТМ: отступов не кратных 8 px — ${[...new Set(ритм)].length}`)
;[...new Set(ритм)].forEach((x) => console.log('  •', x))

await b.close()
srv.close()
