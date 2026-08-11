'use client'

import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { FULL, REDUCE } from './reveal'

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

/* Разброс усилен по правке клиента: сборка осталась только на шести
   блоках, зато бьёт заметно. Раньше было 60 px и 15°. */
const РАЗЛЁТ = 180 // px по каждой оси
const ПОВОРОТ = 45 // градусов
const МАСШТАБ = 0.6 // литера приходит из глубины

/* Окно сборки в долях высоты экрана: старт, когда верх блока на 88 %,
   финиш — на 42 %. Разница даёт длину пробега в пикселях прокрутки. */
const НАЧАЛО = 0.88
const КОНЕЦ = 0.42

/** mulberry32 на один бросок: число из семени, без состояния. */
function шум(семя: number) {
  let t = (семя + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** −1…1 из номера литеры и номера оси */
const сдвиг = (семя: number, i: number, ось: number) => шум(семя + i * 3 + ось) * 2 - 1

/**
 * Куда встанет окно сборки на шкале прокрутки.
 *
 * Натуральное окно последнего блока страницы почти всегда заканчивается
 * ДАЛЬШЕ, чем документ вообще может прокрутиться: скролл упирается в низ,
 * scrub замирает на середине, буквы так и остаются разбросанными. Это не
 * особенность двух блоков, а свойство любого последнего блока.
 *
 * Лечим сдвигом, а не обрезкой: окно целиком уезжает выше по шкале, ДЛИНА
 * ПРОБЕГА СОХРАНЯЕТСЯ. Анимация идёт с той же скоростью и с тем же
 * характером, просто начинается раньше и заканчивается ровно на дне
 * документа. Ни распорки с пустым экраном, ни сжатия времени.
 *
 * Если документ короче одного окна — прокручивать нечего в принципе, и
 * scrub физически невозможен. Тогда блок собирается по времени при
 * появлении: см. `помещается` ниже.
 */
function окноПрокрутки(цель: HTMLElement) {
  const H = window.innerHeight
  const предел = Math.max(0, ScrollTrigger.maxScroll(window))
  const пробег = (НАЧАЛО - КОНЕЦ) * H
  // документная координата верха блока, независимо от текущей прокрутки
  const верх = цель.getBoundingClientRect().top + window.scrollY

  let конец = верх - КОНЕЦ * H
  // не выше нуля и не ниже дна — окно всегда целиком внутри шкалы
  конец = Math.min(Math.max(конец, пробег), предел)
  return { старт: конец - пробег, конец, помещается: предел >= пробег }
}

type Опции = {
  /** База разброса: у каждого блока своя, чтобы соседи не летели одинаково */
  seed?: number
  /** Номер блока на странице: разводит сборки по времени на коротких страницах */
  индекс?: number
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
  const { seed = 0, индекс = 0, start = 'top 88%', end = 'top 42%', containerAnimation } = opts
  const цель = (el.closest('[data-letters-trigger]') as HTMLElement) ?? el

  /* Режем и по словам, и по литерам. Только по литерам нельзя: каждая
     становится inline-block, и браузер получает право переносить строку
     ВНУТРИ слова — «ЗАКРЫВАЕТ / СЯ». Обёртка слова это запрещает.
     aria: 'hidden' возвращает скринридеру исходную строку, а не набор литер. */
  const split = new SplitText(el, { type: 'words,chars', aria: 'hidden' })

  const разлёт = {
    x: (i: number) => сдвиг(seed, i, 0) * РАЗЛЁТ,
    y: (i: number) => сдвиг(seed, i, 1) * РАЗЛЁТ,
    rotation: (i: number) => сдвиг(seed, i, 2) * ПОВОРОТ,
    scale: МАСШТАБ,
    autoAlpha: 0,
  }
  const сбор = { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 }

  /* Страница короче одного окна — прокручивать нечего, scrub невозможен.
     Собираем по времени при появлении, чтобы анимация всё-таки была: это
     единственная альтернатива «буквы просто лежат на месте». */
  if (!containerAnimation && !окноПрокрутки(цель).помещается) {
    const tween = gsap.fromTo(split.chars, разлёт, {
      ...сбор,
      duration: 1,
      stagger: 0.012,
      delay: индекс * 0.12,
      ease: 'power2.out',
      paused: true,
    })
    const триггер = ScrollTrigger.create({
      trigger: цель,
      start: 'top 92%',
      once: true,
      onEnter: () => tween.play(),
    })
    return () => {
      триггер.kill()
      tween.kill()
      split.revert()
    }
  }

  const tween = gsap.fromTo(split.chars, разлёт, {
    ...сбор,
    duration: 1,
    stagger: 0.012,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: цель,
      // Горизонтальная лента живёт в координатах своего тайм-лайна — там
      // строковые позиции считает сам ScrollTrigger, и дна документа нет.
      start: containerAnimation ? start : () => окноПрокрутки(цель).старт,
      end: containerAnimation ? end : () => окноПрокрутки(цель).конец,
      scrub: 0.5,
      invalidateOnRefresh: true,
      containerAnimation,
    },
  })

  return () => {
    tween.scrollTrigger?.kill()
    tween.kill()
    split.revert()
  }
}

/**
 * Та же сборка, но по времени, а не по скроллу: финальный экран замка
 * собирается сам, скроллить там нечего. Разброс тот же самый — детерминизм
 * и здесь важен, кадр обязан собираться одинаково.
 */
export function assembleLettersInTime(
  el: HTMLElement,
  { seed = 0, duration = 1.1, stagger = 0.014, delay = 0 } = {},
) {
  const split = new SplitText(el, { type: 'words,chars', aria: 'hidden' })
  const мало = window.matchMedia(REDUCE).matches

  if (мало) {
    gsap.set(split.chars, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 })
    return { tween: null, revert: () => split.revert() }
  }

  const tween = gsap.fromTo(
    split.chars,
    {
      x: (i: number) => сдвиг(seed, i, 0) * РАЗЛЁТ,
      y: (i: number) => сдвиг(seed, i, 1) * РАЗЛЁТ,
      rotation: (i: number) => сдвиг(seed, i, 2) * ПОВОРОТ,
      scale: МАСШТАБ,
      autoAlpha: 0,
    },
    { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration, stagger, delay, ease: 'power3.out' },
  )

  return { tween, revert: () => { tween.kill(); split.revert() } }
}

/**
 * Собирает все `[data-letters]` внутри области.
 *
 * ПОЧЕМУ useLayoutEffect И ПОЧЕМУ БЛОК СНАЧАЛА ГАСНЕТ.
 *
 * SplitText режет по текущим метрикам, поэтому резать надо после подмены
 * шрифта — а `document.fonts.ready` асинхронен. Если ничего не делать, идёт
 * такая последовательность: браузер рисует собранный текст из SSR-разметки,
 * потом приходят шрифты, текст режется, на литеры ложится разлетевшееся
 * состояние — и на глазах у человека собранный блок разваливается. Именно
 * это читается как «прыжок при первом скролле».
 *
 * Лечим так: ДО первой отрисовки (useLayoutEffect, синхронно) гасим сам
 * блок целиком. Человек не видит собранного текста ни одного кадра. Когда
 * шрифты готовы и литеры разрезаны и уже разбросаны, блок возвращаем —
 * возвращать нечего, кроме уже правильного состояния покоя.
 *
 * В бережном режиме не гасим ничего: там текст просто стоит на месте.
 */
export function useLetterAssembly(
  scope: React.RefObject<HTMLElement | null>,
  opts: Omit<Опции, 'seed'> = {},
) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return

    const мало = window.matchMedia(REDUCE).matches
    const блоки = Array.from(root.querySelectorAll<HTMLElement>('[data-letters]'))
    // синхронно, в том же кадре: собранный текст не должен мелькнуть
    if (!мало) gsap.set(блоки, { autoAlpha: 0 })

    let ctx: gsap.Context | undefined
    let отменено = false

    const показать = () => gsap.set(блоки, { autoAlpha: 1 })

    document.fonts.ready.then(() => {
      if (отменено) return
      ctx = gsap.context(() => {
        const mm = gsap.matchMedia()
        // сокращённое движение: не режем текст вовсе — он и так на месте
        mm.add(FULL, () => {
          const откаты = gsap.utils
            .toArray<HTMLElement>('[data-letters]')
            .map((el, i) => assembleLetters(el, { ...opts, seed: i * 977 + 13, индекс: i }))
          return () => откаты.forEach((f) => f())
        })
      }, root)

      ScrollTrigger.refresh()
      // литеры уже разбросаны — открываем блок в состоянии покоя, не собранным
      показать()
    })

    return () => {
      отменено = true
      показать()
      ctx?.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])
}
