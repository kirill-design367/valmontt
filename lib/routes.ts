/** Пять маршрутов сайта. Отсюда же берутся имена для шторы перехода. */
export const ROUTES = [
  { href: '/', label: 'ГЛАВНАЯ', curtain: 'ВАЛЬМОНТ' },
  { href: '/programma', label: 'ПРОГРАММА', curtain: 'ПРОГРАММА' },
  // адреса не трогаем, чтобы не ломать ссылки: /gosti и /zapis остались,
  // сменились только подписи
  { href: '/gosti', label: 'ВХОД', curtain: 'ВХОД' },
  { href: '/mesto', label: 'МЕСТО', curtain: 'МЕСТО' },
  { href: '/zapis', label: 'ПРИГЛАШЕНИЕ', curtain: 'ПРИГЛАШЕНИЕ' },
] as const

/** Пункты, которые показывает навигация hero — без «Главной». */
export const MENU = ROUTES.filter((r) => r.href !== '/')

export const curtainNameFor = (pathname: string) => {
  const clean = '/' + pathname.replace(/^\/+|\/+$/g, '').split('/').pop()
  return ROUTES.find((r) => r.href === clean)?.curtain ?? 'ВАЛЬМОНТ'
}
