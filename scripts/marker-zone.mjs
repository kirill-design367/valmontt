/**
 * Где маркеру стоять нельзя.
 *
 * Считаем фактическую геометрию обвязки кадра (шапка, вертикальная подпись
 * «КАДР ПЕРВЫЙ», нижний блок с названием, счётчик прогресса) и переводим её
 * из координат экрана в координаты СНИМКА — через тот же прямоугольник cover,
 * в котором живёт маркер. На выходе — безопасная рамка в долях снимка,
 * общая для всех рабочих разрешений.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
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
await new Promise((r) => srv.listen(4733, r))
const o = `http://127.0.0.1:4733${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const ВИДЫ = [
  ['1920×1080', { width: 1920, height: 1080 }, false],
  ['2560×1440', { width: 2560, height: 1440 }, false],
  ['1440×900', { width: 1440, height: 900 }, false],
  ['390×844', { width: 390, height: 844 }, true],
  ['430×932', { width: 430, height: 932 }, true],
]

const сводка = { wide: [], tall: [] }

for (const [имя, viewport, моб] of ВИДЫ) {
  const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
  const p = await c.newPage()
  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)

  const данные = await p.evaluate(() => {
    const рамка = document.querySelector('section')
    const сцена = рамка.querySelector('[class*="stage"]')
    const rР = рамка.getBoundingClientRect()
    const rС = сцена.getBoundingClientRect()

    // всё, что не должно попасть под маркер
    const занято = []
    const добавить = (el, тег) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      занято.push({ тег, x: r.left, y: r.top, w: r.width, h: r.height })
    }
    добавить(document.querySelector('[class*="PageShell_bar"]'), 'шапка')
    добавить(рамка.querySelector('[class*="capIndex"]'), 'номер кадра')
    добавить(рамка.querySelector('[class*="cap"]:not([class*="capIndex"])'), 'подпись')
    добавить(document.querySelector('[class*="QuestProgress_progress"]'), 'счётчик')
    добавить(document.querySelector('[class*="hint"]'), 'подсказка')

    // из экранных координат — в доли СНИМКА
    const вСнимок = (r) => ({
      x0: (r.x - rС.left) / rС.width,
      y0: (r.y - rС.top) / rС.height,
      x1: (r.x + r.w - rС.left) / rС.width,
      y1: (r.y + r.h - rС.top) / rС.height,
    })

    return {
      сцена: { w: Math.round(rС.width), h: Math.round(rС.height) },
      рамка: { w: Math.round(rР.width), h: Math.round(rР.height) },
      занято: занято.map((z) => ({ тег: z.тег, ...вСнимок(z) })),
    }
  })

  const ключ = моб ? 'tall' : 'wide'
  сводка[ключ].push({ имя, ...данные })
  console.log(`\n${имя}  снимок ${данные.сцена.w}×${данные.сцена.h} в рамке ${данные.рамка.w}×${данные.рамка.h}`)
  данные.занято.forEach((z) =>
    console.log(
      `   ${z.тег.padEnd(12)} x ${z.x0.toFixed(3)}…${z.x1.toFixed(3)}   y ${z.y0.toFixed(3)}…${z.y1.toFixed(3)}`,
    ),
  )
  await c.close()
}

/* Безопасная рамка: то, что свободно на ВСЕХ разрешениях сразу. Маркер —
   круг 64 px, берём запас 0.5 диаметра от каждой занятой области. */
for (const ключ of ['wide', 'tall']) {
  const зоны = сводка[ключ]
  // минимальная видимая часть снимка по всем видам
  const видX0 = Math.max(...зоны.map((z) => Math.max(0, -0 + (0 - 0))), 0)
  let верх = 0
  let низ = 1
  let лево = 0
  зоны.forEach((z) => {
    z.занято.forEach((o) => {
      // шапка и номер кадра прижаты к верху — двигают нижнюю границу «верх»
      if (o.тег === 'шапка' || o.тег === 'номер кадра') верх = Math.max(верх, o.y1)
      if (o.тег === 'подпись' || o.тег === 'счётчик' || o.тег === 'подсказка') низ = Math.min(низ, o.y0)
      if (o.тег === 'номер кадра') лево = Math.max(лево, o.x1)
    })
    // видимая часть снимка: то, что не срезал cover
    const срезX = (1 - Math.min(1, z.рамка.w / z.сцена.w)) / 2
    const срезY = (1 - Math.min(1, z.рамка.h / z.сцена.h)) / 2
    z.срез = { x: +срезX.toFixed(3), y: +срезY.toFixed(3) }
  })
  const срезX = Math.max(...зоны.map((z) => z.срез.x))
  const срезY = Math.max(...зоны.map((z) => z.срез.y))
  const поле = ключ === 'tall' ? 64 / 844 : 64 / 1080
  console.log(
    `\n${ключ}: срез cover x±${срезX} y±${срезY} | шапка до y ${верх.toFixed(3)} | подпись от y ${низ.toFixed(3)} | номер кадра до x ${лево.toFixed(3)}`,
  )
  console.log(
    `${ключ} безопасно: x ${(Math.max(срезX, лево) + поле).toFixed(3)}…${(1 - срезX - поле).toFixed(3)}  y ${(Math.max(срезY, верх) + поле).toFixed(3)}…${(низ - поле).toFixed(3)}`,
  )
}

await b.close()
srv.close()
