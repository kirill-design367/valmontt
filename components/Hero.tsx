'use client'

import { useRef } from 'react'
import { useStageAnchors } from '@/lib/stage'
import { useHeroMotion, usePillHover } from '@/lib/motion'
import AppLink from './AppLink'
import Lens from './Lens'
import Feathers from './Feathers'
import { MENU } from '@/lib/routes'
import { ASSETS, formats } from '@/lib/assets'
import s from './Hero.module.css'

/** Две строки горизонтального набора; перенос задаём мы, а не ширина колонки. */
const HEADLINE = ['НОЧЬ, КОГДА', 'ГЕРБ ОЖИВАЕТ']

const desk = formats(ASSETS.heroDesktop)
const mob = formats(ASSETS.heroMobile)

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const pill = useRef<HTMLAnchorElement>(null)

  useStageAnchors(root)
  useHeroMotion(root)
  usePillHover(pill)

  return (
    <main ref={root} className={s.hero}>
      {/* ---------- Фон ---------- */}
      <div className={s.bgLayer} data-parallax="bg">
        <picture>
          <source media="(max-width: 767px)" srcSet={mob.avif} type="image/avif" />
          <source media="(max-width: 767px)" srcSet={mob.webp} type="image/webp" />
          <source media="(max-width: 767px)" srcSet={mob.jpg} />
          <source srcSet={desk.avif} type="image/avif" />
          <source srcSet={desk.webp} type="image/webp" />
          <img
            className={s.bgImage}
            data-bg-image
            src={desk.jpg}
            alt={ASSETS.heroDesktop.alt}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className={s.vignette} />
      </div>

      <div className={s.textScrim} aria-hidden="true" />

      {/* ---------- Вордмарк ---------- */}
      <div className={s.bloomLayer} aria-hidden="true">
        <span className={s.bloomStack}>
          <span className={`${s.bloom} ${s.bloomFar}`} data-bloom="far">
            ВАЛЬМОНТ
          </span>
          <span className={`${s.bloom} ${s.bloomNear}`} data-bloom="near">
            ВАЛЬМОНТ
          </span>
        </span>
      </div>

      <div className={s.wordmarkLayer} data-parallax="mid">
        <h1 className={s.wordmarkStack} data-wordmark-slide>
          <span className={s.wordmark} data-wordmark data-will-change>
            ВАЛЬМОНТ
          </span>
          <span className={`${s.wordmark} ${s.entryGhost}`} data-entry-ghost aria-hidden="true">
            ВАЛЬМОНТ
          </span>
        </h1>
      </div>

      {/* ---------- Интерфейс ---------- */}
      <div className={s.ui} data-parallax="ui">
        <nav className={s.nav} data-late aria-label="Разделы">
          <ul className={s.navLinks}>
            {MENU.map((item) => (
              <li key={item.href}>
                <AppLink href={item.href}>{item.label}</AppLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={s.headline}>
          <h2>
            {HEADLINE.map((line) => (
              <span className={s.line} key={line}>
                <span data-line>{line}</span>
              </span>
            ))}
          </h2>

          <div className={s.lede}>
            <p className={s.ledeText} data-late>
              <span>Закрытый вечер в горах Вальмонта.</span>
              <span>Музыка, свет и звери, которых не существует.</span>
            </p>

            <AppLink className={s.pill} href="/zapis" ref={pill} data-late>
              Забронировать
              <svg className={s.pillIcon} data-pill-icon viewBox="0 0 15 15" fill="none" aria-hidden="true">
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
        </div>
      </div>

      {/* ---------- Передний план: линза на глазу ---------- */}
      <div className={s.foreground} data-parallax="fg">
        <div className={s.lensPos}>
          <Lens />
        </div>
      </div>

      {/* шлейф перьев за курсором — только здесь и только с мышью */}
      <Feathers />
    </main>
  )
}
