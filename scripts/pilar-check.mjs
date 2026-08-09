/** Геометрия вордмарка после смены гарнитуры + снимки. */
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT=path.resolve('out'),BASE='/valmontt',OUT=path.resolve('shots')
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain'}
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4570,r))
const o=`http://127.0.0.1:4570${BASE}`
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']})
const bad=[]

for (const [tag,w,h,m] of [['desktop',1920,1080,false],['mobile',390,844,true]]) {
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:m,hasTouch:m})
  const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3400)
  const g=await p.evaluate(()=>{
    const wm=document.querySelector('[data-wordmark]'); const r=wm.getBoundingClientRect()
    const cs=getComputedStyle(wm)
    const rng=document.createRange(); rng.setStart(wm.firstChild,1); rng.setEnd(wm.firstChild,2)
    return {семья:cs.fontFamily.split(',')[0], вес:cs.fontWeight,
      кегль:+parseFloat(cs.fontSize).toFixed(1), трекинг:+parseFloat(cs.letterSpacing).toFixed(1),
      столбец:Math.round(r.height), отношение:+(r.height/innerHeight).toFixed(3),
      срезСверху:Math.round(-r.top), срезСнизу:Math.round(r.bottom-innerHeight),
      высотаЛитеры:+rng.getBoundingClientRect().height.toFixed(0)}
  })
  console.log(tag, JSON.stringify(g))
  if (g.срезСверху<8||g.срезСнизу<8) bad.push(`${tag}: обрезка пропала (${g.срезСверху}/${g.срезСнизу})`)
  // Имя семейства next/font подменяет на служебный алиас, поэтому сверяем
  // не название, а апрош: у Pilar шаг столбца (0.839+трекинг)×кегль,
  // у Onest он был бы на 15 % короче.
  const шаг = g.столбец / 8
  const ждём = (0.839 + g.трекинг / g.кегль) * g.кегль
  if (Math.abs(шаг - ждём) > 6) bad.push(`${tag}: шаг столбца ${шаг.toFixed(1)} против ожидаемых ${ждём.toFixed(1)} — гарнитура не Pilar`)
  await p.screenshot({path:path.join(OUT,`v5-hero-${tag}.png`)})
  await c.close()
}

// Порог
{
  const c=await b.newContext({viewport:{width:1920,height:1080}}); const p=await c.newPage()
  await p.goto(o+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3400)
  await p.evaluate(()=>{const e=document.querySelector('[aria-label="Порог"]');scrollTo(0,e.getBoundingClientRect().top+scrollY)})
  await p.waitForTimeout(2000)
  const k=await p.evaluate(()=>{const w=document.querySelector('h2[aria-label="ВАЛЬМОНТ"]');const r=w.getBoundingClientRect();return {высота:Math.round(r.height),доляЭкрана:+(r.height/innerHeight).toFixed(3),верх:Math.round(r.top),низ:Math.round(innerHeight-r.bottom)}})
  console.log('порог', JSON.stringify(k))
  if (k.доляЭкрана<0.6||k.доляЭкрана>0.8) bad.push(`порог: слово занимает ${Math.round(k.доляЭкрана*100)}% высоты вместо ~70`)
  if (k.верх<10||k.низ<10) bad.push('порог: слово не помещается с запасом')
  await p.screenshot({path:path.join(OUT,'v5-porog.png')})
  await c.close()
}

// /gosti и /fonts
for (const [route,name,w,h,full] of [['/gosti/','v5-gosti',1920,1080,false],['/fonts/','v5-fonts',1500,1000,true]]) {
  const c=await b.newContext({viewport:{width:w,height:h}}); const p=await c.newPage()
  await p.goto(o+route,{waitUntil:'networkidle'}); await p.waitForTimeout(1800)
  await p.screenshot({path:path.join(OUT,name+'.png'),fullPage:full})
  await c.close()
}

// горизонтальной прокрутки быть не должно
for (const [route,w,h,m] of [['/',390,844,true],['/zapis/',390,844,true],['/programma/',390,844,true],['/gosti/',390,844,true]]) {
  const c=await b.newContext({viewport:{width:w,height:h},isMobile:m,hasTouch:m}); const p=await c.newPage()
  await p.goto(o+route,{waitUntil:'networkidle'}); await p.waitForTimeout(1600)
  const ov=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}))
  if (ov.sw>ov.cw+1) bad.push(`${route} мобильная: горизонтальный скролл ${ov.sw}>${ov.cw}`)
  await c.close()
}

await b.close(); srv.close()
if(bad.length){console.error('\nПРОБЛЕМЫ:');bad.forEach(x=>console.error(' •',x));process.exit(1)}
console.log('\nвсё чисто')
