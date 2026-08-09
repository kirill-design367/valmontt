import localFont from 'next/font/local'
import { Onest } from 'next/font/google'

/**
 * Пара на проект: акцидентный на вордмарк и крупные заголовки, нейтральный
 * гротеск на интерфейс и текст.
 *
 * Подмножества — `cyrillic` + `latin`. Только кириллицы мало: цифры (21:00,
 * 14 ФЕВРАЛЯ) и базовая пунктуация лежат в латинском подмножестве Google.
 *
 * Веса режем по ролям, а не «на всякий случай»: каждый лишний вес — это
 * отдельный woff2 в выдаче.
 */

/* ---- рабочая пара: грузится на всём сайте ------------------------------ */

/**
 * Pilar Regular, CSTM Fonts / type.today. Локальный файл, не CDN.
 * Сабсет — кириллица + цифры + базовая пунктуация (scripts/subset-pilar.py),
 * 45 КБ вместо 341, стилистические наборы ss01–ss03 сохранены.
 *
 * НАЧЕРТАНИЕ ОДНО. Никакого 700/800: синтетический жир запрещён глобально
 * (`font-synthesis-weight: none`), поэтому везде, где стоит акцидентный,
 * вес обязан быть 400. Массу набираем кеглем и трекингом, а не весом.
 */
export const display = localFont({
  src: [{ path: '../public/fonts/pilar-regular.woff2', weight: '400', style: 'normal' }],
  variable: '--font-display-src',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})

export const text = Onest({
  subsets: ['cyrillic', 'latin'],
  weight: ['300', '400', '500'],
  variable: '--font-text-src',
  display: 'swap',
  preload: false,
})

export const fontVars = [display.variable, text.variable].join(' ')
export const specimenVars = ''

/** Стилистические наборы, найденные в самом файле. */
export const STYLE_SETS = [
  { id: 'default', tag: '—', title: 'Как есть', note: 'Базовый рисунок, без подмен.' },
  { id: 'ss01', tag: 'ss01', title: 'Набор ss01', note: 'Первый альтернативный набор из файла.' },
  { id: 'ss02', tag: 'ss02', title: 'Набор ss02', note: 'Второй альтернативный набор из файла.' },
  { id: 'ss03', tag: 'ss03', title: 'Набор ss03', note: 'Третий альтернативный набор из файла.' },
] as const

