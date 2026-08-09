'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PageShell from '../PageShell'
import { FULL } from '@/lib/reveal'
import { ASSETS, url, type Asset } from '@/lib/assets'
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

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()

      // горизонтальный проезд только там, где есть чем крутить
      mm.add(`${FULL} and (min-width: 768px)`, () => {
        const distance = () => track.scrollWidth - window.innerWidth

        gsap.to(track, {
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
      })
    }, box)

    return () => ctx.revert()
  }, [])

  return (
    <PageShell title="МЕСТО" bare>
      <div className={s.pin} ref={pin}>
        <div className={s.rail} ref={rail}>
          {FRAMES.map((frame, i) => (
            <section className={s.frame} key={frame.name}>
              <img
                src={url(frame.asset)}
                alt={frame.asset.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <span className={s.capIndex}>
                КАДР {['ПЕРВЫЙ', 'ВТОРОЙ', 'ТРЕТИЙ', 'ЧЕТВЁРТЫЙ'][i]}
              </span>
              {frame.asset.todo && <span className={s.todo}>КАДР В РАБОТЕ</span>}
              <div className={s.cap}>
                <span className={s.capName}>{frame.name}</span>
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
