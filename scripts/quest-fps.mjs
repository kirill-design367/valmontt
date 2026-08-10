/**
 * Кадры в секунду на трёх движениях квеста: маркер, дрожание полей,
 * финальная сборка.
 *
 * Считаем rAF внутри самого движения, а не «вообще на странице»: замер
 * стартует вместе с ним и держится ровно столько, сколько оно идёт.
 *
 * Оговорка та же, что и в прошлых замерах: песочница рисует софтверным
 * SwiftShader, без GPU. Полученные числа — нижняя граница, на живой машине
 * будет не хуже.
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
await new Promise((r) => srv.listen(4735, r))
const o = `http://127.0.0.1:4735${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })

/** Счётчик кадров: сколько rAF успело пройти за ms. */
const СЧЁТ = `(ms)=>new Promise(d=>{let n=0;const t0=performance.now();const t=()=>{n++;performance.now()-t0<ms?requestAnimationFrame(t):d(Math.round(n/(performance.now()-t0)*1000))};requestAnimationFrame(t)})`

const строка = (имя, x) => console.log(`${имя.padEnd(34)}${String(x).padStart(4)} fps`)

/* ------------------------------------------------------------- маркеры */
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)

  // Цифра открывается кликом и живёт свой номер целиком: раскрытие 0.4 с,
  // выдержка 2 с, уход 0.45 с. Клик расходует маркер навсегда — поэтому
  // жмём все четыре по очереди, а не один много раз.
  const fps = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const все = [...document.querySelectorAll('[data-marker]')]
    let i = 0
    const t = setInterval(() => { все[i]?.click(); i++ }, 260)
    const r = await счёт(3400)
    clearInterval(t)
    return r
  })()`)
  строка('маркеры: открытие и уход цифры', fps)

  // наведение: окружность растёт и садится без остановки
  const fpsНав = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const все = [...document.querySelectorAll('[data-marker]')]
    let on = false
    const t = setInterval(() => {
      on = !on
      const тип = on ? ['pointerover','pointerenter'] : ['pointerout','pointerleave']
      все.forEach(el => тип.forEach(n => el.dispatchEvent(new PointerEvent(n, { bubbles: true, pointerType: 'mouse' }))))
    }, 420)
    const r = await счёт(3000)
    clearInterval(t)
    return r
  })()`)
  строка('маркеры: наведение на все четыре', fpsНав)
  await c.close()
}

/* ------------------------------------------------------- дрожание полей */
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)

  // отказ длится 0.3 с дрожания + 0.43 с на гашение и возврат; повторяем
  const fps = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const поля = [...document.querySelectorAll('input')]
    const ввод = () => {
      поля.forEach((f, i) => {
        f.focus()
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        set.call(f, String(i + 1))
        f.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    const t = setInterval(ввод, 1200)
    ввод()
    const r = await счёт(3600)
    clearInterval(t)
    return r
  })()`)
  строка('дрожание полей при отказе', fps)
  await c.close()
}

/* ------------------------------------------------- индикатор проезда */
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)

  const fps = await p.evaluate(`(async()=>{ const счёт = ${СЧЁТ}; return счёт(3000) })()`)
  строка('индикатор: пробег пятна', fps)

  // боевой случай: пятно бежит, а лента едет вбок под ним
  const fpsЛента = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const предел = document.documentElement.scrollHeight - innerHeight
    const t = setInterval(() => {
      scrollTo(0, Math.min(scrollY + 90, предел))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 90 }))
    }, 32)
    const r = await счёт(3000)
    clearInterval(t)
    return r
  })()`)
  строка('индикатор + проезд ленты', fpsЛента)
  await c.close()
}

/* ------------------------------------------------------ финальная сборка */
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)

  // замер стартует вместе с вводом верного кода и держит весь номер:
  // гашение полей → чернота → сборка букв
  const fps = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const поля = [...document.querySelectorAll('input')]
    const код = '1847'
    const дело = счёт(2600)
    поля.forEach((f, i) => {
      f.focus()
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(f, код[i])
      f.dispatchEvent(new Event('input', { bubbles: true }))
    })
    return дело
  })()`)
  строка('финал: гашение + чернота + сборка', fps)
  await c.close()
}

await b.close()
srv.close()
