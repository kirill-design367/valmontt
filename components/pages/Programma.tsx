'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PageShell from '../PageShell'
import { FULL, REDUCE, useReveal } from '@/lib/reveal'
import s from './Programma.module.css'

gsap.registerPlugin(ScrollTrigger)

const NIGHT = [
  { time: '21:00', name: 'Открытие ворот', note: 'Дорога перекрыта с восьми. Пускают по одному, имя сверяют со списком.' },
  { time: '22:00', name: 'Первый круг', note: 'Верхний зал заполняется. Свет держат низким, разговоры — тоже.' },
  { time: '23:00', name: 'Тишина', note: 'Музыка уходит на десять минут. Это единственный раз за ночь.' },
  { time: '00:00', name: 'Герб оживает', note: 'Полночь. То, ради чего всех позвали. Снимать запрещено.' },
  { time: '01:00', name: 'Второй круг', note: 'Гора уже закрыта. Обратной дороги до рассвета нет.' },
  { time: '02:30', name: 'Бестиарий', note: 'Звери выходят в зал. Их четверо, и они не повторяются.' },
  { time: '04:00', name: 'Последний круг', note: 'Свет поднимают на треть. Кто уходит — уходит сейчас.' },
  { time: '06:00', name: 'Ворота', note: 'Открываются во второй и последний раз за ночь.' },
]

export default function Programma() {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLSpanElement>(null)

  useReveal(root, { stagger: 0.06 })

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
            Расписание не сдвигается: гора закрывается по часам, а не по гостям.
          </p>
        </div>

        <div className={s.track} ref={track}>
          <span className={s.rail} aria-hidden="true">
            <span className={s.progress} ref={progress} />
          </span>

          <ol>
            {NIGHT.map((point) => (
              <li className={s.item} key={point.time} data-reveal-group>
                <span className={s.mask}>
                  <span className={s.time} data-reveal>
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
