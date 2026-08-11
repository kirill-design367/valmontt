/**
 * Кадры в секунду на усиленной сборке: разброс 180 px, поворот 45°,
 * масштаб от 0.6. Считаем rAF, пока страница едет по всем блокам сразу.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve('out'); const BASE = '/valmontt'
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain' }
const srv = http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4767,r))
const o = `http://127.0.0.1:4767${BASE}`
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] })
const СЧЁТ = `(ms)=>new Promise(d=>{let n=0;const t0=performance.now();const t=()=>{n++;performance.now()-t0<ms?requestAnimationFrame(t):d(Math.round(n/(performance.now()-t0)*1000))};requestAnimationFrame(t)})`

for (const [имя, маршрут, блоков] of [
  ['главная: манифест, времена, дата', '/', 7],
  ['/programma: восемь времён', '/programma/', 8],
  ['/gosti: шесть правил', '/gosti/', 6],
]) {
  const c = await b.newContext({ viewport:{width:1920,height:1080} })
  const p = await c.newPage()
  await p.goto(o + маршрут, { waitUntil:'networkidle' })
  await p.waitForTimeout(3000)
  const fps = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const предел = document.documentElement.scrollHeight - innerHeight
    const t = setInterval(() => {
      scrollTo(0, Math.min(scrollY + 70, предел))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 70 }))
    }, 32)
    const r = await счёт(4000)
    clearInterval(t)
    return r
  })()`)
  console.log(`${имя.padEnd(36)}${String(fps).padStart(4)} fps   (блоков сборки ${блоков})`)
  await c.close()
}
/* «Порог» отдельно: восемь литер разлетаются на 180 px вместе с блумом */
{
  const c = await b.newContext({ viewport:{width:1920,height:1080} })
  const p = await c.newPage()
  await p.goto(o + '/', { waitUntil:'networkidle' })
  await p.waitForTimeout(3000)
  await p.evaluate(async () => {
    const предел = document.documentElement.scrollHeight - innerHeight
    for (let i=0;i<400;i++){ scrollTo(0, Math.min(scrollY+300, предел*0.86)); dispatchEvent(new WheelEvent('wheel',{deltaY:300})); await new Promise(r=>setTimeout(r,18)); if (scrollY>=предел*0.86-2) break }
    await new Promise(r=>setTimeout(r,900))
  })
  const fps = await p.evaluate(`(async()=>{
    const счёт = ${СЧЁТ}
    const предел = document.documentElement.scrollHeight - innerHeight
    const t = setInterval(() => { scrollTo(0, Math.min(scrollY + 60, предел)); dispatchEvent(new WheelEvent('wheel', { deltaY: 60 })) }, 32)
    const r = await счёт(3000)
    clearInterval(t)
    return r
  })()`)
  console.log(`${'«Порог»: сборка вордмарка'.padEnd(36)}${String(fps).padStart(4)} fps`)
  await c.close()
}
await b.close(); srv.close()
