import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT=path.resolve('out'), BASE='/valmontt', OUT=path.resolve('shots')
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain'}
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4530,r))
const o=`http://127.0.0.1:4530${BASE}`
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']})
for (const [tag,w,h,m] of [['desktop',1920,1080,false],['mobile',390,844,true]]) {
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:m,hasTouch:m})
  const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3400)
  await p.screenshot({path:path.join(OUT,`v3-hero-${tag}.png`)})
  // линза в наведении / в нажатии
  // линза непрерывно «дышит», поэтому событие шлём в DOM, а не курсором:
  // Playwright ждал бы её остановки бесконечно
  await p.evaluate((mob)=>{
    const el=document.querySelector('[data-lens]')
    if (mob) el.click()
    else el.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}))
  }, m)
  await p.waitForTimeout(1200)
  await p.screenshot({path:path.join(OUT,`v3-linza-${tag}.png`)})
  // финальный блок
  await p.evaluate(()=>{const e=document.querySelector('[aria-label="Порог"]');scrollTo(0,e.getBoundingClientRect().top+scrollY)})
  await p.waitForTimeout(2000)
  await p.screenshot({path:path.join(OUT,`v3-porog-${tag}.png`)})
  await c.close()
}
{ const c=await b.newContext({viewport:{width:1500,height:1000}}); const p=await c.newPage()
  await p.goto(o+'/fonts/',{waitUntil:'networkidle'}); await p.waitForTimeout(2200)
  await p.screenshot({path:path.join(OUT,'v3-fonts.png'),fullPage:true}); await c.close() }
await b.close(); srv.close(); console.log('снято')
