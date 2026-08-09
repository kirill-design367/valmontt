/** Снимки блоков главной и ключевых состояний — для сверки композиции. */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve('out'), BASE = '/valmontt'
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain' }
const srv = http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4403,r))
const origin = `http://127.0.0.1:4403${BASE}`
const OUT = path.resolve(process.argv[2] ?? 'shots')
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] })

async function shots(w, h, mobile, tag) {
  const c = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1, isMobile:mobile, hasTouch:mobile })
  const p = await c.newPage()
  await p.goto(origin + '/', { waitUntil:'networkidle' })
  await p.waitForTimeout(3400)
  const H = await p.evaluate(()=>document.body.scrollHeight)
  // манифест, программа, бестиарий, финал
  const stops = [1.02, 1.85, 2.75, 3.7].map(k => Math.min(h*k, H-h))
  const names = ['blok1-manifest','blok2-programma','blok3-bestiary','blok4-final']
  for (let i=0;i<stops.length;i++){
    await p.evaluate(y=>window.scrollTo(0,y), stops[i])
    await p.waitForTimeout(1500)
    await p.screenshot({ path: path.join(OUT, `${names[i]}-${tag}.png`) })
  }
  await c.close()
}
await shots(1920,1080,false,'desktop')
await shots(390,844,true,'mobile')

// состояние формы после отправки
{
  const c = await b.newContext({ viewport:{width:1920,height:1080}, deviceScaleFactor:1 })
  const p = await c.newPage()
  await p.goto(origin + '/zapis/', { waitUntil:'networkidle' })
  await p.waitForTimeout(1400)
  await p.fill('input[name=name]', 'Кирилл')
  await p.fill('input[name=phone]', '+7 900 000-00-00')
  await p.click('button[type=submit]')
  await p.waitForTimeout(2200)
  await p.screenshot({ path: path.join(OUT, 'zapis-otpravleno-desktop.png') })
  await c.close()
}

// штора перехода в середине хода
{
  const c = await b.newContext({ viewport:{width:1920,height:1080}, deviceScaleFactor:1 })
  const p = await c.newPage()
  await p.goto(origin + '/', { waitUntil:'networkidle' })
  await p.waitForTimeout(3400)
  await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(x=>x.getAttribute('href')?.includes('gosti'));a.click()})
  await p.waitForTimeout(650)
  await p.screenshot({ path: path.join(OUT, 'perehod-shtora.png') })
  await c.close()
}
await b.close(); srv.close()
console.log('снимки готовы')
