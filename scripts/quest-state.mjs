/**
 * Четыре сценария хранения прогресса — прокликом в настоящем браузере.
 *
 * Нигде не подставляем фокус руками и не дёргаем элементы через
 * element.click(): кликаем мышью по координатам и печатаем с клавиатуры,
 * как человек. Иначе тест сам чинит то, что должен ловить, — ровно на этом
 * прошлый прогон и пропустил мёртвый замок после неверного кода.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const T = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain',
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
await new Promise((r) => srv.listen(4751, r))
const o = `http://127.0.0.1:4751${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

const открыть = async () => {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  p.on('pageerror', (e) => bad.push(`ошибка страницы: ${e.message}`))
  // считаем полные загрузки документа: их должно быть ровно столько,
  // сколько мы сделали goto/reload, и ни одной лишней
  p.__загрузок = 0
  p.on('load', () => { p.__загрузок++ })
  return { c, p }
}

/** Набрать код как человек: кликнуть в первое поле и печатать. */
const набрать = async (p, код) => {
  await p.locator('input').first().click()
  await p.keyboard.type(код, { delay: 80 })
}

const пустило = (p) => p.evaluate(() => document.body.innerText.includes('03:47'))

const хранилища = (p) =>
  p.evaluate(() => ({
    session: Object.keys(sessionStorage).length,
    local: Object.keys(localStorage).length,
    cookie: document.cookie.length,
  }))

/* Найти цифры, кликая по маркерам на /mesto.
   На десктопе лента едет вбок: третий и четвёртый маркеры за краем экрана,
   пока до них не докрутишь. Поэтому перед каждым кликом подвозим ленту,
   пока маркер не окажется в кадре. */
const найтиЦифры = async (p, сколько) => {
  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)

  for (let i = 0; i < сколько; i++) {
    const маркеры = await p.$$('[data-marker]')
    let r = await маркеры[i].boundingBox()

    for (let шаг = 0; шаг < 60; шаг++) {
      const вКадре =
        r && r.x >= 0 && r.x + r.width <= 1920 && r.y >= 0 && r.y + r.height <= 1080
      if (вКадре) break
      await p.evaluate(() => {
        const предел = document.documentElement.scrollHeight - innerHeight
        scrollTo(0, Math.min(scrollY + 220, предел))
        dispatchEvent(new WheelEvent('wheel', { deltaY: 220 }))
      })
      await p.waitForTimeout(140)
      r = await маркеры[i].boundingBox()
    }
    if (!r) continue
    await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
    await p.waitForTimeout(320)
  }
  await p.waitForTimeout(500)
}

const счётчик = (p) =>
  p.evaluate(() => {
    const box = document.querySelector('[class*="QuestProgress_progress"]')
    if (!box) return { есть: false, залито: 0 }
    return {
      есть: true,
      видим: getComputedStyle(box).visibility !== 'hidden' && +getComputedStyle(box).opacity > 0.3,
      залито: [...box.children].filter((d) =>
        getComputedStyle(d).backgroundColor.includes('200, 30, 90'),
      ).length,
    }
  })

const маркерыБелые = (p) =>
  p.evaluate(() =>
    [...document.querySelectorAll('[data-marker] [data-ring]')].every(
      (k) => !getComputedStyle(k).borderColor.includes('200, 30, 90'),
    ),
  )

/* ═════════ 1. прошёл квест → перезагрузил → ввёл 1847 → пустило ═════════ */
{
  const { c, p } = await открыть()
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await набрать(p, '1847')
  await p.waitForTimeout(4000)
  const первый = await пустило(p)

  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  const сразуПослеF5 = await пустило(p)
  const полейПослеF5 = await p.evaluate(() => document.querySelectorAll('input').length)

  await набрать(p, '1847')
  await p.waitForTimeout(4000)
  const второй = await пустило(p)

  console.log('1. прошёл → F5 → 1847')
  console.log(`   первый проход пустил: ${первый}`)
  console.log(`   сразу после F5 постер показан: ${сразуПослеF5} (должно быть false)`)
  console.log(`   полей на замке после F5: ${полейПослеF5}`)
  console.log(`   повторный ввод пустил: ${второй}`)
  if (!первый) bad.push('1: первый проход не пустил')
  if (сразуПослеF5) bad.push('1: после перезагрузки постер показан сам — прогресс пережил F5')
  if (полейПослеF5 !== 4) bad.push(`1: после F5 полей ${полейПослеF5} вместо 4`)
  if (!второй) bad.push('1: после перезагрузки код не пустил')
  await c.close()
}

/* ═════ 2. прошёл квест → перезагрузил → маркеры белые, счётчик пуст ═════ */
{
  const { c, p } = await открыть()
  await найтиЦифры(p, 4)
  const доF5 = await счётчик(p)
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await набрать(p, '1847')
  await p.waitForTimeout(4000)

  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(2600)
  const белые = await маркерыБелые(p)
  const послеF5 = await счётчик(p)

  console.log('\n2. прошёл → F5 → маркеры и счётчик')
  console.log(`   до перезагрузки залито кружков: ${доF5.залито}`)
  console.log(`   после F5 маркеры белые: ${белые}`)
  console.log(`   после F5 залито кружков: ${послеF5.залито}, счётчик виден: ${послеF5.видим}`)
  if (доF5.залито !== 4) bad.push(`2: до F5 залито ${доF5.залито} кружков вместо 4`)
  if (!белые) bad.push('2: после перезагрузки маркеры остались малиновыми')
  if (послеF5.залито !== 0) bad.push(`2: после перезагрузки залито ${послеF5.залито} кружков`)
  if (послеF5.видим) bad.push('2: после перезагрузки счётчик виден, хотя ничего не найдено')
  await c.close()
}

/* ═══ 3. две цифры → переход на другую страницу → обратно → всё на месте ═══ */
{
  const { c, p } = await открыть()
  await найтиЦифры(p, 2)
  const до = await счётчик(p)

  // уходим по ссылке в шапке и возвращаемся — это SPA, без перезагрузки
  const прог = p.locator('a:has-text("ПРОГРАММА")').first()
  const r1 = await прог.boundingBox()
  await p.mouse.click(r1.x + r1.width / 2, r1.y + r1.height / 2)
  const загрузокДо = p.__загрузок
  await p.waitForTimeout(3200)
  const где = await p.evaluate(() => location.pathname)
  const наДругой = await счётчик(p)
  console.log(`   [диагностика] полных загрузок документа за переход: ${p.__загрузок - загрузокДо}`)
  console.log(`   [диагностика] счётчик на другой странице: ${JSON.stringify(наДругой)}`)

  const место = p.locator('a:has-text("МЕСТО")').first()
  const r2 = await место.boundingBox()
  await p.mouse.click(r2.x + r2.width / 2, r2.y + r2.height / 2)
  await p.waitForTimeout(3000)
  const после = await счётчик(p)
  const малиновых = await p.evaluate(
    () =>
      [...document.querySelectorAll('[data-marker] [data-ring]')].filter((k) =>
        getComputedStyle(k).borderColor.includes('200, 30, 90'),
      ).length,
  )

  console.log('\n3. две цифры → другая страница → обратно')
  console.log(`   нашли: ${до.залито} кружка`)
  console.log(`   ушли на ${где}, там залито: ${наДругой.залито}`)
  console.log(`   вернулись: залито ${после.залито}, малиновых маркеров ${малиновых}`)
  if (до.залито !== 2) bad.push(`3: после двух находок залито ${до.залито}`)
  if (наДругой.залито !== 2) bad.push(`3: на другой странице прогресс потерян (${наДругой.залито})`)
  if (после.залито !== 2) bad.push(`3: после возврата залито ${после.залито} вместо 2`)
  if (малиновых !== 2) bad.push(`3: после возврата малиновых маркеров ${малиновых} вместо 2`)
  await c.close()
}

/* ═══════════ 4. неверный код → верный код → пустило ═══════════ */
{
  const { c, p } = await открыть()
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)

  await набрать(p, '1234')
  await p.waitForTimeout(1600)
  const послеОтказа = await p.evaluate(() => ({
    поля: [...document.querySelectorAll('input')].map((i) => i.value).join('') || '—',
    фокус: document.activeElement?.getAttribute?.('aria-label') ?? document.activeElement?.tagName,
  }))

  // печатаем НЕ кликая: курсор обязан сам вернуться в первое поле
  await p.keyboard.type('1847', { delay: 80 })
  await p.waitForTimeout(4000)
  const пустилоЛи = await пустило(p)
  const поля = await p.evaluate(() =>
    [...document.querySelectorAll('input')].map((i) => i.value).join(''),
  )

  console.log('\n4. неверный код → верный код')
  console.log(`   после отказа поля «${послеОтказа.поля}», курсор в «${послеОтказа.фокус}»`)
  console.log(`   набрали 1847 не кликая: поля «${поля}» → ${пустилоЛи ? 'пустило' : 'НЕ ПУСТИЛО'}`)
  if (послеОтказа.поля !== '—') bad.push(`4: после отказа поля не очистились: «${послеОтказа.поля}»`)
  if (!/1 из 4/.test(послеОтказа.фокус ?? '')) {
    bad.push(`4: после отказа курсор в «${послеОтказа.фокус}», а не в первом поле`)
  }
  if (!пустилоЛи) bad.push('4: после неверного кода верный не сработал')
  await c.close()
}

/* ═══════════ хранилища обязаны остаться пустыми ═══════════ */
{
  const { c, p } = await открыть()
  await найтиЦифры(p, 4)
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await набрать(p, '1847')
  await p.waitForTimeout(4000)
  const х = await хранилища(p)
  console.log('\n5. хранилища после полного прохождения')
  console.log(`   sessionStorage: ${х.session} ключ(ей), localStorage: ${х.local}, cookie: ${х.cookie} символ(ов)`)
  if (х.session) bad.push(`5: в sessionStorage ${х.session} ключ(ей) — должно быть пусто`)
  if (х.local) bad.push(`5: в localStorage ${х.local} ключ(ей) — должно быть пусто`)
  if (х.cookie) bad.push('5: выставлены куки — их быть не должно')
  await c.close()
}

await b.close()
srv.close()
console.log('\n════════════════════════════')
if (bad.length) {
  bad.forEach((x) => console.log(' •', x))
  process.exit(1)
}
console.log('все сценарии проходят')
