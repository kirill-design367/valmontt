'use client'

import { useRef } from 'react'
import AppLink from '../AppLink'
import { useReveal } from '@/lib/reveal'
import { ASSETS, url, type Asset } from '@/lib/assets'
import s from './Home.module.css'

const MANIFEST = [
  'Раз в год гора закрывается.',
  'Внутрь входят те, кого позвали.',
  'Наружу не выходит ничего.',
]

const SLOTS = [
  { time: '21:00', name: 'Открытие ворот' },
  { time: '00:00', name: 'Герб оживает' },
  { time: '04:00', name: 'Последний круг' },
]

const BEASTS: { name: string; asset: Asset }[] = [
  { name: 'ГРИФОН', asset: ASSETS.beastGrifon },
  { name: 'ВИВЕРНА', asset: ASSETS.beastViverna },
  { name: 'ЛАМАССУ', asset: ASSETS.beastLamassu },
  { name: 'КАТОБЛЕПАС', asset: ASSETS.beastKatoblepas },
]

const FINAL_DATE = ['14 ФЕВРАЛЯ']

export default function HomeFlow() {
  const root = useRef<HTMLDivElement>(null)
  useReveal(root, { stagger: 0.08 })

  return (
    <div className={s.flow} ref={root}>
      {/* hero остаётся неподвижным первым экраном — лента наезжает на него */}
      <div className={s.heroSpacer} aria-hidden="true" />

      {/* ---------- Манифест ---------- */}
      <section className={`${s.section} ${s.manifest}`} data-reveal-group>
        <span className={s.tag}>МАНИФЕСТ</span>
        {MANIFEST.map((phrase) => (
          <span className={s.line} key={phrase}>
            <span data-reveal>{phrase}</span>
          </span>
        ))}
      </section>

      {/* ---------- Тизер программы ---------- */}
      <section className={s.section} data-reveal-group>
        <span className={s.tag}>ПРОГРАММА</span>
        <span className={s.line}>
          <span className="t-block" data-reveal style={{ display: 'block' }}>
            Три точки ночи
          </span>
        </span>

        <div className={s.slots}>
          {SLOTS.map((slot) => (
            <AppLink className={s.slot} href="/programma" key={slot.time} data-reveal-fade>
              <span className={s.slotTime}>{slot.time}</span>
              <span className={s.slotName}>{slot.name}</span>
            </AppLink>
          ))}
        </div>
      </section>

      {/* ---------- Тизер бестиария ---------- */}
      <section className={s.section} data-reveal-group>
        <span className={s.tag}>ГОСТИ</span>
        <span className={s.line}>
          <span className="t-block" data-reveal style={{ display: 'block' }}>
            Кого позвали
          </span>
        </span>

        <div className={s.beasts}>
          {BEASTS.map((beast) => (
            <AppLink
              className={s.beastCard}
              href="/gosti"
              key={beast.name}
              data-reveal-fade
              aria-label={`${beast.name} — открыть бестиарий`}
            >
              <img src={url(beast.asset)} alt={beast.asset.alt} loading="lazy" decoding="async" />
              <span className={s.beastName}>{beast.name}</span>
              {beast.asset.todo && <span className={s.beastTodo}>КАДР В РАБОТЕ</span>}
            </AppLink>
          ))}
        </div>
      </section>

      {/* ---------- Финал ---------- */}
      <section className={`${s.section} ${s.final}`} data-reveal-group>
        <div className={s.finalInner}>
          <div className={s.finalDate}>
            {FINAL_DATE.map((d) => (
              <span className={s.line} key={d}>
                <span data-reveal>{d}</span>
              </span>
            ))}
          </div>
          <p className={s.finalPlace} data-reveal-fade>
            Вальмонт, верхний зал
          </p>
          <AppLink className={s.finalCta} href="/zapis" data-reveal-fade>
            Забронировать
            <svg viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path
                d="M4.4 10.6 10.6 4.4M5.6 4.4h5v5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </AppLink>
        </div>
      </section>
    </div>
  )
}
