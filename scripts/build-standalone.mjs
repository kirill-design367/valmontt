/**
 * Собирает кадр в одну самодостаточную HTML-страницу: разметка и стили берутся
 * из настоящего экспорта (out/), поэтому превью не может разойтись с проектом.
 * Шрифты, снимки и GSAP вшиваются как data-URI — внешних запросов нет.
 *
 *   npm run build && node scripts/build-standalone.mjs [выходной-файл]
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('out')
const BASE = '/valmontt'
const route = process.argv[2] ?? '/'
const dest = path.resolve(
  process.argv[3] ?? `standalone/valmont${route === '/' ? '-hero' : route.replace(/\//g, '-').replace(/-$/, '')}.html`,
)

const read = (p) => fs.readFileSync(path.join(OUT, p.replace(BASE, '')))
const dataUri = (p, mime) => `data:${mime};base64,${read(p).toString('base64')}`

const html = fs.readFileSync(path.join(OUT, route, 'index.html'), 'utf8')

// берём всё тело страницы и снимаем то, что превью не нужно:
// гидратацию Next и ссылки на внешние стили — их мы вшиваем сами
const main = (html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '')
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<link[^>]*>/g, '')
  .trim()
if (!main) throw new Error(`в экспорте нет тела страницы ${route}`)

// стили ровно те же, что отдаёт прод
let css = [...html.matchAll(/href="([^"]+\.css)"/g)]
  .map((m) => read(m[1]).toString('utf8'))
  .join('\n')

/* next/font выкладывает каждый вес × каждое подмножество отдельным файлом —
   97 начертаний на три семейства. В превью нужен только Onest в кириллице и
   латинице и только те веса, которыми набран кадр; остальные @font-face
   выбрасываем целиком, иначе страница весит пять мегабайт. */
const KEEP_FAMILIES =
  route === '/' ? new Set(['Onest']) : new Set(['Onest', 'Golos Text', 'Geologica'])
const KEEP_WEIGHTS = new Set(['300', '400', '500', '700', '800'])
const CYRILLIC = 'U+301,U+400-45F' // кириллица
const LATIN = 'U+??' // базовая латиница

let kept = 0
css = css.replace(/@font-face\{[^}]*\}/g, (face) => {
  const family = (face.match(/font-family:([^;}]+)/) || [])[1]?.trim()
  const weight = (face.match(/font-weight:(\d+)/) || [])[1]
  const range = (face.match(/unicode-range:([^;}]+)/) || [])[1] ?? ''
  const wanted =
    KEEP_FAMILIES.has(family) &&
    KEEP_WEIGHTS.has(weight) &&
    (range.startsWith(CYRILLIC) || range.startsWith(LATIN))
  if (!wanted) return family?.endsWith('Fallback') ? face : ''
  kept++
  return face
})

// оставшиеся — внутрь страницы
css = css.replace(/url\((\/valmontt\/_next\/static\/media\/[^)]+\.woff2)\)/g, (_, u) =>
  `url(${dataUri(u, 'font/woff2')})`,
)
console.log(`шрифтов вшито: ${kept} из 97`)

// снимки внутрь (в том числе кропы аватарок в inline-стилях)
const desktopUri = dataUri(`${BASE}/valmont-desktop.jpg`, 'image/jpeg')
const mobileUri = dataUri(`${BASE}/valmont-mobile.jpg`, 'image/jpeg')

// Снимок встречается шесть раз (фон + четыре аватарки + мобильный source).
// Кладём его в переменную один раз, иначе страница раздувается вшестеро.
let body = main
  .split(`url(${BASE}/valmont-desktop.jpg)`).join('var(--plate-desktop)')
  .split(`${BASE}/valmont-desktop.jpg`).join(desktopUri)
  .split(`${BASE}/valmont-mobile.jpg`).join(mobileUri)

css += `\n:root{--plate-desktop:url(${desktopUri})}\n`

const gsapSrc = fs.readFileSync(
  path.resolve('node_modules/gsap/dist/gsap.min.js'),
  'utf8',
)

/* Тот же сценарий, что в lib/motion.ts и lib/stage.ts, без сборщика. */
const motion = `
(() => {
  const scope = document.querySelector('main')
  if (!scope || !window.gsap) return
  const q = (s) => Array.from(scope.querySelectorAll(s))
  const EYE = {
    desktop: { x: 0.587, y: 0.238, aspect: 16 / 9 },
    mobile: { x: 0.505, y: 0.232, aspect: 9 / 16 },
  }
  const mq = matchMedia('(max-width: 767px)')

  function anchors() {
    const eye = mq.matches ? EYE.mobile : EYE.desktop
    const vw = scope.clientWidth
    const vh = scope.clientHeight
    let r
    if (vw / vh > eye.aspect) r = { x: 0, y: (vh - vw / eye.aspect) / 2, w: vw, h: vw / eye.aspect }
    else r = { x: (vw - vh * eye.aspect) / 2, y: 0, w: vh * eye.aspect, h: vh }
    scope.style.setProperty('--eye-x', (r.x + eye.x * r.w).toFixed(2) + 'px')
    scope.style.setProperty('--eye-y', (r.y + eye.y * r.h).toFixed(2) + 'px')
  }
  anchors()
  addEventListener('resize', anchors, { passive: true })
  mq.addEventListener('change', anchors)

  const mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onComplete: () => gsap.set('[data-entry-ghost]', { display: 'none' }),
    })
    tl.set(scope, { autoAlpha: 1 })
      .fromTo('[data-bg-image]', { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.7, ease: 'power2.out' }, 0)
      .fromTo('[data-wordmark-slide]', { yPercent: 12 }, { yPercent: 0, duration: 1.5 }, 0.3)
      .fromTo('[data-wordmark]', { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power2.out' }, 0.3)
      .fromTo('[data-entry-ghost]', { opacity: 0.9 }, { opacity: 0, duration: 1.3, ease: 'power2.out' }, 0.3)
      .fromTo('[data-bloom]', { opacity: 0 }, {
        opacity: (i, el) => (el.dataset.bloom === 'far' ? 0.62 : 0.85),
        duration: 1.4, stagger: 0.18, ease: 'power2.out',
      }, 0.6)
      .fromTo('[data-line]', { yPercent: 108 }, { yPercent: 0, duration: 1.05, stagger: 0.08, ease: 'power4.out' }, 0.5)
      .fromTo('[data-late]', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.05 }, 1.25)

    const img = scope.querySelector('[data-bg-image]')
    const ready = img && img.decode ? img.decode().catch(() => {}) : Promise.resolve()
    Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(() => tl.play())

    const lens = scope.querySelector('[data-lens]')
    if (lens) gsap.to(lens, { scale: 1.016, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 50%' })

    const setters = [
      ...q('[data-parallax="bg"]').map((el) => ({ el, depth: 15 })),
      ...q('[data-parallax="fg"]').map((el) => ({ el, depth: 12 })),
      ...q('[data-parallax="mid"]').map((el) => ({ el, depth: 8 })),
      ...q('[data-parallax="ui"]').map((el) => ({ el, depth: 4 })),
    ].map(({ el, depth }) => ({
      depth,
      x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3' }),
    }))

    const move = (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1
      const ny = (e.clientY / innerHeight) * 2 - 1
      for (const s of setters) { s.x(-nx * s.depth); s.y(-ny * s.depth * 0.55) }
    }
    const leave = () => { for (const s of setters) { s.x(0); s.y(0) } }
    addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  })

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(scope, { autoAlpha: 1 })
    gsap.set('[data-bg-image]', { scale: 1, opacity: 1 })
    gsap.set('[data-wordmark-slide]', { yPercent: 0 })
    gsap.set('[data-wordmark]', { opacity: 1 })
    gsap.set('[data-entry-ghost]', { display: 'none' })
    gsap.set('[data-bloom]', { opacity: (i, el) => (el.dataset.bloom === 'far' ? 0.62 : 0.85) })
    gsap.set('[data-line]', { yPercent: 0 })
    gsap.set('[data-late]', { y: 0, opacity: 1 })
  })

  const pill = scope.querySelector('button[class*="pill"]')
  if (pill && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const s = gsap.quickTo(pill, 'scale', { duration: 0.5, ease: 'power3.out' })
    const g = gsap.quickTo(pill, '--pill-glow', { duration: 0.5, ease: 'power3.out' })
    pill.addEventListener('pointerenter', () => { s(1.045); g(1) })
    pill.addEventListener('pointerleave', () => { s(1); g(0) })
  }
})()
`

const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'ВАЛЬМОНТ'

const page = `<title>${title}</title>
<style>
/* превью живёт в iframe — гасим прокрутку так же, как на боевой странице */
html, body { height: 100%; background: #07070a; }
html, body { overflow: ${route === '/' ? 'hidden' : 'auto'}; }
${css}
</style>
${body}
<script>${gsapSrc}</script>
<script>${motion}</script>
`

fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, page)
console.log(`${dest}  ${(page.length / 1024 / 1024).toFixed(2)} МБ`)
