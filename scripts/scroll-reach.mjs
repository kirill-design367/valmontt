/**
 * Доигрывают ли анимации до конца — проверка делом, а не расчётом.
 *
 * Прокручиваем страницу до самого дна и смотрим на КАЖДУЮ литеру каждого
 * блока со сборкой: стоит ли она на своём месте (transform единичный) и
 * видна ли (opacity 1). Если хоть одна литера осталась сдвинутой или
 * прозрачной — блок не дособрался.
 *
 * Затем прокручиваем обратно наверх и проверяем, что scrub-блоки разлетелись
 * назад: анимация обязана работать в обе стороны.
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
await new Promise((r) => srv.listen(4741, r))
const o = `http://127.0.0.1:4741${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const МАРШРУТЫ = ['/', '/programma/', '/gosti/', '/mesto/', '/zapis/']
const беда = []

/** Долистать до дна маленькими шагами, чтобы Lenis и scrub успевали. */
const доДна = async (p) => {
  await p.evaluate(async () => {
    const предел = () => document.documentElement.scrollHeight - innerHeight
    for (let i = 0; i < 400; i++) {
      const было = scrollY
      scrollTo(0, Math.min(scrollY + 140, предел()))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 140 }))
      await new Promise((r) => setTimeout(r, 22))
      if (scrollY >= предел() - 1 && было === scrollY) break
    }
    // дать scrub догнать: он идёт с задержкой 0.5 с
    scrollTo(0, предел())
    await new Promise((r) => setTimeout(r, 1600))
  })
}

const состояние = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll('[data-letters]')].map((el) => {
      const литеры = [...el.querySelectorAll('*')].filter((n) => !n.children.length)
      let сдвинутых = 0
      let бледных = 0
      let макс = 0
      литеры.forEach((n) => {
        const cs = getComputedStyle(n)
        const t = cs.transform
        if (t && t !== 'none') {
          const m = new DOMMatrixReadOnly(t)
          const д = Math.hypot(m.m41, m.m42)
          макс = Math.max(макс, д)
          if (д > 1.5) сдвинутых++
        }
        if (+cs.opacity < 0.92) бледных++
      })
      return {
        что: (el.textContent || '').trim().slice(0, 26),
        литер: литеры.length,
        сдвинутых,
        бледных,
        макс: Math.round(макс),
      }
    }),
  )

for (const [tag, viewport, моб] of [
  ['1920×1080', { width: 1920, height: 1080 }, false],
  ['2560×1440', { width: 2560, height: 1440 }, false],
  ['390×844', { width: 390, height: 844 }, true],
]) {
  console.log(`\n──────────── ${tag} ────────────`)
  for (const маршрут of МАРШРУТЫ) {
    const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
    const p = await c.newPage()
    await p.goto(o + маршрут, { waitUntil: 'networkidle' })
    await p.waitForTimeout(2600)

    await доДна(p)
    const внизу = await состояние(p)
    if (!внизу.length) {
      console.log(`${маршрут.padEnd(13)} блоков со сборкой нет`)
      await c.close()
      continue
    }

    const плохие = внизу.filter((с) => с.сдвинутых > 0 || с.бледных > 0)
    console.log(
      `${маршрут.padEnd(13)} блоков ${внизу.length}, дособралось ${внизу.length - плохие.length}`,
    )
    плохие.forEach((с) => {
      console.log(`   ✗ «${с.что}» — ${с.сдвинутых}/${с.литер} литер сдвинуто (до ${с.макс} px), ${с.бледных} прозрачных`)
      беда.push(`${tag} ${маршрут} «${с.что}» не дособрался`)
    })

    /* Обратный ход. Осмысленно только там, где scrub вообще применён: если
       документ короче одного окна, сборка идёт по времени и назад не едет —
       прокручивать там нечего. */
    const scrub = await p.evaluate(() => {
      const предел = document.documentElement.scrollHeight - innerHeight
      return предел >= (0.88 - 0.42) * innerHeight
    })
    if (scrub) {
      await p.evaluate(async () => {
        for (let i = 0; i < 400 && scrollY > 0; i++) {
          scrollTo(0, Math.max(0, scrollY - 140))
          dispatchEvent(new WheelEvent('wheel', { deltaY: -140 }))
          await new Promise((r) => setTimeout(r, 22))
        }
        scrollTo(0, 0)
        await new Promise((r) => setTimeout(r, 1600))
      })
      const наверху = await состояние(p)
      // хотя бы один блок обязан снова разлететься, иначе scrub не отматывается
      const разлетелось = наверху.filter((с) => с.сдвинутых > 0 || с.бледных > 0).length
      console.log(`              назад: разлетелось снова ${разлетелось} из ${наверху.length}`)
      if (!разлетелось) беда.push(`${tag} ${маршрут} — сборка не отматывается назад`)
    }
    await c.close()
  }
}

await b.close()
srv.close()
console.log('\n════════════ ИТОГ ════════════')
if (беда.length) {
  беда.forEach((x) => console.log(' •', x))
  process.exit(1)
}
console.log('все сборки доходят до конца')
