/**
 * Полная проверка сайта: консоль, переходы, вёрстка, доступность.
 *
 * Всё кликами в настоящем браузере, а не чтением исходников: element.click()
 * пробивает перекрытия, поэтому переходы жмём мышью по координатам — так
 * видно, если сверху что-то лежит.
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
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.svg': 'image/svg+xml',
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
await new Promise((r) => srv.listen(4743, r))
const o = `http://127.0.0.1:4743${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

const МАРШРУТЫ = ['/', '/programma/', '/gosti/', '/mesto/', '/zapis/', '/fonts/']
const находки = []
const беда = (важность, текст) => находки.push({ важность, текст })

/* ------------------------------------------------------------- консоль */
console.log('── консоль браузера ──')
for (const [tag, viewport, моб] of [
  ['десктоп', { width: 1920, height: 1080 }, false],
  ['телефон', { width: 390, height: 844 }, true],
]) {
  for (const маршрут of МАРШРУТЫ) {
    const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
    const p = await c.newPage()
    const шум = []
    p.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') шум.push(`${m.type()}: ${m.text()}`)
    })
    p.on('pageerror', (e) => шум.push(`pageerror: ${e.message}`))
    p.on('requestfailed', (r) => шум.push(`запрос не прошёл: ${r.url().split('/').pop()}`))

    await p.goto(o + маршрут, { waitUntil: 'networkidle' })
    await p.waitForTimeout(2200)
    // прокрутить: часть предупреждений всплывает только на скролле
    await p.evaluate(async () => {
      const предел = document.documentElement.scrollHeight - innerHeight
      for (let i = 0; i < 60; i++) {
        scrollTo(0, Math.min(scrollY + 300, предел))
        dispatchEvent(new WheelEvent('wheel', { deltaY: 300 }))
        await new Promise((r) => setTimeout(r, 30))
      }
    })
    await p.waitForTimeout(900)

    if (шум.length) {
      console.log(`  ${tag} ${маршрут}`)
      ;[...new Set(шум)].forEach((x) => {
        console.log(`     ${x}`)
        беда('высокая', `консоль ${tag} ${маршрут}: ${x}`)
      })
    }
    await c.close()
  }
}
console.log('  проверено 12 загрузок')

/* ------------------------------------------------------------- переходы */
console.log('\n── переходы, настоящими кликами ──')
{
  const пары = [
    ['/', 'ПРОГРАММА', '/programma/'],
    ['/programma/', 'ВХОД', '/gosti/'],
    ['/gosti/', 'МЕСТО', '/mesto/'],
    ['/mesto/', 'ЗАМОК', '/zapis/'],
  ]
  for (const [откуда, подпись, куда] of пары) {
    const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
    const p = await c.newPage()
    await p.goto(o + откуда, { waitUntil: 'networkidle' })
    await p.waitForTimeout(2400)
    const ссылка = p.locator(`a:has-text("${подпись}")`).first()
    const box = await ссылка.boundingBox()
    if (!box) {
      беда('высокая', `переход ${откуда} → ${куда}: ссылки «${подпись}» не видно`)
      await c.close()
      continue
    }
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await p.waitForTimeout(2600)
    const адрес = await p.evaluate(() => location.pathname)
    const ок = адрес === BASE + куда
    console.log(`  ${откуда.padEnd(13)} «${подпись}» → ${адрес}  ${ок ? '✓' : '✗'}`)
    if (!ок) беда('высокая', `переход ${откуда} → ${куда} привёл на ${адрес}`)
    await c.close()
  }

  // возврат на главную из шапки
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/programma/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2400)
  const назад = p.locator('a:has-text("ВАЛЬМОНТ")').first()
  const bb = await назад.boundingBox()
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await p.waitForTimeout(2600)
  const дом = await p.evaluate(() => location.pathname)
  console.log(`  /programma/   «ВАЛЬМОНТ» → ${дом}  ${дом === BASE + '/' ? '✓' : '✗'}`)
  if (дом !== BASE + '/') беда('высокая', `возврат на главную привёл на ${дом}`)
  await c.close()
}

/* --------------------------------------------------------------- вёрстка */
console.log('\n── вёрстка ──')
for (const [tag, viewport, моб] of [
  ['1920×1080', { width: 1920, height: 1080 }, false],
  ['2560×1440', { width: 2560, height: 1440 }, false],
  ['390×844', { width: 390, height: 844 }, true],
]) {
  for (const маршрут of МАРШРУТЫ) {
    const c = await b.newContext({ viewport, isMobile: моб, hasTouch: моб })
    const p = await c.newPage()
    await p.goto(o + маршрут, { waitUntil: 'networkidle' })
    await p.waitForTimeout(2200)

    const r = await p.evaluate(() => {
      const вылезли = []
      document.querySelectorAll('body *').forEach((el) => {
        const cs = getComputedStyle(el)
        if (cs.position === 'fixed' || cs.visibility === 'hidden' || +cs.opacity === 0) return
        const b = el.getBoundingClientRect()
        if (b.width === 0 || b.height === 0) return
        // считаем только то, что реально торчит за правый край документа
        if (b.right > document.documentElement.clientWidth + 1.5 && cs.overflow !== 'hidden') {
          const род = el.parentElement
          if (род && getComputedStyle(род).overflow === 'hidden') return
          вылезли.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 30)} → ${Math.round(b.right)}`)
        }
      })
      return {
        прокрутка: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ширина: document.documentElement.scrollWidth,
        экран: document.documentElement.clientWidth,
        вылезли: [...new Set(вылезли)].slice(0, 4),
      }
    })
    const метка = r.прокрутка ? `✗ горизонтальная прокрутка ${r.ширина} > ${r.экран}` : '✓'
    console.log(`  ${tag.padEnd(11)} ${маршрут.padEnd(13)} ${метка}`)
    if (r.прокрутка) {
      беда('высокая', `${tag} ${маршрут}: горизонтальная прокрутка ${r.ширина} при экране ${r.экран}`)
      r.вылезли.forEach((x) => console.log(`       ${x}`))
    }
    await c.close()
  }
}

/* ------------------------------------------------- клавиатура на замке */
console.log('\n── клавиатура на замке ──')
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)

  // Tab доходит до первого поля и идёт по всем четырём
  await p.keyboard.press('Tab')
  const путь = []
  for (let i = 0; i < 12; i++) {
    const где = await p.evaluate(() => {
      const a = document.activeElement
      return a.tagName === 'INPUT' ? a.getAttribute('aria-label') : a.tagName
    })
    путь.push(где)
    if (путь.filter((x) => (x || '').startsWith('Цифра')).length === 4) break
    await p.keyboard.press('Tab')
  }
  const полей = путь.filter((x) => (x || '').startsWith('Цифра')).length
  console.log(`  Tab прошёл по ${полей} полям из 4`)
  if (полей !== 4) беда('высокая', `на замке Tab доходит только до ${полей} полей`)

  // видимый фокус
  await p.evaluate(() => document.querySelector('input').focus())
  await p.waitForTimeout(600) // подчёркивание переезжает за 0.4 с
  const фокус = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('input'))
    return { рамка: cs.borderBottomColor, контур: cs.outlineStyle }
  })
  console.log(`  фокус: подчёркивание ${фокус.рамка}, контур ${фокус.контур}`)
  if (фокус.рамка !== 'rgb(255, 255, 255)') беда('средняя', `фокус на поле незаметен: ${фокус.рамка}`)

  // с клавиатуры контур обязан быть: подчёркивания одного мало
  await p.evaluate(() => document.activeElement.blur())
  await p.keyboard.press('Tab')
  await p.waitForTimeout(200)
  const скл = await p.evaluate(() => {
    const a = document.activeElement
    return { поле: a.tagName === 'INPUT', контур: getComputedStyle(a).outlineStyle }
  })
  console.log(`  с клавиатуры: контур ${скл.контур}`)
  if (скл.поле && скл.контур === 'none') беда('средняя', 'с клавиатуры фокус на поле не обведён')

  // Enter проверяет код целиком
  await p.evaluate(() => document.querySelector('input').focus())
  await p.keyboard.type('184')
  await p.keyboard.press('Enter')
  await p.waitForTimeout(400)
  const неполный = await p.evaluate(() =>
    [...document.querySelectorAll('input')].map((i) => i.value).join(''),
  )
  console.log(`  Enter на неполном коде: поля «${неполный}» (не должны очиститься)`)
  if (неполный !== '184') беда('средняя', `Enter на неполном коде сбросил поля: «${неполный}»`)
  await c.close()
}

/* ------------------------------------------ prefers-reduced-motion везде */
console.log('\n── бережный режим ──')
for (const маршрут of МАРШРУТЫ) {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' })
  const p = await c.newPage()
  const шум = []
  p.on('pageerror', (e) => шум.push(e.message))
  await p.goto(o + маршрут, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800)
  const r = await p.evaluate(() => {
    // ничего не должно остаться невидимым: контент обязан быть на экране
    // строка отказа на замке скрыта по замыслу — она ждёт неверного кода
    const ждут = ['Не сегодня']
    const прячется = [...document.querySelectorAll('h1, h2, p, [data-letters], [data-reveal], [data-reveal-fade]')]
      .filter((el) => !ждут.includes((el.textContent || '').trim()))
      .filter((el) => {
        const cs = getComputedStyle(el)
        return cs.visibility === 'hidden' || +cs.opacity < 0.05
      })
      .map((el) => `${el.tagName}: ${(el.textContent || '').trim().slice(0, 24)}`)
    return { прячется: [...new Set(прячется)].slice(0, 5) }
  })
  const ок = !r.прячется.length && !шум.length
  console.log(`  ${маршрут.padEnd(13)} ${ок ? '✓' : '✗ ' + JSON.stringify(r.прячется) + шум.join(';')}`)
  if (r.прячется.length) беда('высокая', `бережный режим ${маршрут}: скрыт контент — ${r.прячется.join(', ')}`)
  if (шум.length) беда('высокая', `бережный режим ${маршрут}: ошибка ${шум[0]}`)
  await c.close()
}

await b.close()
srv.close()

console.log('\n════════════ НАЙДЕНО ════════════')
if (!находки.length) console.log('чисто')
else находки.forEach((f) => console.log(` [${f.важность}] ${f.текст}`))
process.exit(находки.length ? 1 : 0)
