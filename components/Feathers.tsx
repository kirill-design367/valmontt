'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import s from './Feathers.module.css'

/**
 * Шлейф перьев за курсором.
 *
 * Не фейерверк, а намёк: частицы вылетают только когда курсор действительно
 * движется, и тем чаще, чем резче движение. При медленном ведении их почти
 * нет.
 *
 * Пул фиксированный — двадцать частиц, созданных один раз. Новая частица не
 * рождается, а берётся из пула: за всё время жизни страницы ни одного
 * createElement, ни одной пересборки лейаута.
 *
 * В кадре только transform и opacity. Ни фильтров, ни теней: перо — это
 * clip-path на плоской заливке, растеризуется один раз.
 *
 * Только обложка главной и только мышь: на телефоне курсора нет, а на
 * внутренних страницах эффекта нет по замыслу.
 */

const ПУЛ = 20
const ЖИЗНЬ = 0.8 // с
const ЦВЕТА = ['--color-plume-crimson', '--color-plume-teal', '--color-plume-amber']

export default function Feathers() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = root.current
    if (!box) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // грубая отсечка сенсорных: там курсора нет и шлейфу не за чем идти
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const ctx = gsap.context(() => {
      const перья = gsap.utils.toArray<HTMLElement>('[data-feather]')
      const свободные = [...перья.keys()]
      const живут = new Map<number, gsap.core.Tween>()

      let прошлыйX = 0
      let прошлыйY = 0
      let первый = true
      let копилка = 0

      const пустить = (x: number, y: number, vx: number, vy: number, i: number) => {
        const el = перья[i]
        const угол = Math.atan2(vy, vx)
        // разлёт в стороны от направления движения
        const разброс = угол + (Math.random() - 0.5) * 2.2
        const сила = 34 + Math.random() * 46
        const размер = 8 + Math.random() * 10

        gsap.set(el, {
          x,
          y,
          width: размер,
          height: размер * 2.6,
          rotation: (разброс * 180) / Math.PI + 90,
          scale: 1,
          autoAlpha: 1,
          backgroundColor: `var(${ЦВЕТА[i % ЦВЕТА.length]})`,
        })

        const t = gsap.to(el, {
          x: x + Math.cos(разброс) * сила,
          y: y + Math.sin(разброс) * сила + 26, // вниз: перо всё-таки падает
          rotation: '+=' + (Math.random() - 0.5) * 150,
          scale: 0.55,
          autoAlpha: 0,
          duration: ЖИЗНЬ,
          ease: 'power2.out',
          onComplete: () => {
            живут.delete(i)
            свободные.push(i)
          },
        })
        живут.set(i, t)
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        const x = e.clientX
        const y = e.clientY
        if (первый) {
          первый = false
          прошлыйX = x
          прошлыйY = y
          return
        }

        const dx = x - прошлыйX
        const dy = y - прошлыйY
        прошлыйX = x
        прошлыйY = y

        const скорость = Math.hypot(dx, dy)
        // Порог: медленное ведение не рождает ничего. Дальше копилка растёт
        // пропорционально скорости — чем резче рывок, тем чаще вылет.
        if (скорость < 6) return
        копилка += скорость

        while (копилка > 90 && свободные.length) {
          копилка -= 90
          пустить(x, y, dx, dy, свободные.pop() as number)
        }
        if (!свободные.length) копилка = 0
      }

      window.addEventListener('pointermove', onMove, { passive: true })
      return () => {
        window.removeEventListener('pointermove', onMove)
        живут.forEach((t) => t.kill())
      }
    }, box)

    return () => ctx.revert()
  }, [])

  return (
    <div className={s.field} ref={root} aria-hidden="true">
      {Array.from({ length: ПУЛ }, (_, i) => (
        <span className={s.feather} data-feather key={i} />
      ))}
    </div>
  )
}
