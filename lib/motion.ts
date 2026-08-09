'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

/**
 * One RAF for the whole page: Lenis is driven off the GSAP ticker instead of
 * running its own loop, so adding scrolling scenes later costs no extra frame
 * budget — and the hero keeps every millisecond it has.
 */
export function useTicker() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: false, lerp: 0.1 })
    const drive = (time: number) => lenis.raf(time * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(drive)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(drive)
      lenis.destroy()
    }
  }, [])
}

type Layer = { el: Element; depth: number }

/**
 * Entrance, ambient loops and pointer parallax for the hero.
 * Everything reads its targets off data-attributes so the markup stays flat.
 */
export function useHeroMotion(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = root.current
    if (!scope) return

    const q = <T extends Element = Element>(sel: string) =>
      Array.from(scope.querySelectorAll<T>(sel))
    const one = (sel: string) => scope.querySelector(sel)

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      /* ---------------------------------------------------------------- *
       * Полное движение
       * ---------------------------------------------------------------- */
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          // Ждём декодирования снимка: иначе первые кадры входа конкурируют
          // с распаковкой JPEG, и запись теряет как раз начало.
          paused: true,
          defaults: { ease: 'power3.out' },
          onComplete: () => {
            // снимаем подсказки композитору и убираем размытый дубль —
            // дальше в кадре не остаётся ни одного анимируемого фильтра
            gsap.set('[data-will-change]', { clearProps: 'willChange' })
            gsap.set('[data-entry-ghost]', { display: 'none' })
          },
        })

        // Стили держат эти группы скрытыми до старта таймлайна; снимаем
        // visibility одним махом, дальше работает только прозрачность.
        tl.set(
          '[data-wordmark], [data-entry-ghost], [data-bloom], [data-line], [data-late]',
          { visibility: 'visible' },
        )
          // фон проявляется из чёрного
          .fromTo(
            '[data-bg-image]',
            { scale: 1.08, opacity: 0 },
            { scale: 1, opacity: 1, duration: 1.7, ease: 'power2.out' },
            0,
          )
          // вордмарк выезжает снизу вверх; «с блюром» — перекрёстное
          // затухание с дублем фиксированного размытия
          .fromTo(
            '[data-wordmark-slide]',
            { yPercent: 12 },
            { yPercent: 0, duration: 1.5, ease: 'power3.out' },
            0.3,
          )
          .fromTo('[data-wordmark]', { opacity: 0 }, { opacity: 1, duration: 1.5, ease: 'power2.out' }, 0.3)
          .fromTo('[data-entry-ghost]', { opacity: 0.9 }, { opacity: 0, duration: 1.3, ease: 'power2.out' }, 0.3)
          // Блум разгорается с задержкой 0.3 с после появления букв.
          // Только прозрачность и разный старт у двух дублей — свечение
          // «набухает» без единого пересчёта фильтра.
          .fromTo(
            '[data-bloom]',
            { opacity: 0 },
            {
              opacity: (i, el: HTMLElement) => (el.dataset.bloom === 'far' ? 0.62 : 0.85),
              duration: 1.4,
              stagger: 0.18,
              ease: 'power2.out',
            },
            0.6,
          )
          // заголовок построчно
          .fromTo(
            '[data-line]',
            { yPercent: 108 },
            { yPercent: 0, duration: 1.05, stagger: 0.08, ease: 'power4.out' },
            0.5,
          )
          // интерфейс — последним
          .fromTo(
            '[data-late]',
            { y: 16, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: 'power3.out' },
            1.25,
          )

        /* Старт привязан к САМОМУ КАДРУ, а не к готовности бандла: как только
           подложка загружена и раскодирована, таймлайн играет. Если снимок уже
           в кеше — это тот же кадр, что и гидратация. Полторы секунды — верхняя
           страховка, чтобы кадр не завис на чёрном при сетевом сбое. */
        const img = scope.querySelector<HTMLImageElement>('[data-bg-image]')
        const ready =
          img && !img.complete
            ? new Promise<void>((r) => {
                img.addEventListener('load', () => r(), { once: true })
                img.addEventListener('error', () => r(), { once: true })
              })
            : Promise.resolve()
        Promise.race([
          ready.then(() => (img?.decode ? img.decode().catch(() => undefined) : undefined)),
          new Promise((r) => setTimeout(r, 1500)),
        ]).then(() => tl.play())

        /* рамка-линза еле заметно дышит, цикл 4 с */
        const lens = one('[data-lens]')
        if (lens) {
          gsap.to(lens, {
            scale: 1.016,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            transformOrigin: '50% 50%',
          })
        }

        /* параллакс по курсору: фон ведёт, интерфейс отстаёт */
        const layers: Layer[] = [
          ...q('[data-parallax="bg"]').map((el) => ({ el, depth: 15 })),
          // передний план держится почти вровень с фоном — иначе рамка
          // сползёт с глаза, который она кадрирует
          ...q('[data-parallax="fg"]').map((el) => ({ el, depth: 12 })),
          ...q('[data-parallax="mid"]').map((el) => ({ el, depth: 8 })),
          ...q('[data-parallax="ui"]').map((el) => ({ el, depth: 4 })),
        ]

        const setters = layers.map(({ el, depth }) => ({
          depth,
          x: gsap.quickTo(el, 'x', { duration: 1.1, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 1.1, ease: 'power3' }),
        }))

        const onMove = (e: PointerEvent) => {
          const nx = (e.clientX / window.innerWidth) * 2 - 1
          const ny = (e.clientY / window.innerHeight) * 2 - 1
          for (const s of setters) {
            s.x(-nx * s.depth)
            s.y(-ny * s.depth * 0.55)
          }
        }
        const onLeave = () => {
          for (const s of setters) {
            s.x(0)
            s.y(0)
          }
        }

        window.addEventListener('pointermove', onMove, { passive: true })
        document.addEventListener('pointerleave', onLeave)
        return () => {
          window.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerleave', onLeave)
        }
      })

      /* ---------------------------------------------------------------- *
       * Сокращённое движение — кадр собирается сразу, без циклов
       * ---------------------------------------------------------------- */
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-entry-ghost]', { display: 'none' })
        gsap.set('[data-bg-image]', { scale: 1, opacity: 1 })
        gsap.set('[data-wordmark-slide]', { yPercent: 0 })
        gsap.set('[data-wordmark]', { opacity: 1 })
        gsap.set('[data-bloom]', { opacity: (i, el: HTMLElement) => (el.dataset.bloom === 'far' ? 0.62 : 0.85) })
        gsap.set('[data-line]', { yPercent: 0 })
        gsap.set('[data-late]', { y: 0, opacity: 1 })
      })
    }, scope)

    return () => ctx.revert()
  }, [root])
}

/** Мягкое увеличение и свечение пилюли под курсором. */
export function usePillHover(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scale = gsap.quickTo(el, 'scale', { duration: 0.5, ease: 'power3.out' })
    const glow = gsap.quickTo(el, '--pill-glow', { duration: 0.5, ease: 'power3.out' })

    const enter = () => {
      scale(1.045)
      glow(1)
    }
    const leave = () => {
      scale(1)
      glow(0)
    }

    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('focus', enter)
    el.addEventListener('blur', leave)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('focus', enter)
      el.removeEventListener('blur', leave)
    }
  }, [ref])
}
