'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PageShell from '../PageShell'
import { FULL } from '@/lib/reveal'
import { assembleLetters } from '@/lib/letters'
import { ASSETS, type Asset } from '@/lib/assets'
import Plate from '../Plate'
import s from './Mesto.module.css'

gsap.registerPlugin(ScrollTrigger)

const FRAMES: { name: string; note: string; asset: Asset }[] = [
  { name: 'ДОРОГА', note: 'Последние двенадцать километров без фонарей', asset: ASSETS.placeDoroga },
  { name: 'ВОРОТА', note: 'Открываются один раз за ночь', asset: ASSETS.placeVorota },
  { name: 'ВЕРХНИЙ ЗАЛ', note: 'Здесь стоит герб', asset: ASSETS.placeZal },
  { name: 'ТЕРРАСА', note: 'Отсюда видно, как гора выдыхает', asset: ASSETS.placeTerrasa },
]

export default function Mesto() {
  const pin = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLSpanElement>(null)

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
            },
          })

          if (hint.current) {
            gsap.to(hint.current, {
              opacity: 0,
              ease: 'none',
              scrollTrigger: { trigger: box, start: 'top top', end: '+=220', scrub: true },
            })
          }

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
            .map((el, i) => assembleLetters(el, { seed: i * 977 + 13 }))
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
            <section className={s.frame} key={frame.name}>
              <Plate asset={frame.asset} priority={i === 0} />
              <span className={s.capIndex}>
                КАДР {['ПЕРВЫЙ', 'ВТОРОЙ', 'ТРЕТИЙ', 'ЧЕТВЁРТЫЙ'][i]}
              </span>
              {frame.asset.todo && <span className={s.todo}>КАДР В РАБОТЕ</span>}
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

      <span className={s.hint} ref={hint} aria-hidden="true">
        КРУТИТЕ — ЛЕНТА ЕДЕТ ВБОК
      </span>
    </PageShell>
  )
}
