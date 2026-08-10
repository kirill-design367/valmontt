'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AppLink from './AppLink'
import { useLenis } from './SiteChrome'
import { MENU } from '@/lib/routes'
import s from './HomeMenu.module.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Бургер главной страницы.
 *
 * На первом экране его нет: hero отдан кадру, разделы и так стоят строкой
 * сверху. Как только обложка пролистана, кнопка проявляется в левом верхнем
 * углу и остаётся на всю ленту; возврат наверх убирает её обратно.
 *
 * Кнопка открывает панель разделов. Дальше по ленте hero уже не виден, а
 * вместе с ним не видна и верхняя строка меню — без панели навигация на
 * главной просто исчезала бы, а на телефоне её нет с самого начала.
 */
export default function HomeMenu() {
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const lenis = useLenis()

  /* --- появление после hero --- */
  useEffect(() => {
    const el = btn.current
    if (!el) return

    const ctx = gsap.context(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const show = (on: boolean) => {
        if (reduce) {
          gsap.set(el, { autoAlpha: on ? 1 : 0, y: 0 })
          return
        }
        gsap.to(el, {
          autoAlpha: on ? 1 : 0,
          y: on ? 0 : -12,
          duration: on ? 0.5 : 0.35,
          ease: on ? 'power3.out' : 'power3.in',
          overwrite: true,
        })
      }

      const st = ScrollTrigger.create({
        // порог — три четверти обложки: кнопка выходит тогда, когда hero
        // уже ушёл из кадра, а не при первом же щелчке колеса
        start: () => window.innerHeight * 0.75,
        end: () => ScrollTrigger.maxScroll(window),
        onToggle: (self) => show(self.isActive),
      })

      return () => st.kill()
    })

    return () => ctx.revert()
  }, [])

  /* --- панель --- */
  useEffect(() => {
    const el = panel.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const items = el.querySelectorAll('[data-menu-item]')

    if (reduce) {
      gsap.set(el, { autoAlpha: open ? 1 : 0 })
      gsap.set(items, { yPercent: 0, autoAlpha: 1 })
    } else if (open) {
      gsap
        .timeline()
        .set(el, { visibility: 'visible' })
        .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
        .fromTo(
          items,
          { yPercent: 115, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out' },
          0.08,
        )
    } else {
      gsap
        .timeline({ onComplete: () => gsap.set(el, { visibility: 'hidden' }) })
        .to(items, { yPercent: -80, autoAlpha: 0, duration: 0.3, stagger: 0.03, ease: 'power3.in' }, 0)
        .to(el, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.1)
    }

    // пока панель открыта, лента под ней стоит
    if (open) lenis?.stop()
    else lenis?.start()

    // уход со страницы с открытой панелью не должен оставить скролл замершим
    return () => lenis?.start()
  }, [open, lenis])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={btn}
        className={`${s.burger} ${open ? s.burgerOpen : ''}`}
        type="button"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
      </button>

      <div className={s.panel} ref={panel} onClick={() => setOpen(false)}>
        <ul className={s.list}>
          {MENU.map((item) => (
            <li className={s.cell} key={item.href}>
              <AppLink className={s.item} href={item.href} data-menu-item>
                {item.label}
              </AppLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
