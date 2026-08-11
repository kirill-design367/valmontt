'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const REDUCE = '(prefers-reduced-motion: reduce)'
export const FULL = '(prefers-reduced-motion: no-preference)'

/**
 * Проявление по скроллу. Один общий приём на весь сайт: элементы с
 * `data-reveal` поднимаются из-под маски, `data-reveal-fade` просто всплывают.
 * Группируются по ближайшему `data-reveal-group`, чтобы stagger шёл внутри
 * блока, а не по всей странице.
 */
export function useReveal(
  scope: React.RefObject<HTMLElement | null>,
  { stagger = 0.06 }: { stagger?: number } = {},
) {
  useEffect(() => {
    const root = scope.current
    if (!root) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add(FULL, () => {
        /* Старт не может лежать дальше дна документа: у последнего блока
           короткой страницы «top 82 %» недостижим, и без зажима такой блок
           не проявится вовсе. Ту же болезнь у сборки лечит lib/letters.ts. */
        const старт = (group: HTMLElement) => () =>
          Math.min(
            group.getBoundingClientRect().top + window.scrollY - 0.82 * window.innerHeight,
            Math.max(0, ScrollTrigger.maxScroll(window)),
          )

        const groups = root.querySelectorAll<HTMLElement>('[data-reveal-group]')
        const targets: HTMLElement[] = groups.length
          ? Array.from(groups)
          : [root]

        for (const group of targets) {
          const lines = group.querySelectorAll<HTMLElement>('[data-reveal]')
          const fades = group.querySelectorAll<HTMLElement>('[data-reveal-fade]')

          if (lines.length) {
            gsap.fromTo(
              lines,
              { yPercent: 106 },
              {
                yPercent: 0,
                duration: 1.05,
                ease: 'power4.out',
                stagger,
                scrollTrigger: { trigger: group, start: старт(group), once: true, invalidateOnRefresh: true },
              },
            )
          }
          if (fades.length) {
            gsap.fromTo(
              fades,
              // простое проявление вместо сборки: сдвиг снизу на 20 px,
              // 0.6 с, stagger 0.06 между строками
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.6,
                ease: 'power3.out',
                stagger,
                scrollTrigger: { trigger: group, start: старт(group), once: true, invalidateOnRefresh: true },
              },
            )
          }
        }
      })

      // сокращённое движение: всё уже на местах, ScrollTrigger не заводится
      mm.add(REDUCE, () => {
        gsap.set(root.querySelectorAll('[data-reveal]'), { yPercent: 0 })
        gsap.set(root.querySelectorAll('[data-reveal-fade]'), { y: 0, opacity: 1 })
      })
    }, root)

    return () => ctx.revert()
  }, [scope, stagger])
}

/**
 * Простое проявление одного элемента: снизу на 20 px и из нуля прозрачности.
 * То, что стоит вместо сборки там, где сборку сняли, — подписи кадров,
 * лиды, описания. `containerAnimation` нужен горизонтальной ленте /mesto:
 * там кадр приезжает вбок, а не по вертикальному скроллу.
 */
export function fadeUp(
  el: HTMLElement,
  {
    containerAnimation,
    start = 'top 88%',
  }: { containerAnimation?: gsap.core.Animation; start?: string } = {},
) {
  if (window.matchMedia(REDUCE).matches) {
    gsap.set(el, { y: 0, opacity: 1 })
    return () => {}
  }
  const tween = gsap.fromTo(
    el,
    { y: 20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start, once: true, containerAnimation },
    },
  )
  return () => {
    tween.scrollTrigger?.kill()
    tween.kill()
  }
}
