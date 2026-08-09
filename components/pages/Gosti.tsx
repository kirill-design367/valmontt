'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PageShell from '../PageShell'
import { FULL } from '@/lib/reveal'
import { ASSETS, type Asset } from '@/lib/assets'
import Plate from '../Plate'
import s from './Gosti.module.css'

gsap.registerPlugin(ScrollTrigger)

const BEASTS: { name: string; what: string; when: string; asset: Asset }[] = [
  {
    name: 'ГРИФОН',
    what: 'Герб Вальмонта. Орлиная голова, львиное тело, характер обоих.',
    when: 'Выходит в полночь',
    asset: ASSETS.beastGrifon,
  },
  {
    name: 'ВИВЕРНА',
    what: 'Две лапы, две крылатые кости и никакого терпения к чужим.',
    when: 'Выходит в час',
    asset: ASSETS.beastViverna,
  },
  {
    name: 'ЛАМАССУ',
    what: 'Стоит у входа с тех пор, как вход прорубили. Пропускает не всех.',
    when: 'Стоит у ворот всю ночь',
    asset: ASSETS.beastLamassu,
  },
  {
    name: 'КАТОБЛЕПАС',
    what: 'Голову держит опущенной. Так безопаснее — в первую очередь для вас.',
    when: 'Выходит перед рассветом',
    asset: ASSETS.beastKatoblepas,
  },
]

export default function Gosti() {
  const root = useRef<HTMLDivElement>(null)

  /* Смена с перекрытием: следующий блок наезжает поверх предыдущего,
     а предыдущий чуть проваливается вглубь — так стык не читается. */
  useEffect(() => {
    const el = root.current
    if (!el) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add(FULL, () => {
        const blocks = gsap.utils.toArray<HTMLElement>('[data-beast]')

        blocks.forEach((block, i) => {
          const plate = block.querySelector('[data-plate]')
          if (plate) {
            gsap.fromTo(
              plate,
              { yPercent: -7, scale: 1.08 },
              {
                yPercent: 7,
                scale: 1.08,
                ease: 'none',
                scrollTrigger: { trigger: block, start: 'top bottom', end: 'bottom top', scrub: true },
              },
            )
          }
          if (i === blocks.length - 1) return
          // уходящий блок теряет яркость под наезжающим
          gsap.to(block.querySelector('[data-sticky]'), {
            opacity: 0.25,
            ease: 'none',
            scrollTrigger: { trigger: blocks[i + 1], start: 'top bottom', end: 'top top', scrub: true },
          })
        })
      })
    }, el)

    return () => ctx.revert()
  }, [])

  return (
    <PageShell title="ГОСТИ" bare>
      <div className={s.stack} ref={root}>
        {BEASTS.map((beast, i) => (
          <section
            className={`${s.beast} ${i % 2 === 0 ? s.left : s.right}`}
            key={beast.name}
            data-beast
            style={{ zIndex: i + 1 }}
          >
            <div className={s.sticky} data-sticky>
              <div className={s.plate}>
                <Plate asset={beast.asset} data-plate priority={i === 0} />
              </div>
              <div className={s.shade} />

              <span className={s.name}>{beast.name}</span>

              <div className={s.caption}>
                <span className={s.what}>{beast.what}</span>
                <span className={s.when}>{beast.when}</span>
              </div>

              {beast.asset.todo && <span className={s.todo}>КАДР В РАБОТЕ</span>}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  )
}
