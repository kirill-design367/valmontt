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

/* Те же числа, что в lib/letters.ts: сборка на всех шести блоках сайта
   одинаковой силы. Свой генератор здесь потому, что «Порог» собирает не
   разрезанный SplitText-ом текст, а восемь готовых литер разметки. */
const РАЗЛЁТ = 180
const ПОВОРОТ = 45
const МАСШТАБ = 0.6
const СЕМЯ = 4801

function шум(семя: number) {
  let t = (семя + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const разброс = (i: number, ось: number) => шум(СЕМЯ + i * 3 + ось) * 2 - 1

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

        /* Буквы — только transform и opacity. Дублей с блюром на каждую
           литеру больше нет: восемь размытых слоёв стоили двадцати кадров.

           Разброс тот же усиленный, что и на остальных пяти блоках сборки:
           180 px, 45°, масштаб от 0.6. Детерминированный — литера всегда
           летит из одной и той же точки. */
        tl.fromTo(
          '[data-letter]',
          {
            x: (i: number) => разброс(i, 0) * РАЗЛЁТ,
            y: (i: number) => разброс(i, 1) * РАЗЛЁТ,
            rotation: (i: number) => разброс(i, 2) * ПОВОРОТ,
            scale: МАСШТАБ,
            autoAlpha: 0,
          },
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 1,
            stagger: 0.04,
            ease: 'power3.out',
          },
          0,
        )
          // кроп глаза статичен: только проявляется, без масштаба
          .fromTo(
            '[data-eye]',
            { autoAlpha: 0 },
            { autoAlpha: 0.35, duration: 1.5, ease: 'power2.out' },
            0.1,
          )
          // блум разгорается последним; убавлен вдвое (0.33 → 0.165),
          // как и ореол вордмарка на hero
          .fromTo(
            '[data-porog-bloom]',
            { autoAlpha: 0 },
            { autoAlpha: 0.165, duration: 1, ease: 'power2.out' },
            0.95,
          )
          .fromTo(
            '[data-porog-line]',
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' },
            1.1,
          )
          // подсказки композитору живут только на время сборки
          .add(() => gsap.set('[data-letter], [data-porog-bloom], [data-eye]', {
            clearProps: 'willChange',
          }))
      })

      // сокращённое движение: постер собран сразу
      mm.add(REDUCE, () => {
        gsap.set('[data-letter]', { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 })
        gsap.set('[data-eye]', { autoAlpha: 0.35 })
        gsap.set('[data-porog-bloom]', { autoAlpha: 0.165 })
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
