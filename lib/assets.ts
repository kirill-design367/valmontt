/**
 * ЕДИНСТВЕННОЕ место, где живут пути к изображениям.
 *
 * Чтобы подставить настоящий снимок вместо заглушки — поменяйте `src`
 * на одну строку ниже и снимите `todo`. Больше ничего править не нужно:
 * компоненты берут кадры только отсюда.
 *
 * Заглушки — кропы настоящего грифона, затемнённые на 30 %
 * (см. scripts/prepare-assets.py): композиция читается, но видно, что это
 * временный кадр.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export type Asset = {
  /** путь от корня сайта, без basePath */
  src: string
  /** описание для alt */
  alt: string
  /** true — пока заглушка, ждёт настоящий файл */
  todo?: true
}

const a = (src: string, alt: string, todo?: true): Asset => ({ src, alt, todo })

export const ASSETS = {
  /* --- боевые кадры ----------------------------------------------------- */
  heroDesktop: a('/valmont-desktop.jpg', 'Грифон — герб Вальмонта, орлиная голова в три четверти'),
  heroMobile: a('/valmont-mobile.jpg', 'Грифон — герб Вальмонта, крупный план глаза'),

  /** кроп глаза для финального блока — вырезан из той же подложки */
  porogEye: a('/porog-eye.jpg', 'Глаз грифона крупным планом'),

  /* Размытые копии подложки для стекла линзы. Размытие испечено в файл
     (scripts/make-glass.py), в браузере фильтров нет — см. CLAUDE.md. */
  heroDesktopGlass: a('/valmont-desktop-glass.jpg', ''),
  heroMobileGlass: a('/valmont-mobile-glass.jpg', ''),
  /* Обратная сторона панели показывает всё зеркально — для неё отражённые. */
  heroDesktopGlassMirror: a('/valmont-desktop-glass-mirror.jpg', ''),
  heroMobileGlassMirror: a('/valmont-mobile-glass-mirror.jpg', ''),

  /* --- бестиарий -------------------------------------------------------- */
  beastGrifon: a('/valmont-desktop.jpg', 'Грифон: орлиная голова, перья малины и бирюзы в потемневшей бронзе'),
  beastViverna: a('/placeholder/beast-viverna.jpg', 'Виверна — временный кадр', true),
  beastLamassu: a('/placeholder/beast-lamassu.jpg', 'Ламассу — временный кадр', true),
  beastKatoblepas: a('/placeholder/beast-katoblepas.jpg', 'Катоблепас — временный кадр', true),

  /* --- место ------------------------------------------------------------ */
  placeDoroga: a('/placeholder/place-doroga.jpg', 'Дорога к Вальмонту — временный кадр', true),
  placeVorota: a('/placeholder/place-vorota.jpg', 'Ворота Вальмонта — временный кадр', true),
  placeZal: a('/placeholder/place-zal.jpg', 'Верхний зал — временный кадр', true),
  placeTerrasa: a('/placeholder/place-terrasa.jpg', 'Терраса — временный кадр', true),
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
