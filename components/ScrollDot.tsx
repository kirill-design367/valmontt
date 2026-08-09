'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useLenis } from './SiteChrome'
import s from './ScrollDot.module.css'

/**
 * Индикатор скролла под кнопкой. Точка едет от верха окружности к низу,
 * гаснет и появляется сверху — цикл 2.5 с с паузой 0.6 с. После 200 px
 * прокрутки элемент уходит насовсем: дальше он уже ничего не подсказывает.
 */
export default function ScrollDot() {
  const root = useRef<HTMLButtonElement>(null)
  const dot = useRef<HTMLSpanElement>(null)
  const lenis = useLenis()

  useEffect(() => {
    const el = root.current
    const d = dot.current
    if (!el || !d) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap
        .timeline({ repeat: -1, repeatDelay: 0.6 })
        .fromTo(
          d,
          { yPercent: -150, opacity: 0 },
          { opacity: 1, duration: 0.35, ease: 'power2.out' },
        )
        .to(d, { yPercent: 150, duration: 2.5, ease: 'power2.inOut' }, 0)
        .to(d, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 2.1)
    }, el)

    let gone = false
    const onScroll = () => {
      if (gone || window.scrollY <= 200) return
      gone = true
      gsap.to(el, {
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => ctx.revert(),
      })
      window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      ctx.revert()
    }
  }, [])

  const toFirstBlock = () => {
    const target = window.innerHeight
    if (lenis) lenis.scrollTo(target, { duration: 1.2 })
    else window.scrollTo({ top: target, behavior: 'smooth' })
  }

  return (
    <button
      className={s.dot}
      ref={root}
      type="button"
      data-late
      onClick={toFirstBlock}
      aria-label="Прокрутить к первому блоку"
    >
      <span className={s.pip} ref={dot} />
    </button>
  )
}
