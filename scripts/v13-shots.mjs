/** Кадры для отчёта: карточки входа, /gosti с шестью правилами. */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve('out'); const BASE = '/valmontt'
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain' }
const srv = http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4763,r))
const o = `http://127.0.0.1:4763${BASE}`
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] })

/* карточки «ВХОД» на главной: покой и наведение */
{
  const c = await b.newContext({ viewport:{width:1920,height:1080} })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil:'networkidle' })
  await p.waitForTimeout(3000)
  // доехать до блока входа и ОСТАНОВИТЬСЯ там: рамку кадра считаем уже
  // после остановки, иначе клип берётся от старого положения страницы
  /* Доводим ряд карточек в кадр средствами Playwright, а не своим циклом:
     документ дорастает по ходу загрузки, и любая арифметика по координатам
     уезжает. После — небольшой толчок колесом, чтобы Lenis встал ровно. */
  const ряд = await p.$('[data-entry-card]')
  for (let i = 0; i < 6; i++) {
    await ряд.scrollIntoViewIfNeeded()
    await p.waitForTimeout(600)
  }
  await p.evaluate(() => {
    const r = document.querySelector('[data-entry-card]').closest('section').getBoundingClientRect()
    scrollTo(0, scrollY + r.top - innerHeight * 0.14)
    dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }))
  })
  await p.waitForTimeout(2500)

  const рамка = await p.evaluate(() => {
    const r = document.querySelector('[data-entry-card]').closest('div').getBoundingClientRect()
    return {
      x: Math.max(0, r.x - 40),
      y: Math.max(0, r.y - 40),
      width: Math.min(1920 - Math.max(0, r.x - 40), r.width + 80),
      height: Math.min(1080 - Math.max(0, r.y - 40), r.height + 80),
    }
  })
  await p.screenshot({ path: 'shots/v13-entry-pokoy.png' })

  // настоящее наведение мышью: тогда и рамка светлеет по :hover
  const карточки = await p.$$('[data-entry-card]')
  await карточки[2].hover()
  await p.waitForTimeout(700)
  await p.screenshot({ path: 'shots/v13-entry-navedenie.png' })

  const замер = await p.evaluate(() => {
    const м = (el) => {
      const t = getComputedStyle(el).transform
      return t === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(t)
    }
    const к = document.querySelectorAll('[data-entry-card]')[2]
    return {
      сдвигY: +м(к).f.toFixed(2),
      масштабИмени: +м(к.querySelector('[data-entry-name]')).a.toFixed(3),
      рамка: getComputedStyle(к).borderTopColor,
      рамкаСоседа: getComputedStyle(document.querySelectorAll('[data-entry-card]')[0]).borderTopColor,
    }
  })
  console.log('карточка при наведении:', JSON.stringify(замер))
  await c.close()
}

/* /gosti с шестью правилами */
{
  const c = await b.newContext({ viewport:{width:1920,height:1080} })
  const p = await c.newPage()
  await p.goto(o + '/gosti/', { waitUntil:'networkidle' })
  await p.waitForTimeout(3000)
  await p.evaluate(async () => {
    const предел = document.documentElement.scrollHeight - innerHeight
    for (let i=0;i<400;i++){ scrollTo(0, Math.min(scrollY+140, предел)); dispatchEvent(new WheelEvent('wheel',{deltaY:140})); await new Promise(r=>setTimeout(r,22)); if (scrollY>=предел-1) break }
    await new Promise(r=>setTimeout(r,1800))
  })
  await p.screenshot({ path:'shots/v13-gosti-shest-pravil.png', fullPage: true })
  const ритм = await p.evaluate(() => {
    // шаг ритма — расстояние между началами соседних правил: сам просвет
    // лежит внутри li как padding, поэтому «зазор между li» всегда ноль
    const п = [...document.querySelectorAll('li[id]')]
    const шаги = []
    for (let i=1;i<п.length;i++) шаги.push(Math.round(п[i].getBoundingClientRect().top - п[i-1].getBoundingClientRect().top))
    return {
      правил: п.length,
      шаги,
      кратно8: шаги.every(x=>x%8===0),
      одинаковы: new Set(шаги).size===1,
      высотаСтраницы: document.documentElement.scrollHeight,
      экранов: +(document.documentElement.scrollHeight/innerHeight).toFixed(2),
    }
  })
  console.log('ритм /gosti:', JSON.stringify(ритм))
  await c.close()
}
await b.close(); srv.close()
