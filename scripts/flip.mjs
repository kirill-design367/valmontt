/**
 * Разворот линзы: четыре состояния, три кадра движения, геометрия и fps.
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
await new Promise((r) => srv.listen(4680, r))
const o = `http://127.0.0.1:4680${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

const кадр = async (p, имя) => {
  const box = await p.locator('[data-lens]').boundingBox()
  const pad = 90
  await p.screenshot({
    path: path.join(OUT, имя + '.png'),
    clip: {
      x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
      width: box.width + pad * 2, height: box.height + pad * 2,
    },
  })
}

const открыть = async (w = 1920, h = 1080) => {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)
  return { c, p }
}

const навести = (p, on) =>
  p.evaluate((on) => {
    const el = document.querySelector('[data-lens]')
    el.dispatchEvent(new PointerEvent(on ? 'pointerover' : 'pointerout', { bubbles: true, pointerType: 'mouse' }))
    el.dispatchEvent(new PointerEvent(on ? 'pointerenter' : 'pointerleave', { bubbles: true, pointerType: 'mouse' }))
  }, on)

const кликнуть = (p) =>
  p.evaluate(() => {
    const el = document.querySelector('[data-lens]')
    el.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'mouse' }))
  })

/* --- четыре состояния --- */
{
  const { c, p } = await открыть()
  await кадр(p, 'v9-lico-pokoy')

  await навести(p, true)
  await p.waitForTimeout(700)
  await кадр(p, 'v9-lico-navedenie')
  await навести(p, false)
  await p.waitForTimeout(500)

  await кликнуть(p)
  await p.waitForTimeout(1300)
  await кадр(p, 'v9-oborot-pokoy')

  const геом = await p.evaluate(() => {
    const el = document.querySelector('[data-lens]')
    const лицо = el.querySelector('[data-side="face"]')
    const оборот = el.querySelector('[data-side="back"]')
    const строки = [...оборот.querySelectorAll('[data-rest]'), ...оборот.querySelectorAll('[data-fact]')]
    return {
      поворот: getComputedStyle(el).transform,
      объём: getComputedStyle(el).transformStyle,
      перспектива: getComputedStyle(el.parentElement).perspective,
      изнанкаЛица: getComputedStyle(лицо).backfaceVisibility,
      изнанкаОборота: getComputedStyle(оборот).backfaceVisibility,
      ширинаРамки: Math.round(оборот.getBoundingClientRect().width),
      самаяДлиннаяСтрока: Math.max(...строки.map((n) => {
        const r = document.createRange(); r.selectNodeContents(n)
        return Math.round(r.getBoundingClientRect().width)
      })),
      внутренняяШирина: Math.round(
        оборот.getBoundingClientRect().width -
          parseFloat(getComputedStyle(оборот).paddingLeft) -
          parseFloat(getComputedStyle(оборот).paddingRight),
      ),
    }
  })
  console.log('оборот', JSON.stringify(геом))
  if (геом.объём !== 'preserve-3d') bad.push('панель расплющена: transform-style = ' + геом.объём)
  if (геом.перспектива === 'none') bad.push('перспективы на родителе нет — разворот будет плоским')
  if (геом.изнанкаЛица !== 'hidden' || геом.изнанкаОборота !== 'hidden') bad.push('изнанка не скрыта')
  if (геом.самаяДлиннаяСтрока > геом.внутренняяШирина) {
    bad.push(`оборот: строка ${геом.самаяДлиннаяСтрока} px не влезает в ${геом.внутренняяШирина} px`)
  }

  await навести(p, true)
  await p.waitForTimeout(700)
  await кадр(p, 'v9-oborot-navedenie')
  await c.close()
}

/* --- три кадра разворота --- */
{
  const { c, p } = await открыть()
  for (const мс of [200, 450, 700]) {
    await p.evaluate(() => {
      const el = document.querySelector('[data-lens]')
      el.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'mouse' }))
    })
    await p.waitForTimeout(мс)
    await кадр(p, `v9-razvorot-${мс}`)
    // возвращаем в исходное и ждём завершения
    await p.waitForTimeout(1200)
    await p.evaluate(() => {
      const el = document.querySelector('[data-lens]')
      el.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'mouse' }))
    })
    await p.waitForTimeout(1200)
  }
  await c.close()
}

/* --- мобильная: тап и удержание --- */
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(3400)
  const box = await p.locator('[data-lens]').boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  const поворот = () => p.evaluate(() => getComputedStyle(document.querySelector('[data-lens]')).transform)
  const текстВидим = () =>
    p.evaluate(() => {
      const f = document.querySelector('[data-side="face"] [data-fact]')
      return getComputedStyle(f).visibility === 'visible'
    })

  // короткий тап — только текст
  await p.touchscreen.tap(x, y)
  await p.waitForTimeout(700)
  const послеТапа = { текст: await текстВидим(), поворот: await поворот() }

  // удержание — разворот
  await p.mouse.move(x, y)
  await p.evaluate(([x, y]) => {
    const el = document.querySelector('[data-lens]')
    const о = { bubbles: true, pointerType: 'touch', clientX: x, clientY: y, pointerId: 1 }
    el.dispatchEvent(new PointerEvent('pointerdown', о))
    setTimeout(() => el.dispatchEvent(new PointerEvent('pointerup', о)), 600)
  }, [x, y])
  await p.waitForTimeout(1600)
  const послеУдержания = await поворот()

  console.log('мобильная', JSON.stringify({ послеТапа, послеУдержания }))
  if (послеТапа.поворот !== 'none' && !послеТапа.поворот.startsWith('matrix(1, 0, 0, 1')) {
    bad.push('мобильная: короткий тап развернул панель, а должен был только сменить текст')
  }
  if (!послеТапа.текст) bad.push('мобильная: тап не показал данные')
  if (послеУдержания === 'none') bad.push('мобильная: удержание не развернуло панель')
  await c.close()
}

/* --- fps --- */
const FPS = `async (ms)=>{let n=0;const t0=performance.now();await new Promise(d=>{const t=()=>{n++;performance.now()-t0<ms?requestAnimationFrame(t):d()};requestAnimationFrame(t)});return Math.round(n/(performance.now()-t0)*1000)}`
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1]

const сцена = async (тело, ms = 2600) => {
  const { c, p } = await открыть()
  const f = await p.evaluate(`(async()=>{ ${тело} const f = await (${FPS})(${ms}); clearInterval(таймер); return f })()`)
  await c.close()
  return f
}

const итог = {}
for (const [имя, тело] of [
  ['потолок', null],
  ['разворот подряд', `
    const el = document.querySelector('[data-lens]')
    const таймер = setInterval(() => el.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'mouse' })), 950)
  `],
  ['разворот при наведении', `
    const el = document.querySelector('[data-lens]')
    el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }))
    const таймер = setInterval(() => el.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'mouse' })), 950)
  `],
  ['наведение', `
    const el = document.querySelector('[data-lens]')
    let on = false
    const таймер = setInterval(() => {
      on = !on
      el.dispatchEvent(new PointerEvent(on ? 'pointerover' : 'pointerout', { bubbles: true, pointerType: 'mouse' }))
      el.dispatchEvent(new PointerEvent(on ? 'pointerenter' : 'pointerleave', { bubbles: true, pointerType: 'mouse' }))
    }, 700)
  `],
  // Стресс: курсор прыгает через весь экран 62 раза в секунду, перья
  // рождаются с максимальной частотой, панель разворачивается без пауз.
  // Живой мышью так не поводить — сцена нужна как нижняя граница, поэтому
  // порог 58 к ней не применяется (см. проверку ниже).
  ['hero целиком (стресс)', `
    const el = document.querySelector('[data-lens]')
    let a = 0
    const таймер = setInterval(() => {
      a += 0.5
      dispatchEvent(new PointerEvent('pointermove', {
        clientX: innerWidth * (0.5 + 0.38 * Math.sin(a)),
        clientY: innerHeight * (0.5 + 0.32 * Math.cos(a * 1.3)),
        bubbles: true, pointerType: 'mouse',
      }))
      if (Math.random() < 0.02) el.dispatchEvent(new PointerEvent('click', { bubbles: true, pointerType: 'mouse' }))
    }, 16)
  `],
]) {
  const прогоны = []
  for (let i = 0; i < 3; i++) {
    if (тело === null) {
      const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
      const p = await c.newPage()
      await p.goto('data:text/html,<body style="background:#000">')
      прогоны.push(await p.evaluate(`(${FPS})(1500)`))
      await c.close()
    } else {
      прогоны.push(await сцена(тело))
    }
  }
  итог[имя] = med(прогоны)
  console.log(имя.padEnd(42), String(итог[имя]).padStart(3), ' прогоны', прогоны.join('/'))
  if (имя !== 'потолок' && !имя.includes('стресс') && итог[имя] < 58) {
    bad.push(`${имя}: ${итог[имя]} кадров, ниже 58`)
  }
}

await b.close()
srv.close()
if (bad.length) { console.error('\nПРОБЛЕМЫ:'); bad.forEach((x) => console.error(' •', x)); process.exit(1) }
console.log('\nразворот в порядке')
