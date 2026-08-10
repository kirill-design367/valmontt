/**
 * ЕДИНСТВЕННОЕ место, где живут пути к изображениям.
 *
 * Чтобы подставить другой снимок — поменяйте `src` на одной строке ниже.
 * Больше ничего править не нужно: компоненты берут кадры только отсюда.
 *
 * Заглушек в реестре больше нет: все кадры настоящие, `pendingAssets()`
 * возвращает пусто.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export type Asset = {
  /** путь от корня сайта, без basePath */
  src: string
  /** описание для alt */
  alt: string
  /** натуральный размер файла — из него считается пропорция кропа */
  w?: number
  h?: number
  /** true — пока заглушка, ждёт настоящий файл */
  todo?: true
}

const a = (src: string, alt: string, w?: number, h?: number): Asset => ({ src, alt, w, h })

/** Пара кадров одной локации: горизонтальный на десктоп, вертикальный на телефон. */
export type Пара = { wide: Asset; tall: Asset }

/** Фактическая пропорция файла — её же браузер использует для кропа. */
export const пропорция = (asset: Asset) => (asset.w && asset.h ? asset.w / asset.h : 1)

export const ASSETS = {
  /* --- боевые кадры ----------------------------------------------------- */
  heroDesktop: a('/valmont-desktop.jpg', 'Хищная птица в три четверти, оперение в малине и бирюзе'),
  heroMobile: a('/valmont-mobile.jpg', 'Хищная птица, крупный план глаза'),

  /** кроп глаза для финального блока — вырезан из той же подложки */
  porogEye: a('/porog-eye.jpg', 'Глаз птицы крупным планом'),

  /* Размытые копии подложки для стекла линзы. Размытие испечено в файл
     (scripts/make-glass.py), в браузере фильтров нет — см. CLAUDE.md. */
  heroDesktopGlass: a('/valmont-desktop-glass.jpg', ''),
  heroMobileGlass: a('/valmont-mobile-glass.jpg', ''),
  /* Обратная сторона панели показывает всё зеркально — для неё отражённые. */
  heroDesktopGlassMirror: a('/valmont-desktop-glass-mirror.jpg', ''),
  heroMobileGlassMirror: a('/valmont-mobile-glass-mirror.jpg', ''),

  /* --- место: четыре локации, по два кадра на каждую ---------------------
     Пропорции у присланных файлов НЕ номинальные: 1.792 у горизонтальных
     против 1.778 у шестнадцати к девяти и 0.558 у вертикальных против
     0.5625. Кроп в браузере считается от фактических чисел — они лежат
     тут же, в `w` и `h`, и уходят в CSS как `--ar`. */
  placeDorogaWide: a('/place/doroga-wide.jpg', 'Горная дорога ночью, свет фар из-за поворота', 2048, 1143),
  placeDorogaTall: a('/place/doroga-tall.jpg', 'Горная дорога ночью, фары вдалеке', 1080, 1935),
  placeVorotaWide: a('/place/vorota-wide.jpg', 'Кованые ворота в каменной стене, фонарь над ними', 2048, 1143),
  placeVorotaTall: a('/place/vorota-tall.jpg', 'Кованые ворота под снегом, фонарь над ними', 1080, 1935),
  placeZalWide: a('/place/zal-wide.jpg', 'Пустой зал, косой луч света на паркете', 2048, 1143),
  placeZalTall: a('/place/zal-tall.jpg', 'Пустой зал, свет из окон вдоль стены', 1080, 1935),
  placeTerrasaWide: a('/place/terrasa-wide.jpg', 'Каменная терраса над горами, перила в снегу', 2048, 1143),
  placeTerrasaTall: a('/place/terrasa-tall.jpg', 'Каменная балюстрада террасы, стакан на перилах', 1080, 1935),
} as const

/** Полный URL с учётом basePath — им пользуются компоненты. */
export const url = (asset: Asset) => `${BASE}${asset.src}`

/** Сколько кадров ещё ждут замены — печатается в сборке. */
export const pendingAssets = () =>
  Object.entries(ASSETS)
    .filter(([, v]) => v.todo)
    .map(([k]) => k)

/** Пути ко всем трём форматам одного кадра. */
export const formats = (asset: Asset) => {
  const base = `${BASE}${asset.src}`.replace(/\.jpg$/, '')
  return { avif: `${base}.avif`, webp: `${base}.webp`, jpg: `${BASE}${asset.src}` }
}
