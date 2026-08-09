'use client'

import { useRef } from 'react'
import { useStageAnchors } from '@/lib/stage'
import { useHeroMotion, usePillHover } from '@/lib/motion'
import AppLink from './AppLink'
import Lens from './Lens'
import ScrollDot from './ScrollDot'
import { MENU } from '@/lib/routes'
import { ASSETS, formats, url } from '@/lib/assets'
import s from './Hero.module.css'

const HEADLINE = ['НОЧЬ,', 'КОГДА', 'ГЕРБ', 'ОЖИВАЕТ']

/** Тёмные абстрактные кропы того же снимка — не портреты, а фактура. */
const desk = formats(ASSETS.heroDesktop)
const mob = formats(ASSETS.heroMobile)

const AVATAR_CROPS = ['47% 10%', '61% 36%', '86% 55%', '66% 74%']

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
          <button className={s.burger} type="button" aria-label="Открыть меню">
            <span />
            <span />
          </button>

          <ul className={s.navLinks}>
            {MENU.map((item) => (
              <li key={item.href}>
                <AppLink href={item.href}>{item.label}</AppLink>
              </li>
            ))}
          </ul>

          <span className={s.cart} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M2 4.4h2.1l1.6 8.2h7.9l1.4-6H5.4"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7" cy="15.2" r="1" fill="currentColor" />
              <circle cx="12.6" cy="15.2" r="1" fill="currentColor" />
            </svg>
            <span className={s.cartDot} />
          </span>
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

            <div className={s.pillCol}>
              <AppLink className={s.pill} href="/zapis" ref={pill} data-late>
                Забронировать
                <svg className={s.pillIcon} viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path
                    d="M4.4 10.6 10.6 4.4M5.6 4.4h5v5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </AppLink>

              <ScrollDot />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Передний план: линза на глазу + аватарки ---------- */}
      <div className={s.foreground} data-parallax="fg">
        <div className={s.lensPos}>
          <Lens />
        </div>

        <div className={s.avatars} data-late aria-hidden="true">
          {AVATAR_CROPS.map((pos) => (
            <span
              key={pos}
              className={s.avatar}
              style={
                {
                  // image-set даёт браузеру выбрать формат; на телефоне
                  // аватарки скрыты и фон снимается совсем — иначе кадр
                  // качается вхолостую и утяжеляет LCP
                  '--crop': `image-set(url(${desk.avif}) type("image/avif"), url(${desk.webp}) type("image/webp"), url(${desk.jpg}) type("image/jpeg"))`,
                  '--crop-pos': pos,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </main>
  )
}
