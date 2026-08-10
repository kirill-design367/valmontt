'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { REDUCE } from '@/lib/reveal'
import s from './RailBeam.module.css'

/**
 * Индикатор горизонтального проезда: вместо надписи «крутите» — световое
 * пятно, бегущее по тонкой линии внизу экрана.
 *
 * Пробег 2.2 с линейно, пауза 0.8 с, цикл непрерывный. Едет только
 * transform, гаснет только opacity — ни одного анимируемого фильтра.
 * Ореол над линией готов заранее слоем с маской.
 *
 * Пропадает, когда лента доехала до последнего кадра, и возвращается при
 * прокрутке назад: `виден` приходит снаружи, от того же ScrollTrigger,
 * что везёт ленту.
 */
export default function RailBeam({ виден }: { виден: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const пятно = useRef<HTMLSpanElement>(null)

  /* Пробег. Заводится один раз и крутится всё время жизни страницы: держать
     его в паузе дешевле, чем пересобирать на каждое появление. */
  useEffect(() => {
    const el = пятно.current
    if (!el || window.matchMedia(REDUCE).matches) return

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 })
    tl.fromTo(
      el,
      { xPercent: -100 },
      // от «полностью за левым краем» до «полностью за правым»: ширина пятна
      // 18 % экрана, значит правый край — это 100/0.18 своих ширин
      { xPercent: (100 / 18) * 100, duration: 2.2, ease: 'none' },
    )
    return () => {
      tl.kill()
    }
  }, [])

  /* Появление и уход — отдельно от пробега, чтобы не сбивать его фазу. */
  useEffect(() => {
    const el = root.current
    if (!el) return
    const мало = window.matchMedia(REDUCE).matches
    gsap.to(el, {
      autoAlpha: виден ? 1 : 0,
      duration: мало ? 0 : виден ? 0.45 : 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }, [виден])

  return (
    <div className={s.beam} ref={root} aria-hidden="true" data-rail-beam>
      <span className={s.rail} data-rail-line />
      <span className={s.spot} ref={пятно} data-rail-spot>
        <span className={s.halo} data-rail-halo />
        <span className={s.core} />
      </span>
    </div>
  )
}
