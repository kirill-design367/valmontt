/**
 * Что осталось от прежних версий.
 *
 * Три вопроса: какие классы CSS-модулей не упоминаются ни в одном tsx,
 * какие файлы в проекте никто не импортирует, какие картинки в public не
 * встречаются ни в коде, ни в собранном HTML.
 */
import fs from 'node:fs'
import path from 'node:path'

const корень = process.cwd()
const пропустить = new Set(['node_modules', '.next', 'out', '.git', 'shots', 'source'])

const обойти = (дир, итог = []) => {
  for (const имя of fs.readdirSync(дир)) {
    if (пропустить.has(имя)) continue
    const п = path.join(дир, имя)
    const st = fs.statSync(п)
    if (st.isDirectory()) обойти(п, итог)
    else итог.push(п)
  }
  return итог
}

const файлы = обойти(корень)
const код = файлы.filter((f) => /\.(tsx|ts|mjs|js)$/.test(f) && !f.includes(`${path.sep}scripts${path.sep}`))
const весьТекст = код.map((f) => fs.readFileSync(f, 'utf8')).join('\n')

/* ---------------------------------------------- неиспользуемые классы CSS */
console.log('── классы CSS-модулей, которых нет в разметке ──')
let мёртвыхКлассов = 0
for (const css of файлы.filter((f) => f.endsWith('.module.css'))) {
  const текст = fs.readFileSync(css, 'utf8')
  const классы = [...new Set([...текст.matchAll(/^\.([A-Za-z][\w-]*)/gm)].map((m) => m[1]))]
  // рядом лежащий компонент плюс всё остальное — класс может использоваться где угодно
  const мёртвые = классы.filter((k) => {
    const прямо = new RegExp(`[sS]\\.${k}\\b`)
    const строкой = new RegExp(`['"\`]${k}['"\`]`)
    const вклассе = new RegExp(`\\bstyles\\.${k}\\b`)
    return !прямо.test(весьТекст) && !строкой.test(весьТекст) && !вклассе.test(весьТекст)
  })
  if (мёртвые.length) {
    console.log(`  ${path.relative(корень, css)}: ${мёртвые.join(', ')}`)
    мёртвыхКлассов += мёртвые.length
  }
}
if (!мёртвыхКлассов) console.log('  нет')

/* ----------------------------------------------- файлы, которые не нужны */
console.log('\n── модули, которые никто не импортирует ──')
const модули = код.filter(
  (f) => f.includes(`${path.sep}components${path.sep}`) || f.includes(`${path.sep}lib${path.sep}`),
)
let сирот = 0
for (const м of модули) {
  const имя = path.basename(м).replace(/\.(tsx|ts)$/, '')
  const шаблон = new RegExp(`from ['"][^'"]*${имя}['"]|import\\(['"][^'"]*${имя}['"]`)
  const ссылаются = код.filter((f) => f !== м && шаблон.test(fs.readFileSync(f, 'utf8')))
  if (!ссылаются.length) {
    console.log(`  ${path.relative(корень, м)}`)
    сирот++
  }
}
if (!сирот) console.log('  нет')

/* ------------------------------------------------ картинки, которые никому */
console.log('\n── файлы в public, на которые никто не ссылается ──')
const собран = fs.existsSync(path.join(корень, 'out'))
  ? обойти(path.join(корень, 'out').replace(корень, корень)).length
  : 0
const html = fs.existsSync('out')
  ? fs
      .readdirSync('out', { recursive: true })
      .filter((f) => String(f).endsWith('.html'))
      .map((f) => fs.readFileSync(path.join('out', String(f)), 'utf8'))
      .join('\n')
  : ''
const css = fs.existsSync('out/_next/static/css')
  ? fs
      .readdirSync('out/_next/static/css')
      .map((f) => fs.readFileSync(path.join('out/_next/static/css', f), 'utf8'))
      .join('\n')
  : ''
const js = fs.existsSync('out/_next/static/chunks')
  ? fs
      .readdirSync('out/_next/static/chunks', { recursive: true })
      .filter((f) => String(f).endsWith('.js'))
      .map((f) => fs.readFileSync(path.join('out/_next/static/chunks', String(f)), 'utf8'))
      .join('\n')
  : ''
const всёСобранное = html + css + js + весьТекст

let ничьих = 0
let ничьихБайт = 0
const публик = обойти(path.join(корень, 'public'))
for (const f of публик) {
  const имя = path.basename(f)
  if (!всёСобранное.includes(имя)) {
    const размер = fs.statSync(f).size
    console.log(`  ${path.relative(корень, f)}  ${(размер / 1024).toFixed(0)} КБ`)
    ничьих++
    ничьихБайт += размер
  }
}
if (!ничьих) console.log('  нет')
else console.log(`  итого ${ничьих} файл(ов), ${(ничьихБайт / 1024 / 1024).toFixed(2)} МБ`)

/* -------------------------------------------- шрифты в корне репозитория */
console.log('\n── woff2 в корне, не подключённые в коде ──')
const корневыеШрифты = fs.readdirSync(корень).filter((f) => f.endsWith('.woff2'))
const лишние = корневыеШрифты.filter((f) => !всёСобранное.includes(f))
console.log(лишние.length ? '  ' + лишние.join('\n  ') : '  нет')
