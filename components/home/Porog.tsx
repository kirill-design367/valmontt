'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { FULL, REDUCE } from '@/lib/reveal'
import { ASSETS } from '@/lib/assets'
import Plate from '../Plate'
import s from './Porog.module.css'

gsap.registerPlugin(ScrollTrigger)

const WORD = 'ВАЛЬМОНТ'.split('')

/**
 * Порог — финальный постер сайта.
 *
 * За весь сайт вордмарк ни разу не показан целиком: на hero и на внутренних
 * страницах он обрезан краями экрана. Здесь слово впервые читается от В до Т.
 *
 * Вся сборка привязана к прогрессу скролла через scrub и заканчивается, когда
 * блок целиком в кадре. Бесконечных циклов нет: досмотрел — и кадр застыл.
 */
export default function Porog() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      mm.add(FULL, () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top 92%',
            end: 'top 6%',
            scrub: 0.5,
          },
        })

        // буквы приходят снизу вверх; «блюр» — перекрёстное затухание
        // с заранее размытым дублем, радиус фильтра не анимируется
        tl.fromTo(
          '[data-letter]',
          { yPercent: 130, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.04, ease: 'power3.out' },
          0,
        )
          .fromTo(
            '[data-letter-ghost]',
            { yPercent: 130, autoAlpha: 0.85 },
            { yPercent: 0, autoAlpha: 0, duration: 1, stagger: 0.04, ease: 'power3.out' },
            0,
          )
          // глаз грифона проступает из черноты
          .fromTo(
            '[data-eye]',
            { autoAlpha: 0, scale: 1.14 },
            { autoAlpha: 0.35, scale: 1, duration: 1.5, ease: 'power2.out' },
            0.1,
          )
          // блум разгорается последним
          .fromTo(
            '[data-porog-bloom]',
            { autoAlpha: 0 },
            { autoAlpha: 0.5, duration: 1, ease: 'power2.out' },
            0.95,
          )
          .fromTo(
            '[data-porog-line]',
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' },
            1.1,
          )
      })

      // сокращённое движение: постер собран сразу
      mm.add(REDUCE, () => {
        gsap.set('[data-letter]', { yPercent: 0, autoAlpha: 1 })
        gsap.set('[data-letter-ghost]', { autoAlpha: 0 })
        gsap.set('[data-eye]', { autoAlpha: 0.35, scale: 1 })
        gsap.set('[data-porog-bloom]', { autoAlpha: 0.5 })
        gsap.set('[data-porog-line]', { autoAlpha: 1, y: 0 })
      })
    }, el)

    return () => ctx.revert()
  }, [])

  return (
    <section className={s.porog} ref={root} aria-label="Порог">
      {/* кроп глаза берётся из той же подложки — отдельный файл не нужен */}
      <div className={s.eye} data-eye aria-hidden="true">
        <Plate asset={ASSETS.porogEye} alt="" />
      </div>

      <div className={s.center}>
        <h2 className={s.word} aria-label="ВАЛЬМОНТ">
          <span className={s.bloom} data-porog-bloom aria-hidden="true">
            {WORD.map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </span>
          {WORD.map((c, i) => (
            <span className={s.cell} key={i} aria-hidden="true">
              <span className={s.ghost} data-letter-ghost>
                {c}
              </span>
              <span className={s.letter} data-letter>
                {c}
              </span>
            </span>
          ))}
        </h2>

        <p className={s.line} data-porog-line>
          Приглашение действительно на одного
        </p>
      </div>
    </section>
  )
}
