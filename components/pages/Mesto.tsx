'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PageShell from '../PageShell'
import { FULL } from '@/lib/reveal'
import { assembleLetters } from '@/lib/letters'
import { ASSETS, пропорция, type Asset } from '@/lib/assets'
import { ЦИФРЫ } from '@/lib/quest'
import Marker from '../Marker'
import Plate from '../Plate'
import RailBeam from '../RailBeam'
import s from './Mesto.module.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Четыре кадра локации. На каждом спрятана цифра кода — маркер стоит в
 * тёмной зоне снимка, подальше от подписи и от центра.
 *
 * КООРДИНАТЫ МАРКЕРОВ — в долях самого снимка, не рамки. Правятся здесь и
 * больше нигде.
 *
 * Как получены. scripts/marker-zone.mjs замеряет фактическую обвязку кадра
 * на пяти разрешениях (шапка, вертикальный номер кадра, нижняя подпись,
 * счётчик) и то, что срезает object-fit: cover, — из этого выходит рамка,
 * свободная на всех разрешениях сразу: wide x 0.25…0.78 y 0.20…0.60,
 * tall x 0.20…0.84 y 0.28…0.70. Центр кадра исключён отдельно: маркер там
 * читается как часть композиции, а не как метка. Внутри рамки
 * scripts/marker-pick.py ищет самое тёмное ровное пятно — низкая средняя
 * яркость и низкий разброс, чтобы тонкая окружность не спорила с рисунком.
 */
const МАРКЕРЫ = [
  { wide: { x: 0.32, y: 0.256 }, tall: { x: 0.282, y: 0.336 } }, // дорога
  { wide: { x: 0.3, y: 0.246 }, tall: { x: 0.302, y: 0.646 } }, // ворота
  { wide: { x: 0.52, y: 0.246 }, tall: { x: 0.662, y: 0.336 } }, // верхний зал
  { wide: { x: 0.32, y: 0.546 }, tall: { x: 0.282, y: 0.346 } }, // терраса
]

const FRAMES: { name: string; note: string; wide: Asset; tall: Asset }[] = [
  { name: 'ДОРОГА', note: 'Двенадцать километров без фонарей', wide: ASSETS.placeDorogaWide, tall: ASSETS.placeDorogaTall },
  { name: 'ВОРОТА', note: 'Дальше пешком', wide: ASSETS.placeVorotaWide, tall: ASSETS.placeVorotaTall },
  { name: 'ВЕРХНИЙ ЗАЛ', note: 'Двести человек, один зал', wide: ASSETS.placeZalWide, tall: ASSETS.placeZalTall },
  { name: 'ТЕРРАСА', note: 'Курить только здесь', wide: ASSETS.placeTerrasaWide, tall: ASSETS.placeTerrasaTall },
]

export default function Mesto() {
  const pin = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  /* Индикатор проезда виден, пока лента не доехала до последнего кадра */
  const [ведётЛента, setВедётЛента] = useState(true)

  useEffect(() => {
    const box = pin.current
    const track = rail.current
    if (!box || !track) return

    let ctx: gsap.Context | undefined
    let отменено = false

    // SplitText режет по текущим метрикам — ждём подмену шрифта
    document.fonts.ready.then(() => {
      if (отменено) return

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia()

        // горизонтальный проезд только там, где есть чем крутить
        mm.add(`${FULL} and (min-width: 768px)`, () => {
          const distance = () => track.scrollWidth - window.innerWidth

          const лента = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
              trigger: box,
              start: 'top top',
              end: () => '+=' + distance(),
              pin: true,
              scrub: 0.6,
              invalidateOnRefresh: true,
              anticipatePin: 1,
              /* Индикатор гаснет, когда лента доехала: 0.97 — это последний
                 кадр уже на месте. Гистерезис в 0.04 не даёт ему мигать на
                 границе, когда scrub качает прогресс туда-сюда. */
              onUpdate: (self) => {
                if (self.progress >= 0.97) setВедётЛента(false)
                else if (self.progress < 0.93) setВедётЛента(true)
              },
            },
          })

          /* Имена кадров собираются не по вертикальному скроллу, а по
             положению самого кадра в ленте: старт и финиш считаются от
             левого края через containerAnimation. */
          const откаты = gsap.utils
            .toArray<HTMLElement>('[data-letters]')
            .map((el, i) =>
              assembleLetters(el, {
                seed: i * 977 + 13,
                containerAnimation: лента,
                start: 'left 84%',
                end: 'left 34%',
              }),
            )
          return () => откаты.forEach((f) => f())
        })

        // на телефоне кадры идут обычной вертикальной лентой
        mm.add(`${FULL} and (max-width: 767px)`, () => {
          const откаты = gsap.utils
            .toArray<HTMLElement>('[data-letters]')
            .map((el, i) => assembleLetters(el, { seed: i * 977 + 13, индекс: i }))
          return () => откаты.forEach((f) => f())
        })
      }, box)

      ScrollTrigger.refresh()
    })

    return () => {
      отменено = true
      ctx?.revert()
    }
  }, [])

  return (
    <PageShell title="МЕСТО" bare>
      <div className={s.pin} ref={pin}>
        <div className={s.rail} ref={rail}>
          {FRAMES.map((frame, i) => (
            <section
              className={s.frame}
              key={frame.name}
              style={
                {
                  // фактические пропорции присланных файлов, не номинальные:
                  // по ним CSS строит прямоугольник, который занимает кадр
                  // после object-fit: cover
                  '--ar': пропорция(frame.wide),
                  '--ar-mob': пропорция(frame.tall),
                } as React.CSSProperties
              }
            >
              <Plate asset={frame.wide} mobile={frame.tall} priority={i === 0} />

              {/* система координат самого снимка — маркер живёт в ней */}
              <div className={s.stage}>
                <Marker
                  индекс={i}
                  цифра={ЦИФРЫ[i]}
                  x={МАРКЕРЫ[i].wide.x}
                  y={МАРКЕРЫ[i].wide.y}
                  xМоб={МАРКЕРЫ[i].tall.x}
                  yМоб={МАРКЕРЫ[i].tall.y}
                />
              </div>

              <div className={s.cap}>
                <span className={s.capName} data-letters>
                  {frame.name}
                </span>
                <span className={s.capNote}>{frame.note}</span>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* вместо надписи про прокрутку — световая полоса внизу экрана */}
      <RailBeam виден={ведётЛента} />
    </PageShell>
  )
}
