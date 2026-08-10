/**
 * Квест целиком: маркеры, счётчик, дверь, финальный экран.
 * Кадры и замеры — в том же прогоне.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('out')
const BASE = '/valmontt'
const OUT = path.resolve('shots')
const T = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain',
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
await new Promise((r) => srv.listen(4730, r))
const o = `http://127.0.0.1:4730${BASE}`
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
const bad = []

const открыть = async (маршрут, { w = 1920, h = 1080, m = false } = {}) => {
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m })
  const p = await c.newPage()
  await p.goto(o + маршрут, { waitUntil: 'networkidle' })
  await p.waitForTimeout(m ? 2200 : 2000)
  return { c, p }
}

/** Проезд ленты до нужного кадра: на десктопе она едет вбок по скроллу. */
const кКадру = async (p, i, m) => {
  await p.evaluate(
    ([i, m]) => {
      const шаг = m ? innerHeight * 0.68 : innerWidth * 0.78
      let y = 0
      const цель = шаг * i + (m ? 0 : 60)
      const t = setInterval(() => {
        y += 60
        scrollTo(0, Math.min(y, цель))
        dispatchEvent(new WheelEvent('wheel', { deltaY: 60 }))
        if (y >= цель) clearInterval(t)
      }, 16)
    },
    [i, m],
  )
  await p.waitForTimeout(2000)
}

/* ------------------------------------------------- маркеры: три состояния */
for (const [tag, опции] of [['desktop', {}], ['mobile', { w: 390, h: 844, m: true }]]) {
  const { c, p } = await открыть('/mesto/', опции)
  const m = Boolean(опции.m)

  // все четыре маркера должны быть на своих местах и внутри кадра
  const места = await p.evaluate(() => {
    return [...document.querySelectorAll('[data-marker]')].map((el) => {
      const r = el.getBoundingClientRect()
      const рамка = el.closest('section').getBoundingClientRect()
      return {
        внутриРамки:
          r.left >= рамка.left - 1 && r.right <= рамка.right + 1 &&
          r.top >= рамка.top - 1 && r.bottom <= рамка.bottom + 1,
        доляX: +((r.left + r.width / 2 - рамка.left) / рамка.width).toFixed(3),
        доляY: +((r.top + r.height / 2 - рамка.top) / рамка.height).toFixed(3),
        размер: Math.round(r.width),
      }
    })
  })
  console.log(`маркеры ${tag}`, JSON.stringify(места))
  места.forEach((м, i) => {
    if (!м.внутриРамки) bad.push(`${tag}: маркер ${i + 1} вышел за кадр`)
    if (м.доляX > 0.4 && м.доляX < 0.6 && м.доляY > 0.4 && м.доляY < 0.6) {
      bad.push(`${tag}: маркер ${i + 1} встал в центре кадра`)
    }
    if (м.доляY > 0.72) bad.push(`${tag}: маркер ${i + 1} налез на подпись (${м.доляY})`)
  })

  const кадр = async (имя) => {
    const el = await p.$('[data-marker]')
    const r = await el.boundingBox()
    const pad = 130
    await p.screenshot({
      path: path.join(OUT, `${имя}-${tag}.png`),
      clip: {
        x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad),
        width: r.width + pad * 2, height: r.height + pad * 2,
      },
    })
  }

  await кадр('v11-marker-pokoy')

  // наведение цифру больше не открывает — только подращивает окружность
  await p.evaluate(() => {
    const el = document.querySelector('[data-marker]')
    el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }))
    el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }))
  })
  await p.waitForTimeout(600)
  const приНаведении = await p.evaluate(() => {
    const ц = document.querySelector('[data-marker] [data-digit]')
    return +getComputedStyle(ц).opacity
  })
  if (приНаведении > 0.05) bad.push(`${tag}: наведение открыло цифру (прозрачность ${приНаведении})`)
  await p.evaluate(() => {
    const el = document.querySelector('[data-marker]')
    el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }))
    el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }))
  })
  await p.waitForTimeout(450)

  // цифра открывается кликом (на телефоне тапом) и держится две секунды
  await p.evaluate(() => document.querySelector('[data-marker]').click())
  await p.waitForTimeout(700)
  await кадр('v11-marker-otkryta')
  const открыта = await p.evaluate(() => {
    const ц = document.querySelector('[data-marker] [data-digit]')
    return { видна: +getComputedStyle(ц).opacity > 0.9, текст: ц.textContent.trim() }
  })
  console.log(`цифра открыта ${tag}`, JSON.stringify(открыта))
  if (!открыта.видна) bad.push(`${tag}: цифра не открылась по клику`)

  // держится две секунды — на полутора она обязана быть ещё видна
  await p.waitForTimeout(900)
  const наПолутора = await p.evaluate(
    () => +getComputedStyle(document.querySelector('[data-marker] [data-digit]')).opacity,
  )
  if (наПолутора < 0.9) bad.push(`${tag}: цифра погасла раньше двух секунд (${наПолутора} на 1.6 с)`)

  // ...и гаснет насовсем
  await p.waitForTimeout(1600)
  await кадр('v11-marker-pogasla')
  const погасла = await p.evaluate(() => {
    const el = document.querySelector('[data-marker]')
    const ц = el.querySelector('[data-digit]')
    const к = el.querySelector('[data-ring]')
    return {
      цифраСкрыта: +getComputedStyle(ц).opacity < 0.05,
      кольцоМалиновое: getComputedStyle(к).borderColor.includes('200, 30, 90'),
    }
  })
  console.log(`цифра погасла ${tag}`, JSON.stringify(погасла))
  if (!погасла.цифраСкрыта) bad.push(`${tag}: цифра не погасла через две секунды`)
  if (!погасла.кольцоМалиновое) bad.push(`${tag}: погасший маркер не малиновый`)

  // повторный клик ничего не показывает
  await p.evaluate(() => document.querySelector('[data-marker]').click())
  await p.waitForTimeout(800)
  const повторно = await p.evaluate(
    () => +getComputedStyle(document.querySelector('[data-marker] [data-digit]')).opacity,
  )
  if (повторно > 0.05) bad.push(`${tag}: повторный клик снова показал цифру`)

  // счётчик должен проявиться
  await p.waitForTimeout(600)
  const счёт = await p.evaluate(() => {
    const box = document.querySelector('[class*="QuestProgress_progress"]')
    const cs = getComputedStyle(box)
    const r = box.getBoundingClientRect()
    return {
      видим: cs.visibility === 'visible' && +cs.opacity > 0.5,
      справа: Math.round(innerWidth - r.right),
      снизу: Math.round(innerHeight - r.bottom),
      залито: [...box.children].filter((d) => getComputedStyle(d).backgroundColor.includes('200, 30, 90')).length,
    }
  })
  console.log(`счётчик ${tag}`, JSON.stringify(счёт))
  if (!счёт.видим) bad.push(`${tag}: счётчик не появился после первой находки`)
  if (счёт.справа !== 32 || счёт.снизу !== 32) bad.push(`${tag}: счётчик стоит ${счёт.справа}/${счёт.снизу} вместо 32/32`)
  if (счёт.залито !== 1) bad.push(`${tag}: залит не один кружок, а ${счёт.залито}`)

  await p.screenshot({ path: path.join(OUT, `v11-mesto-${tag}.png`) })
  await c.close()
}

/* --------------------------------------------- финальный кадр на телефоне */
{
  const { c, p } = await открыть('/zapis/', { w: 390, h: 844, m: true })
  await p.screenshot({ path: path.join(OUT, 'v11-zamok-pusto-mobile.png') })
  await p.evaluate(() => document.querySelector('input').focus())
  await p.keyboard.type('1847')
  await p.waitForTimeout(2600)
  await p.screenshot({ path: path.join(OUT, 'v11-final-mobile.png') })
  const моб = await p.evaluate(() => {
    const фраза = [...document.querySelectorAll('span')].find((n) => n.textContent.includes('СКАЖИТЕ НА ВХОДЕ'))
    const r = фраза.getBoundingClientRect()
    return {
      вМакете: r.left >= -0.5 && r.right <= innerWidth + 0.5,
      строк: Math.round(r.height / parseFloat(getComputedStyle(фраза).lineHeight)),
      прокрутка: document.documentElement.scrollWidth > innerWidth,
    }
  })
  console.log('финал мобильный', JSON.stringify(моб))
  if (!моб.вМакете) bad.push('финал: фраза вылезла за экран телефона')
  if (моб.прокрутка) bad.push('финал: на телефоне появилась горизонтальная прокрутка')
  await c.close()
}

/* ------------------------------------------------------------------ дверь */
{
  const { c, p } = await открыть('/zapis/')
  await p.screenshot({ path: path.join(OUT, 'v11-zamok-pusto.png') })

  const поля = await p.$$('input')
  if (поля.length !== 4) bad.push(`замок: полей ${поля.length} вместо четырёх`)

  // клавиатура: перескок фокуса и Backspace назад
  await поля[0].focus()
  await p.keyboard.type('12')
  const фокус = await p.evaluate(() => document.activeElement.getAttribute('aria-label'))
  await p.keyboard.press('Backspace')
  await p.keyboard.press('Backspace')
  const фокусНазад = await p.evaluate(() => document.activeElement.getAttribute('aria-label'))
  console.log('клавиатура', JSON.stringify({ фокус, фокусНазад }))
  if (!/3/.test(фокус ?? '')) bad.push(`замок: после двух цифр фокус на «${фокус}», ждали третье поле`)
  if (!/1/.test(фокусНазад ?? '')) bad.push(`замок: Backspace не вернул фокус в первое поле`)

  // неверный код
  await поля[0].focus()
  await p.keyboard.type('1234')
  await p.waitForTimeout(220)
  await p.screenshot({ path: path.join(OUT, 'v11-zamok-otkaz.png') })
  const отказ = await p.evaluate(() => {
    const el = [...document.querySelectorAll('p')].find((n) => n.textContent.trim() === 'Не сегодня')
    return { виден: +getComputedStyle(el).opacity > 0.5, цвет: getComputedStyle(el).color }
  })
  console.log('отказ', JSON.stringify(отказ))
  if (!отказ.виден) bad.push('замок: строка «Не сегодня» не появилась')
  if (!отказ.цвет.includes('200, 30, 90')) bad.push('замок: строка отказа не малиновая')

  await p.waitForTimeout(1400)
  const очищено = await p.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.value).join(''))
  if (очищено !== '') bad.push(`замок: поля не очистились после отказа — «${очищено}»`)

  // верный код: сначала кадр наплывающей черноты, затем три кадра сборки.
  // Сборка стартует на 0.66 с и идёт ~1.2 с — снимаем внутри неё, а не до.
  await p.evaluate(() => document.querySelector('input').focus())
  await p.keyboard.type('1847')
  const пуск = Date.now()
  const вМомент = async (мс, имя) => {
    const ждать = мс - (Date.now() - пуск)
    if (ждать > 0) await p.waitForTimeout(ждать)
    await p.screenshot({ path: path.join(OUT, `${имя}.png`) })
  }
  await вМомент(450, 'v11-final-chernota')
  await вМомент(850, 'v11-final-sborka-1')
  await вМомент(1200, 'v11-final-sborka-2')
  await вМомент(1600, 'v11-final-sborka-3')
  // выход приходит через 1.2 с от начала сборки: считаем от ввода кода
  await p.waitForTimeout(2600)
  await p.screenshot({ path: path.join(OUT, 'v12-final-s-knopkoy.png') })

  const финал = await p.evaluate(() => {
    const текст = document.body.innerText
    const время = [...document.querySelectorAll('span')].find((n) => n.textContent.trim() === '03:47')
    const фраза = [...document.querySelectorAll('span')].find((n) => n.textContent.includes('СКАЖИТЕ НА ВХОДЕ'))
    const счётчик = document.querySelector('[class*="QuestProgress_progress"]')
    const rВ = время?.getBoundingClientRect()
    const rФ = фраза?.getBoundingClientRect()
    return {
      естьВремя: Boolean(время),
      естьФраза: Boolean(фраза),
      фразаМалиновая: фраза ? getComputedStyle(фраза).color.includes('200, 30, 90') : false,
      воздух: rВ && rФ ? +((rФ.top - rВ.bottom) / innerHeight).toFixed(3) : 0,
      счётчикСкрыт: счётчик ? getComputedStyle(счётчик).visibility === 'hidden' || +getComputedStyle(счётчик).opacity < 0.1 : true,
      есть03: текст.includes('03:47'),
      // постер обязан перекрыть всю обвязку: в центре шапки должен лежать он
      шапкаПеребита: (() => {
        const шапка = document.querySelector('[class*="PageShell_bar"]')
        if (!шапка) return true
        const r = шапка.getBoundingClientRect()
        const верх = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return Boolean(верх?.closest('[class*="Zamok_final"]'))
      })(),
    }
  })
  // выход с финального экрана: приходит позже постера, ведёт на главную
  const кнопка = await p.evaluate(() => {
    const a = document.querySelector('[class*="Zamok_final"] a.pill')
    if (!a) return null
    const cs = getComputedStyle(a)
    return {
      видна: cs.visibility === 'visible' && +cs.opacity > 0.9,
      текст: a.textContent.trim(),
      адрес: a.getAttribute('href'),
      заливка: cs.backgroundColor,
      цвет: cs.color,
      нижеПодписи:
        a.getBoundingClientRect().top >
        [...document.querySelectorAll('[class*="Zamok_note"]')][0].getBoundingClientRect().bottom,
    }
  })
  console.log('выход', JSON.stringify(кнопка))
  if (!кнопка) bad.push('финал: кнопки выхода нет')
  else {
    if (!кнопка.видна) bad.push('финал: кнопка выхода не проявилась')
    if (кнопка.текст !== 'На главную') bad.push(`финал: на кнопке «${кнопка.текст}»`)
    if (!/\/valmontt\/$/.test(кнопка.адрес || '')) bad.push(`финал: кнопка ведёт на ${кнопка.адрес}`)
    if (!кнопка.заливка.includes('255, 255, 255')) bad.push(`финал: заливка кнопки ${кнопка.заливка}, ждали белую`)
    if (!кнопка.нижеПодписи) bad.push('финал: кнопка стоит не под подписью')
  }

  console.log('финал', JSON.stringify(финал))
  if (!финал.естьВремя || !финал.естьФраза) bad.push('финал: не собрался')
  if (!финал.шапкаПеребита) bad.push('финал: меню осталось поверх постера')
  if (!финал.фразаМалиновая) bad.push('финал: фраза не малиновая')
  if (финал.воздух < 0.12) bad.push(`финал: между временем и фразой ${Math.round(финал.воздух * 100)} % вместо 12`)
  if (!финал.счётчикСкрыт) bad.push('финал: счётчик прогресса не исчез')

  await c.close()
}

/* ------------------------------------------- индикатор проезда на /mesto */
{
  const { c, p } = await открыть('/mesto/')
  const геометрия = await p.evaluate(() => {
    const b = document.querySelector('[data-rail-beam]')
    // мерим САМУ ЛИНИЮ: короб выше её на высоту ореола
    const линия = b.querySelector('[data-rail-line]')
    const r = линия.getBoundingClientRect()
    const пятно = b.querySelector('[data-rail-spot]')
    const пр = пятно.getBoundingClientRect()
    const ореол = b.querySelector('[data-rail-halo]')
    return {
      виден: +getComputedStyle(b).opacity > 0.5,
      высота: Math.round(r.height),
      снизу: Math.round(innerHeight - r.bottom),
      воВсюШирину: Math.round(r.width) === innerWidth,
      доляПятна: +(пр.width / innerWidth).toFixed(3),
      ореолВверх: Math.round(ореол.getBoundingClientRect().height),
      надЛинией: ореол.getBoundingClientRect().bottom <= r.top + 0.5,
      линия: getComputedStyle(линия).backgroundColor,
    }
  })
  console.log('индикатор', JSON.stringify(геометрия))
  if (!геометрия.виден) bad.push('индикатор: не виден в начале ленты')
  if (геометрия.высота !== 3) bad.push(`индикатор: высота ${геометрия.высота} вместо 3`)
  if (геометрия.снизу !== 48) bad.push(`индикатор: отступ снизу ${геометрия.снизу} вместо 48`)
  if (!геометрия.воВсюШирину) bad.push('индикатор: не во всю ширину экрана')
  if (Math.abs(геометрия.доляПятна - 0.18) > 0.005) bad.push(`индикатор: пятно ${геометрия.доляПятна} вместо 0.18`)
  if (!геометрия.линия.includes('255, 255, 255') || !геометрия.линия.includes('0.08')) {
    bad.push(`индикатор: линия ${геометрия.линия} вместо белой на 8 %`)
  }
  if (геометрия.ореолВверх !== 12) bad.push(`индикатор: ореол ${геометрия.ореолВверх} px вместо 12`)
  if (!геометрия.надЛинией) bad.push('индикатор: ореол не над линией')

  // три кадра движения пятна
  for (let i = 1; i <= 3; i++) {
    await p.waitForTimeout(i === 1 ? 400 : 700)
    await p.screenshot({
      path: path.join(OUT, `v12-beam-${i}.png`),
      clip: { x: 0, y: 1080 - 120, width: 1920, height: 120 },
    })
  }
  await p.screenshot({ path: path.join(OUT, 'v12-mesto-beam.png') })

  // пятно обязано ехать: два замера подряд дают разный сдвиг
  // Пробег 2.2 с, между пробегами пауза 0.8 с. Мерить двумя точками нельзя:
  // обе могут попасть в паузу. Смотрим размах за полный цикл.
  const едет = await p.evaluate(async () => {
    const м = () =>
      new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-rail-spot]')).transform).m41
    let мин = Infinity
    let макс = -Infinity
    for (let i = 0; i < 70; i++) {
      const v = м()
      мин = Math.min(мин, v)
      макс = Math.max(макс, v)
      await new Promise((r) => setTimeout(r, 50))
    }
    return макс - мин > innerWidth * 0.5
  })
  if (!едет) bad.push('индикатор: пятно стоит на месте')

  // доехали до конца — индикатор уходит
  await p.evaluate(async () => {
    const предел = document.documentElement.scrollHeight - innerHeight
    for (let i = 0; i < 400; i++) {
      scrollTo(0, Math.min(scrollY + 160, предел))
      dispatchEvent(new WheelEvent('wheel', { deltaY: 160 }))
      await new Promise((r) => setTimeout(r, 20))
      if (scrollY >= предел - 1) break
    }
    await new Promise((r) => setTimeout(r, 1500))
  })
  const вКонце = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('[data-rail-beam]'))
    return cs.visibility === 'hidden' || +cs.opacity < 0.1
  })
  if (!вКонце) bad.push('индикатор: не исчез на последнем кадре')

  // прокрутили назад — вернулся
  await p.evaluate(async () => {
    for (let i = 0; i < 400 && scrollY > 0; i++) {
      scrollTo(0, Math.max(0, scrollY - 160))
      dispatchEvent(new WheelEvent('wheel', { deltaY: -160 }))
      await new Promise((r) => setTimeout(r, 20))
    }
    await new Promise((r) => setTimeout(r, 1200))
  })
  const вернулся = await p.evaluate(() => +getComputedStyle(document.querySelector('[data-rail-beam]')).opacity > 0.5)
  if (!вернулся) bad.push('индикатор: не вернулся при прокрутке назад')
  console.log('индикатор ход', JSON.stringify({ едет, вКонце, вернулся }))

  // на телефоне индикатора нет
  await c.close()
  const { c: c2, p: p2 } = await открыть('/mesto/', { w: 390, h: 844, m: true })
  const наТелефоне = await p2.evaluate(() => {
    const b = document.querySelector('[data-rail-beam]')
    return !b || getComputedStyle(b).display === 'none'
  })
  if (!наТелефоне) bad.push('индикатор: показан на телефоне, где лента вертикальная')
  await c2.close()
}

/* ------------------------------------------- бережный режим: без движения */
{
  const c = await b.newContext({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: 'reduce',
  })
  const p = await c.newPage()

  await p.goto(o + '/mesto/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  const маркер = await p.evaluate(() => {
    // цифра теперь только по клику; без движения она обязана появиться
    // за кадр-другой, а не за 0.4 с
    document.querySelector('[data-marker]').click()
    const цифра = document.querySelector('[data-marker] [data-digit]')
    return new Promise((готово) =>
      setTimeout(
        () =>
          готово({
            сразу:
              getComputedStyle(цифра).visibility === 'visible' &&
              +getComputedStyle(цифра).opacity > 0.9,
          }),
        90,
      ),
    )
  })
  console.log('бережно: маркер', JSON.stringify(маркер))
  if (!маркер.сразу) bad.push('бережный режим: цифра раскрылась не мгновенно')

  await p.goto(o + '/zapis/', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  await p.evaluate(() => document.querySelector('input').focus())
  await p.keyboard.type('1234')
  await p.waitForTimeout(300)
  const отказБережно = await p.evaluate(() => ({
    очищено: [...document.querySelectorAll('input')].map((i) => i.value).join('') === '',
    строка: [...document.querySelectorAll('p')].some(
      (n) => n.textContent.trim() === 'Не сегодня' && +getComputedStyle(n).opacity > 0.5,
    ),
  }))
  console.log('бережно: отказ', JSON.stringify(отказБережно))
  if (!отказБережно.очищено) bad.push('бережный режим: поля не очистились сразу')
  if (!отказБережно.строка) bad.push('бережный режим: строка отказа не появилась')

  await p.waitForTimeout(1900)
  await p.evaluate(() => document.querySelector('input').focus())
  await p.keyboard.type('1847')
  await p.waitForTimeout(400)
  const финалБережно = await p.evaluate(() => {
    const фраза = [...document.querySelectorAll('span')].find((n) => n.textContent.includes('СКАЖИТЕ НА ВХОДЕ'))
    if (!фраза) return { собран: false, чисто: false }
    // буквы должны стоять на местах, а не ехать
    const буквы = [...фраза.querySelectorAll('*')].filter((n) => !n.children.length)
    return {
      собран: +getComputedStyle(фраза).opacity > 0.9,
      чисто: буквы.every((n) => {
        const t = getComputedStyle(n).transform
        return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'
      }),
    }
  })
  console.log('бережно: финал', JSON.stringify(финалБережно))
  if (!финалБережно.собран) bad.push('бережный режим: постер не показался')
  if (!финалБережно.чисто) bad.push('бережный режим: буквы постера остались сдвинутыми')
  await p.screenshot({ path: path.join(OUT, 'v11-final-berezhno.png') })
  await c.close()
}

await b.close()
srv.close()
if (bad.length) { console.error('\nПРОБЛЕМЫ:'); bad.forEach((x) => console.error(' •', x)); process.exit(1) }
console.log('\nквест проходится')
