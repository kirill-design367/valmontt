'use client'

import { usePathname } from 'next/navigation'
import AppLink from './AppLink'
import { MENU } from '@/lib/routes'
import s from './PageShell.module.css'

/**
 * Рама внутренней страницы. Титул набирается вертикально вдоль правого края —
 * тот же приём, что вордмарк в hero, и он повторяется на каждой странице.
 */
export default function PageShell({
  title,
  children,
  className,
  bare = false,
}: {
  title: string
  children: React.ReactNode
  className?: string
  /** полноэкранная страница: рама не добавляет отступов */
  bare?: boolean
}) {
  const pathname = usePathname()
  const here = '/' + pathname.replace(/^\/+|\/+$/g, '')

  return (
    <main className={`${s.page} ${className ?? ''}`}>
      <nav className={s.bar} aria-label="Разделы">
        <AppLink className={s.back} href="/">
          <svg width="16" height="9" viewBox="0 0 16 9" fill="none" aria-hidden="true">
            <path
              d="M15 4.5H1M1 4.5L4.6 1M1 4.5 4.6 8"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          ВАЛЬМОНТ
        </AppLink>

        <ul className={s.crumbs}>
          {MENU.map((item) => (
            <li key={item.href}>
              <AppLink
                href={item.href}
                aria-current={here === item.href ? 'page' : undefined}
              >
                {item.label}
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>

      <span className={s.title} aria-hidden="true">
        {title}
      </span>

      <div className={bare ? s.bareBody : s.body}>{children}</div>
    </main>
  )
}
