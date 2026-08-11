import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT=path.resolve('out'); const BASE='/valmontt'
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.txt':'text/plain'}
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4761,r))
const o=`http://127.0.0.1:4761${BASE}`
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']})
for (const [м,имя] of [['/programma/','programma'],['/gosti/','gosti']]) {
  const c=await b.newContext({viewport:{width:1920,height:1080}}); const p=await c.newPage()
  await p.goto(o+м,{waitUntil:'networkidle'}); await p.waitForTimeout(2600)
  await p.screenshot({path:`shots/v13-${имя}-bez-skrolla.png`})
  // прокрутить чуть-чуть и снять
  await p.evaluate(async()=>{ for(let i=0;i<30;i++){ scrollTo(0,Math.min(scrollY+120,document.documentElement.scrollHeight-innerHeight)); dispatchEvent(new WheelEvent('wheel',{deltaY:120})); await new Promise(r=>setTimeout(r,25)) } await new Promise(r=>setTimeout(r,1500)) })
  await p.screenshot({path:`shots/v13-${имя}-posle-skrolla.png`})
  // геометрия первой литеры каждого блока
  const г = await p.evaluate(()=>[...document.querySelectorAll('[data-letters]')].map(el=>{
    const литеры=[...el.querySelectorAll('*')].filter(n=>n.children.length===0&&(n.textContent||'').trim()!=='')
    const пер=литеры[0]; if(!пер) return null
    const rb=пер.getBoundingClientRect(), rp=el.getBoundingClientRect()
    // ищем ближайшего предка с обрезкой
    let clip=null, x=el
    while(x&&x!==document.body){ const cs=getComputedStyle(x); if(cs.overflow!=='visible'||cs.clipPath!=='none'){ clip=`${x.tagName}.${(x.className||'').toString().slice(0,24)} overflow:${cs.overflow}`; break } x=x.parentElement }
    return { знак: пер.textContent, слева: Math.round(rb.left-rp.left), ширина: Math.round(rb.width), обрезка: clip }
  }).filter(Boolean))
  console.log('\n'+м); г.forEach(x=>console.log('  ',JSON.stringify(x)))
  await c.close()
}
await b.close(); srv.close()
