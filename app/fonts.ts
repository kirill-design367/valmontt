import { Onest, Geologica, Inter, Oswald, Golos_Text } from 'next/font/google'

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

/* Unbounded снят: в вертикали разъезжался хуже прежнего. Пока акцидентная
   роль возвращена Onest — это рабочее состояние, а не финальное решение;
   кандидаты на замену собраны на /fonts. */
export const display = Onest({
  subsets: ['cyrillic', 'latin'],
  weight: ['700', '800'],
  variable: '--font-display-src',
  display: 'swap',
  preload: true,
})

export const text = Onest({
  subsets: ['cyrillic', 'latin'],
  weight: ['300', '400', '500'],
  variable: '--font-text-src',
  display: 'swap',
  // намеренно без preload: текстовая гарнитура работает в 11–15 px, подмена
  // на системный гротеск там не читается, а восемь preload-шрифтов отбирают
  // канал у подложки, которая и есть LCP
  preload: false,
})

export const fontVars = [display.variable, text.variable].join(' ')

/* ---- кандидаты: подключаются только на /fonts -------------------------- */

const geologica = Geologica({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '800'],
  variable: '--font-geologica',
  display: 'swap',
  preload: false,
})

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['300', '500'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

const oswald = Oswald({
  subsets: ['cyrillic', 'latin'],
  weight: ['500', '600'],
  variable: '--font-oswald',
  display: 'swap',
  preload: false,
})

const golos = Golos_Text({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500'],
  variable: '--font-golos',
  display: 'swap',
  preload: false,
})

export const specimenVars = [
  geologica.variable,
  inter.variable,
  oswald.variable,
  golos.variable,
].join(' ')

export type Pair = {
  id: string
  title: string
  role: string
  displayVar: string
  textVar: string
  displayWeight: number
  /** во сколько раз кегль вордмарка отличается от рабочего */
  wordmarkScale: number
  note: string
}

export type Candidate = {
  id: string
  name: string
  foundry: string
  url: string
  price: string
  /** проверена ли кириллица по таблице cmap в самом бинарнике */
  cmapChecked: boolean
  /** чем набирается образец, пока файла нет */
  fallbackVar: string
  fallbackWeight: number
  wordmarkScale: number
  note: string
}

export const CANDIDATES: Candidate[] = [
  {
    id: 'cofo-sans',
    name: 'CoFo Sans',
    foundry: 'Contrast Foundry',
    url: 'https://contrastfoundry.com/typefaces/cofo-sans',
    price: '≈ 60 € начертание, семья ≈ 300 €',
    cmapChecked: false,
    fallbackVar: '--font-inter',
    fallbackWeight: 700,
    wordmarkScale: 1,
    note:
      'Гротеск, у которого кириллица — исходный набор, а не расширение: студия ' +
      'русская, латиница рисовалась второй. Прописные широкие и с ровными ' +
      'стойками, диагонали Ж строго прямые и сходятся в одну точку — при ' +
      'повороте на 90° это главное, потому что косые стыки на боку читаются ' +
      'как излом. Ъ с короткой прямой полкой, Щ с хвостом внутри габарита, ' +
      'а не свисающим. Характер строгий, ближе к швейцарскому, чем к ' +
      'геометрическому: рядом с Onest на интерфейсе не спорит, а старше его ' +
      'на полтона.',
  },
  {
    id: 'formular',
    name: 'Formular',
    foundry: 'Brownfox',
    url: 'https://brownfox.org/fonts/formular',
    price: '≈ 65 $ начертание, семья ≈ 350 $',
    cmapChecked: false,
    fallbackVar: '--font-geologica',
    fallbackWeight: 800,
    wordmarkScale: 1.04,
    note:
      'Неогротеск с очень спокойным ритмом и почти одинаковой шириной ' +
      'прописных — в вертикальном столбце это даёт ровный шаг без провалов, ' +
      'та самая проблема, на которой сыпался Unbounded. Ж симметрична и ' +
      'компактна, Ф — окружность на сквозном стволе без утолщений, Щ и Ъ ' +
      'вписаны в общую ширину, поэтому повёрнутые не заваливаются. Не ' +
      'декоративный совсем: держится на пропорциях, а не на приёме. Восемь ' +
      'начертаний, есть узкие — но узкие нам не нужны, берём обычные.',
  },
  {
    id: 'kazimir-sans',
    name: 'Pilar',
    foundry: 'type.today (CSTM Fonts)',
    url: 'https://type.today/ru/pilar',
    price: '≈ 4 000 ₽ начертание, семья ≈ 20 000 ₽',
    cmapChecked: false,
    fallbackVar: '--font-golos',
    fallbackWeight: 500,
    wordmarkScale: 1.08,
    note:
      'Самый «характерный» из трёх и единственный, у кого крупный кегль — ' +
      'прямое назначение, а не побочная возможность. Стойки чуть тяжелее ' +
      'соединений, поэтому в 100 px+ буква не выглядит нарисованной по ' +
      'сетке; при этом ни одной каллиграфической детали. Ж собрана из трёх ' +
      'элементов с прямыми диагоналями, Ъ короткий, Щ с ровным хвостом. ' +
      'Риск: он заметнее Onest, и если интерфейс когда-нибудь подрастёт в ' +
      'кегле, пара начнёт спорить. Для вордмарка и только для него — лучший.',
  },
]

export const PAIRS: Pair[] = [
  {
    id: 'unbounded-onest',
    title: 'Unbounded × Onest',
    role: 'Рабочая пара',
    displayVar: '--font-display-src',
    textVar: '--font-text-src',
    displayWeight: 800,
    wordmarkScale: 1,
    note:
      'Unbounded — геометрический дисплей с очень широкой проводкой и почти ' +
      'круглыми О: в кегле 130 px он держит форму лучше любого текстового ' +
      'гротеска, потому что рисовался именно под такой размер. Кириллица ' +
      'построена, а не адаптирована: Ж собрана из трёх самостоятельных ' +
      'элементов, Ф — окружность на сквозном стволе, Ъ и Щ не заваливаются ' +
      'вбок при повороте на 90°. Onest рядом молчит: нейтральный, узкий, ' +
      'девять начертаний, ровно читается в 11 px с трекингом 0.28em. Контраст ' +
      'ширины между парой сильнее контраста веса — вордмарк и интерфейс не ' +
      'спорят, а работают на разных этажах.',
  },
  {
    id: 'geologica-inter',
    title: 'Geologica × Inter',
    role: 'Холодная',
    displayVar: '--font-geologica',
    textVar: '--font-inter',
    displayWeight: 800,
    wordmarkScale: 1.12,
    note:
      'Geologica — неогротеск с закрытыми апертурами и прямыми диагоналями: ' +
      'столбец вордмарка собирается туже, слово читается как гравировка на ' +
      'металле, а не как вывеска. Ъ здесь самый аккуратный из всех ' +
      'кандидатов — три контура, ровная петля, в вертикали не разъезжается. ' +
      'Inter — самый нейтральный кириллический гротеск, какой вообще есть: ' +
      'он не добавляет характера, и это ровно то, что нужно под ' +
      'акцидентным. Пара самая сухая из трёх; берите, если ВАЛЬМОНТ должен ' +
      'звучать как протокол, а не как приглашение.',
  },
  {
    id: 'oswald-golos',
    title: 'Oswald × Golos Text',
    role: 'Узкая',
    displayVar: '--font-oswald',
    textVar: '--font-golos',
    displayWeight: 600,
    wordmarkScale: 1.42,
    note:
      'Oswald — единственный узкий кандидат, и в вертикали это меняет всё: ' +
      'повёрнутая литера занимает по высоте свою ширину, поэтому столбец из ' +
      'восьми знаков выходит плотным и требует кегля почти в полтора раза ' +
      'крупнее — буквы становятся физически больше при той же длине слова. ' +
      'Прописные высокие (cap/upm 0.81), рисунок строгий, без каллиграфии. ' +
      'Golos Text — неогротеск «Паратайпа» под русский текст: у Л прямая ' +
      'стойка, Ж строго симметрична. Самая «русская» пара и самая плотная ' +
      'по кадру; минус — узкий Oswald теряет массу на светлом фоне.',
  },
]
