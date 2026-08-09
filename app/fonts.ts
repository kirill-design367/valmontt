import { Onest, Golos_Text, Geologica } from 'next/font/google'

/**
 * Three shortlisted Cyrillic grotesques. Every one was checked against its own
 * binary (see scripts/audit-fonts.py) — full А–Я/а–я plus Ё, not a Latin face
 * with a bolted-on Cyrillic.
 *
 * `--font-display` is what the hero actually uses. Point it at another face to
 * change the whole composition.
 */
export const onest = Onest({
  subsets: ['cyrillic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-onest',
  display: 'swap',
  preload: true,
})

export const golos = Golos_Text({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-golos',
  display: 'swap',
  preload: false,
})

export const geologica = Geologica({
  subsets: ['cyrillic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-geologica',
  display: 'swap',
  preload: false,
})

export const fontVars = [onest.variable, golos.variable, geologica.variable].join(' ')

export const FONT_SHORTLIST = [
  {
    id: 'onest',
    name: 'Onest',
    varName: '--font-onest',
    weights: 7,
    axis: '100–900',
    role: 'Рабочий вариант',
    note:
      'Геометрический гротеск, у которого кириллица не адаптация, а исходный набор: ' +
      'рисовалась вместе с латиницей, а не после неё. Ж собрана из двух зеркальных ' +
      'диагоналей без каллиграфических утолщений, Ф — чистая окружность на стволе, ' +
      'у Щ короткий прямой хвост, не выезжающий в декор. На 100 px круглые О и С ' +
      'держат форму, а плотные М и Н дают ту самую «уверенную» массу. Девять ' +
      'начертаний — от 100 до 900.',
  },
  {
    id: 'golos',
    name: 'Golos Text',
    varName: '--font-golos',
    weights: 6,
    axis: '400–900',
    role: 'Самый нейтральный',
    note:
      'Неогротеск «Паратайпа», спроектированный под русский текст в первую очередь. ' +
      'Самая спокойная из трёх кириллица: у Л прямая левая стойка вместо диагонали, ' +
      'Ж строго симметрична, Ъ и Ы не разъезжаются в крупном кегле. Ощущение — ' +
      'государственная табличка в хорошем смысле: ни одной лишней ноты. Шесть ' +
      'начертаний, 400–900 — верхняя часть диапазона как раз то, что нужно вордмарку.',
  },
  {
    id: 'geologica',
    name: 'Geologica',
    varName: '--font-geologica',
    weights: 7,
    axis: '100–900',
    role: 'Самый холодный',
    note:
      'Неогротеск с более узкими пропорциями и закрытыми апертурами — набор идёт ' +
      'плотнее, вертикальный вордмарк собирается в более тугой столбец. Диагонали ' +
      'Ж и Я прямые, без скруглений; О заметно уже, чем у Onest, что даёт альпийскую ' +
      'сухость вместо тепла. Берите, если ВАЛЬМОНТ должен читаться как гравировка ' +
      'на металле, а не как вывеска отеля.',
  },
] as const
