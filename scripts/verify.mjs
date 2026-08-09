/** Проверка настоящим курсором + раскадровка входа + LCP. */
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT=path.resolve('out'),BASE='/valmontt',OUT=path.resolve('shots')
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain'}
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4550,r))
const o=`http://127.0.0.1:4550${BASE}`
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']})
const bad=[]

// 1. КЛИК НАСТОЯЩИМ КУРСОРОМ по координатам — так же, как человек
for (const [page,sel,want] of [
  ['/', 'nav a[href*=programma]', '/valmontt/programma/'],
  ['/', 'nav a[href*=gosti]', '/valmontt/gosti/'],
  ['/', 'nav a[href*=mesto]', '/valmontt/mesto/'],
  ['/', 'nav a[href*=zapis]', '/valmontt/zapis/'],
  ['/programma/', 'a[href="/valmontt/gosti/"]', '/valmontt/gosti/'],
  ['/gosti/', 'a[href="/valmontt/mesto/"]', '/valmontt/mesto/'],
  ['/mesto/', 'a[href="/valmontt/zapis/"]', '/valmontt/zapis/'],
  ['/zapis/', 'a[href="/valmontt/"]', '/valmontt/'],
  ['/fonts/', 'a[href="/valmontt/"]', '/valmontt/'],
]) {
  const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
  await p.goto(o+page,{waitUntil:'networkidle'}); await p.waitForTimeout(page==='/'?3400:1400)
  const el=await p.$(sel)
  if(!el){bad.push(`${page}: не найден ${sel}`);await c.close();continue}
  const box=await el.boundingBox()
  const x=box.x+box.width/2, y=box.y+box.height/2
  const top=await p.evaluate(([x,y])=>{const t=document.elementFromPoint(x,y);return t?t.tagName.toLowerCase()+'.'+String(t.className).slice(0,34):'?'},[x,y])
  await p.mouse.click(x,y)
  await p.waitForTimeout(1900)
  const now=new URL(p.url()).pathname
  const ok=now===want
  console.log(`${ok?'✓':'✗'} ${page.padEnd(12)} курсор → ${now.padEnd(22)} сверху ${top}`)
  if(!ok) bad.push(`${page} ${sel}: ушли на ${now}, ждали ${want}; сверху ${top}`)
  await c.close()
}

// 2. раскадровка входа
{
  const c=await b.newContext({viewport:{width:1920,height:1080}}); const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'commit'})
  await p.waitForFunction(()=>{const e=document.querySelector('[data-wordmark]');return e&&getComputedStyle(e).visibility==='visible'&&parseFloat(getComputedStyle(e).opacity)>0.01})
  let prev=0
  for (const t of [500,1000,1600]) { await p.waitForTimeout(t-prev); prev=t
    await p.screenshot({path:path.join(OUT,`v4-vhod-${t}ms.png`)}) }
  await c.close()
}

// 3. линза: покой и наведение
{
  const c=await b.newContext({viewport:{width:1920,height:1080}}); const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3400)
  await p.screenshot({path:path.join(OUT,'v4-linza-pokoy.png')})
  const box=await (await p.$('[data-lens]')).boundingBox()
  await p.mouse.move(box.x+box.width/2, box.y+box.height/2)
  await p.waitForTimeout(1100)
  await p.screenshot({path:path.join(OUT,'v4-linza-navedenie.png')})
  await c.close()
}

// 4. LCP
{
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}); const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'load'})
  const lcp=await p.evaluate(()=>new Promise(res=>{new PerformanceObserver(l=>{const e=l.getEntries().at(-1);res({мс:Math.round(e.startTime),элемент:e.element?e.element.tagName:'?'})}).observe({type:'largest-contentful-paint',buffered:true});setTimeout(()=>res({мс:-1}),8000)}))
  console.log('LCP локально (без троттлинга):', JSON.stringify(lcp))
  await c.close()
}

// 5. «Порог» — финальный кадр
{
  const c=await b.newContext({viewport:{width:1920,height:1080}}); const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3400)
  await p.evaluate(()=>{const e=document.querySelector('[aria-label="Порог"]');scrollTo(0,e.getBoundingClientRect().top+scrollY)})
  await p.waitForTimeout(2000)
  await p.screenshot({path:path.join(OUT,'v4-porog.png')})
  await c.close()
}

await b.close(); srv.close()
if (bad.length){console.error('\nПРОБЛЕМЫ:');bad.forEach(x=>console.error(' •',x));process.exit(1)}
console.log('\nвсё чисто')
