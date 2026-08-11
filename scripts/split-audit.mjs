/**
 * Сколько символов было в блоке и сколько осталось после разбиения.
 *
 * Считаем три числа на каждый блок со сборкой:
 *   исходник — что стоит в разметке до разбиения (берём из собранного HTML),
 *   в дереве — что лежит в DOM после разбиения,
 *   видимых  — сколько литер реально нарисуется (не hidden, не прозрачные).
 *
 * Отдельно ищем вложенные разбиения: спан-литера внутри спана-литеры. Это
 * след повторного вызова SplitText по уже разбитому тексту.
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
await new Promise((r) => srv.listen(4759, r))
const o = `http://127.0.0.1:4759${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const МАРШРУТЫ = ['/', '/programma/', '/gosti/', '/mesto/', '/zapis/', '/fonts/']
const беда = []

/** Что стоит в SSR-разметке до всякого JS — эталон. */
const эталон = (файл) => {
  const html = fs.readFileSync(path.join(ROOT, файл), 'utf8')
  return [...html.matchAll(/data-letters[^>]*>([\s\S]*?)<\/span>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  )
}

for (const [tag, viewport, моб] of [
  ['1920×1080', { width: 1920, height: 1080 }, false],
  ['390×844', { width: 390, height: 844 }, true],
]) {
  console.log(`\n════════ ${tag} ════════`)
  for (const маршрут of МАРШРУТЫ) {
    const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
    const p = await c.newPage()
    await p.goto(o + маршрут, { waitUntil: 'networkidle' })
    await p.waitForTimeout(2600)

    /* Каждый блок меряем в ЕГО момент, а не на дне документа.
       Финальный блок главной по замыслу схлопывается, когда его
       пролистали, — на дне он невидим законно. Поэтому проходим шкалу
       прокрутки шагами и для каждого блока запоминаем лучший кадр:
       сколько литер он показал максимум за весь проход. */
    const блоки = await p.evaluate(async () => {
      const цели = [...document.querySelectorAll('[data-letters]')]
      const лучшее = цели.map((el) => ({
        текст: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        вДереве: '',
        видимо: '',
        вложенных: 0,
      }))

      const замер = () => {
        цели.forEach((el, k) => {
          const литеры = [...el.querySelectorAll('*')].filter(
            (n) => n.children.length === 0 && (n.textContent || '').trim() !== '',
          )
          const видимых = литеры.filter((n) => {
            const cs = getComputedStyle(n)
            return cs.visibility !== 'hidden' && +cs.opacity > 0.05 && cs.display !== 'none'
          })
          const видимо = видимых.map((n) => n.textContent).join('').replace(/\s+/g, '')
          if (видимо.length > лучшее[k].видимо.length) лучшее[k].видимо = видимо
          const вДереве = литеры.map((n) => n.textContent).join('').replace(/\s+/g, '')
          if (вДереве.length > лучшее[k].вДереве.length) лучшее[k].вДереве = вДереве
          лучшее[k].вложенных = Math.max(
            лучшее[k].вложенных,
            литеры.filter(
              (n) => n.parentElement && /char/i.test(n.parentElement.className || ''),
            ).length,
          )
        })
      }

      const предел = () => document.documentElement.scrollHeight - innerHeight
      замер()
      for (let i = 0; i < 300; i++) {
        scrollTo(0, Math.min(scrollY + 120, предел()))
        dispatchEvent(new WheelEvent('wheel', { deltaY: 120 }))
        await new Promise((r) => setTimeout(r, 30))
        замер()
        if (scrollY >= предел() - 1) break
      }
      await new Promise((r) => setTimeout(r, 1200))
      замер()
      return лучшее
    })

    const эт = эталон(маршрут === '/' ? 'index.html' : маршрут.slice(1) + 'index.html')
    console.log(`\n${маршрут}  блоков ${блоки.length}`)
    блоки.forEach((б, i) => {
      const ждали = (эт[i] ?? б.текст).replace(/\s+/g, '')
      const ок = б.видимо === ждали
      console.log(
        `   ${ок ? '✓' : '✗'} «${(эт[i] ?? б.текст).slice(0, 26)}» ` +
          `эталон ${ждали.length} / в дереве ${б.вДереве.length} / видимо ${б.видимо.length}` +
          (ок ? '' : `  → видно «${б.видимо}»`),
      )
      if (!ок) {
        беда.push(`${tag} ${маршрут} блок ${i + 1}: ждали «${ждали}», видно «${б.видимо}»`)
      }
      if (б.вложенных) беда.push(`${tag} ${маршрут} блок ${i + 1}: вложенных разбиений ${б.вложенных}`)
    })
    await c.close()
  }
}

/* ═══════════ прыжок при первом скролле ═══════════ */
console.log('\n════════ прыжок при первом движении скролла ════════')
for (const маршрут of ['/programma/', '/gosti/', '/']) {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + маршрут, { waitUntil: 'networkidle' })
  await p.waitForTimeout(3000)

  const до = await p.screenshot()
  // ровно один пиксель
  await p.evaluate(() => {
    scrollTo(0, 1)
    dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))
  })
  await p.waitForTimeout(1200)
  const после = await p.screenshot()

  const имя = маршрут === '/' ? 'glavnaya' : маршрут.replace(/\//g, '')
  fs.writeFileSync(`shots/v13-${имя}-0px.png`, до)
  fs.writeFileSync(`shots/v13-${имя}-1px.png`, после)

  // насколько кадры разные: доля различающихся пикселей
  const разница = await p.evaluate(
    async ([a, b]) => {
      const грузить = (d) =>
        new Promise((r) => {
          const i = new Image()
          i.onload = () => r(i)
          i.src = 'data:image/png;base64,' + d
        })
      const [ia, ib] = await Promise.all([грузить(a), грузить(b)])
      const cv = document.createElement('canvas')
      cv.width = ia.width
      cv.height = ia.height
      const cx = cv.getContext('2d', { willReadFrequently: true })
      cx.drawImage(ia, 0, 0)
      const da = cx.getImageData(0, 0, cv.width, cv.height).data
      cx.clearRect(0, 0, cv.width, cv.height)
      cx.drawImage(ib, 0, 0)
      const db = cx.getImageData(0, 0, cv.width, cv.height).data
      let разных = 0
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - db[i]) > 12 || Math.abs(da[i + 1] - db[i + 1]) > 12) разных++
      }
      return +((разных / (da.length / 4)) * 100).toFixed(2)
    },
    [до.toString('base64'), после.toString('base64')],
  )
  const ок = разница < 2
  console.log(`  ${маршрут.padEnd(13)} различие кадров ${разница} %  ${ок ? '✓' : '✗ перестроение блока'}`)
  if (!ок) беда.push(`${маршрут}: при сдвиге на 1 px кадр изменился на ${разница} %`)
  await c.close()
}

await b.close()
srv.close()
console.log('\n════════════ ИТОГ ════════════')
if (беда.length) {
  беда.forEach((x) => console.log(' •', x))
  process.exit(1)
}
console.log('ни одного потерянного символа')
