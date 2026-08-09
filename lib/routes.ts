/** Пять маршрутов сайта. Отсюда же берутся имена для шторы перехода. */
export const ROUTES = [
  { href: '/', label: 'ГЛАВНАЯ', curtain: 'ВАЛЬМОНТ' },
  { href: '/programma', label: 'ПРОГРАММА', curtain: 'ПРОГРАММА' },
  { href: '/gosti', label: 'ГОСТИ', curtain: 'ГОСТИ' },
  { href: '/mesto', label: 'МЕСТО', curtain: 'МЕСТО' },
  { href: '/zapis', label: 'ЗАПИСЬ', curtain: 'ЗАПИСЬ' },
] as const

/** Пункты, которые показывает навигация hero — без «Главной». */
export const MENU = ROUTES.filter((r) => r.href !== '/')

export const curtainNameFor = (pathname: string) => {
  const clean = '/' + pathname.replace(/^\/+|\/+$/g, '').split('/').pop()
  return ROUTES.find((r) => r.href === clean)?.curtain ?? 'ВАЛЬМОНТ'
}
