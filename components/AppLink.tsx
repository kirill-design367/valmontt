'use client'

import Link from 'next/link'
import { useNavigate } from './SiteChrome'

/**
 * Ссылка, которая уходит под штору. Остаётся настоящим <a href>:
 * средний клик, Cmd+клик и «открыть в новой вкладке» работают как обычно,
 * а Next префетчит маршрут — поэтому под шторой уже нечего ждать.
 */
export default function AppLink({
  href,
  children,
  className,
  ref,
  ...rest
}: {
  href: string
  children: React.ReactNode
  className?: string
  ref?: React.Ref<HTMLAnchorElement>
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className' | 'ref'>) {
  const navigate = useNavigate()

  return (
    <Link
      href={href}
      ref={ref}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        navigate(href)
      }}
      {...rest}
    >
      {children}
    </Link>
  )
}
