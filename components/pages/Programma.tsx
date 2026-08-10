'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PageShell from '../PageShell'
import { FULL, REDUCE, useReveal } from '@/lib/reveal'
import { useLetterAssembly } from '@/lib/letters'
import s from './Programma.module.css'

gsap.registerPlugin(ScrollTrigger)

const NIGHT = [
  { time: '21:00', name: 'Сбор', note: 'Дорога перекрыта с восьми. Пускают по одному, имя сверяют со списком.' },
  { time: '22:00', name: 'Гардероб', note: 'Телефоны сдают здесь же, взамен выдают номерок.' },
  { time: '23:00', name: 'Первый сет', note: 'Верхний зал заполняется. Свет держат низким, разговоры — тоже.' },
  { time: '00:00', name: 'Перерыв', note: 'Двадцать минут тишины. Единственная пауза за ночь.' },
  { time: '01:00', name: 'Основной сет', note: 'Три часа без остановки. То, ради чего всех позвали.' },
  { time: '03:00', name: 'Терраса', note: 'Открывают выход наружу. Курить можно только там.' },
  { time: '04:00', name: 'Закрытие', note: 'Свет поднимают на треть. Кто уходит — уходит сейчас.' },
  { time: '06:00', name: 'Разъезд', note: 'Ворота открывают во второй и последний раз за ночь.' },
]

export default function Programma() {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLSpanElement>(null)

  useReveal(root, { stagger: 0.06 })
  useLetterAssembly(root)

  /* Индикатор привязан к прогрессу скролла по самой хронологии. */
  useEffect(() => {
    const el = progress.current
    const box = track.current
    if (!el || !box) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add(FULL, () => {
        gsap.fromTo(
          el,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: box,
              start: 'top 62%',
              end: 'bottom 88%',
              scrub: 0.4,
            },
          },
        )
      })
      mm.add(REDUCE, () => gsap.set(el, { scaleY: 1 }))
    }, box)

    return () => ctx.revert()
  }, [])

  return (
    <PageShell title="ПРОГРАММА">
      <div className={s.wrap} ref={root}>
        <div data-reveal-group>
          <span className={s.mask}>
            <span className="t-page" style={{ display: 'block' }} data-reveal>
              Хронология ночи
            </span>
          </span>
          <p className={s.lede} data-reveal-fade>
            Девять часов от первых фар на серпантине до второго открытия ворот.
            Расписание не сдвигается: зал работает по часам, а не по гостям.
          </p>
        </div>

        <div className={s.track} ref={track}>
          <span className={s.rail} aria-hidden="true">
            <span className={s.progress} ref={progress} />
          </span>

          <ol>
            {NIGHT.map((point) => (
              <li className={s.item} key={point.time} data-reveal-group>
                <span className={`${s.mask} ${s.free}`}>
                  <span className={s.time} data-letters>
                    {point.time}
                  </span>
                </span>
                <span className={s.name} data-reveal-fade>
                  {point.name}
                </span>
                <span className={s.note} data-reveal-fade>
                  {point.note}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </PageShell>
  )
}
