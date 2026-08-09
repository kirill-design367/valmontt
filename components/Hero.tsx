'use client'

import { useRef } from 'react'
import { useStageAnchors } from '@/lib/stage'
import { useHeroMotion, usePillHover, useTicker } from '@/lib/motion'
import s from './Hero.module.css'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const HEADLINE = ['НОЧЬ,', 'КОГДА', 'ГЕРБ', 'ОЖИВАЕТ']
const MENU = ['ПРОГРАММА', 'ГОСТИ', 'МЕСТО', 'ЗАПИСЬ']
const LENS_CAPTION = ['ГРИФОН', 'ПРОСНЁТСЯ', 'В ПОЛНОЧЬ']

/** Тёмные абстрактные кропы того же снимка — не портреты, а фактура. */
const AVATAR_CROPS = ['56% 64%', '71% 78%', '47% 82%', '63% 55%']

export default function Hero() {
  const root = useRef<HTMLElement>(null)
  const pill = useRef<HTMLButtonElement>(null)

  useTicker()
  useStageAnchors(root)
  useHeroMotion(root)
  usePillHover(pill)

  return (
    <main ref={root} className={s.hero}>
      {/* ---------- Фон ---------- */}
      <div className={s.bgLayer} data-parallax="bg">
        <picture>
          <source media="(max-width: 767px)" srcSet={`${BASE}/valmont-mobile.jpg`} />
          <img
            className={s.bgImage}
            data-bg-image
            src={`${BASE}/valmont-desktop.jpg`}
            alt="Грифон — герб Вальмонта: орлиная голова в три четверти, перья малины, бирюзы и янтаря, уходящие в бронзу"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className={s.vignette} />
      </div>

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
              <li key={item}>
                <a href="#">{item}</a>
              </li>
            ))}
          </ul>

          <button className={s.cart} type="button" aria-label="Корзина, есть непрочитанное">
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
          </button>
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
              <button className={s.pill} type="button" ref={pill} data-late>
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
              </button>

              <span className={s.marker} data-late aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Передний план: линза на глазу + аватарки ---------- */}
      <div className={s.foreground} data-parallax="fg">
        <div className={s.lensPos}>
          <div className={s.lens} data-lens data-late>
            <svg className={s.lensArrow} viewBox="0 0 17 17" fill="none" aria-hidden="true">
              <path
                d="M5 12 12 5M6.3 5H12v5.7"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className={s.lensCaption}>
              {LENS_CAPTION.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </div>
        </div>

        <div className={s.avatars} data-late aria-hidden="true">
          {AVATAR_CROPS.map((pos) => (
            <span
              key={pos}
              className={s.avatar}
              style={
                {
                  '--crop': `url(${BASE}/valmont-desktop.jpg)`,
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
