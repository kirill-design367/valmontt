import { chromium } from 'playwright'
const o = 'http://127.0.0.1:3111/valmontt'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
for (const маршрут of ['/programma/', '/gosti/', '/']) {
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await c.newPage()
  await p.goto(o + маршрут, { waitUntil: 'networkidle' })
  await p.waitForTimeout(4000)
  await p.evaluate(async () => {
    const предел = () => document.documentElement.scrollHeight - innerHeight
    for (let i = 0; i < 200; i++) {
      scrollTo(0, Math.min(scrollY + 160, предел()))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 160 }))
      await new Promise(r => setTimeout(r, 20))
      if (scrollY >= предел() - 1) break
    }
    await new Promise(r => setTimeout(r, 2000))
  })
  const r = await p.evaluate(() =>
    [...document.querySelectorAll('[data-letters]')].map(el => {
      const литеры = [...el.querySelectorAll('*')].filter(n => n.children.length === 0 && (n.textContent||'').trim() !== '')
      const видно = литеры.filter(n => { const cs = getComputedStyle(n); return cs.visibility !== 'hidden' && +cs.opacity > 0.05 })
      // вложенность: литера, у которой предок — тоже разбитая литера
      const глубина = Math.max(0, ...литеры.map(n => { let d=0, x=n.parentElement; while(x && x !== el){ if(/char|word/i.test(x.className||'')) d++; x=x.parentElement } return d }))
      return { весь: el.textContent.replace(/\s+/g,''), видно: видно.map(n=>n.textContent).join('').replace(/\s+/g,''), глубина, литер: литеры.length }
    })
  )
  console.log('\n' + маршрут)
  r.forEach(x => console.log(`   ${x.видно === x.весь ? '✓' : '✗'} «${x.весь}» → видно «${x.видно}»  литер ${x.литер}, глубина обёрток ${x.глубина}`))
  await c.close()
}
await b.close()
