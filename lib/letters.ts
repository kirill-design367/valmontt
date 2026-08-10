'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { FULL } from './reveal'

gsap.registerPlugin(ScrollTrigger, SplitText)

/**
 * Сборка текста из разлетевшихся букв.
 *
 * В исходном состоянии литеры разбросаны вокруг своих мест, повёрнуты и
 * прозрачны; по мере скролла стягиваются, выпрямляются и проявляются.
 * Привязка — scrub, а не таймер: прокрутил назад — буквы разлетелись обратно.
 *
 * Разброс ДЕТЕРМИНИРОВАННЫЙ. Math.random дал бы новую раскладку на каждой
 * загрузке, а кадр должен собираться одинаково: одна и та же литера всегда
 * летит из одной и той же точки. Отсюда собственный генератор от номера.
 *
 * В кадре только transform и opacity — ни одного фильтра.
 */

const РАЗЛЁТ = 60 // px по каждой оси
const ПОВОРОТ = 15 // градусов

/** mulberry32 на один бросок: число из семени, без состояния. */
function шум(семя: number) {
  let t = (семя + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** −1…1 из номера литеры и номера оси */
const сдвиг = (семя: number, i: number, ось: number) => шум(семя + i * 3 + ось) * 2 - 1

type Опции = {
  /** База разброса: у каждого блока своя, чтобы соседи не летели одинаково */
  seed?: number
  start?: string
  end?: string
  /** для горизонтального проезда: тайм-лайн ленты вместо вертикального скролла */
  containerAnimation?: gsap.core.Animation
}

/**
 * Собирает один элемент. Возвращает функцию отката: она гасит триггер и
 * возвращает исходную разметку, иначе SplitText оставит после себя спаны.
 */
export function assembleLetters(el: HTMLElement, opts: Опции = {}) {
  const { seed = 0, start = 'top 88%', end = 'top 42%', containerAnimation } = opts

  /* Режем и по словам, и по литерам. Только по литерам нельзя: каждая
     становится inline-block, и браузер получает право переносить строку
     ВНУТРИ слова — «ЗАКРЫВАЕТ / СЯ». Обёртка слова это запрещает.
     aria: 'hidden' возвращает скринридеру исходную строку, а не набор литер. */
  const split = new SplitText(el, { type: 'words,chars', aria: 'hidden' })

  const tween = gsap.fromTo(
    split.chars,
    {
      x: (i: number) => сдвиг(seed, i, 0) * РАЗЛЁТ,
      y: (i: number) => сдвиг(seed, i, 1) * РАЗЛЁТ,
      rotation: (i: number) => сдвиг(seed, i, 2) * ПОВОРОТ,
      autoAlpha: 0,
    },
    {
      x: 0,
      y: 0,
      rotation: 0,
      autoAlpha: 1,
      duration: 1,
      stagger: 0.012,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: (el.closest('[data-letters-trigger]') as HTMLElement) ?? el,
        start,
        end,
        scrub: 0.5,
        containerAnimation,
      },
    },
  )

  return () => {
    tween.scrollTrigger?.kill()
    tween.kill()
    split.revert()
  }
}

/**
 * Собирает все `[data-letters]` внутри области.
 *
 * Ждём `document.fonts.ready`: SplitText режет по текущим метрикам, и если
 * разрезать до подмены шрифта — литеры встанут по позициям запасной гарнитуры
 * и после подмены разъедутся.
 */
export function useLetterAssembly(
  scope: React.RefObject<HTMLElement | null>,
  opts: Omit<Опции, 'seed'> = {},
) {
  useEffect(() => {
    const root = scope.current
    if (!root) return

    let ctx: gsap.Context | undefined
    let отменено = false

    document.fonts.ready.then(() => {
      if (отменено) return
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia()
        // сокращённое движение: не режем текст вовсе — он и так на месте
        mm.add(FULL, () => {
          const откаты = gsap.utils
            .toArray<HTMLElement>('[data-letters]')
            .map((el, i) => assembleLetters(el, { ...opts, seed: i * 977 + 13 }))
          return () => откаты.forEach((f) => f())
        })
      }, root)
      ScrollTrigger.refresh()
    })

    return () => {
      отменено = true
      ctx?.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])
}
