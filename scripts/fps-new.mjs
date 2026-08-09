/** fps новых сцен: линза при наведении, схлопывание и «Порог». */
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const ROOT=path.resolve('out'), BASE='/valmontt'
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain'}
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(!p.startsWith(BASE))return r.writeHead(404).end();p=p.slice(BASE.length)||'/';let f=path.join(ROOT,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return r.writeHead(404).end();r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)})
await new Promise(r=>srv.listen(4520,r))
const origin=`http://127.0.0.1:4520${BASE}`
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']})
const S=`async (ms)=>{let n=0;const t0=performance.now();await new Promise(d=>{const t=()=>{n++;performance.now()-t0<ms?requestAnimationFrame(t):d()};requestAnimationFrame(t)});return Math.round(n/(performance.now()-t0)*1000)}`
const med=a=>a.slice().sort((x,y)=>x-y)[a.length>>1]
const solo=async fn=>{const c=await b.newContext({viewport:{width:1920,height:1080}});const p=await c.newPage();const o=await fn(p);await c.close();return o}

const ceiling=med(await Promise.all([0,1,2].map(()=>solo(async p=>{await p.goto('data:text/html,<body style="background:#000">');return p.evaluate(`(${S})(1200)`)}))))

const lens=await solo(async p=>{
  await p.goto(origin+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3200)
  const box=await p.locator('[data-lens]').boundingBox()
  return p.evaluate(`(async()=>{
    const el=document.querySelector('[data-lens]')
    let on=false
    const drive=setInterval(()=>{on=!on;el.dispatchEvent(new PointerEvent(on?'pointerenter':'pointerleave',{bubbles:true,pointerType:'mouse'}))},700)
    const f=await (${S})(2600); clearInterval(drive); return f
  })()`)
})

const porog=await solo(async p=>{
  await p.goto(origin+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3200)
  return p.evaluate(`(async()=>{
    const el=document.querySelector('[aria-label="Порог"]')
    const top=el.getBoundingClientRect().top+scrollY
    let y=top-innerHeight
    const drive=setInterval(()=>{y+=26;scrollTo(0,y);dispatchEvent(new WheelEvent('wheel',{deltaY:26}))},16)
    const f=await (${S})(2400); clearInterval(drive); return f
  })()`)
})

const collapse=await solo(async p=>{
  await p.goto(origin+'/',{waitUntil:'networkidle'}); await p.waitForTimeout(3200)
  return p.evaluate(`(async()=>{
    const el=document.querySelector('[aria-label="Порог"]')
    const top=el.getBoundingClientRect().top+scrollY
    let y=top-innerHeight*1.9
    const drive=setInterval(()=>{y+=22;scrollTo(0,y);dispatchEvent(new WheelEvent('wheel',{deltaY:22}))},16)
    const f=await (${S})(2200); clearInterval(drive); return f
  })()`)
})

console.log(JSON.stringify({потолок:ceiling,линза:lens,схлопывание:collapse,порог:porog}))
await b.close(); srv.close()
