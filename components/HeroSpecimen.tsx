import { ASSETS, url } from '@/lib/assets'
import type { Pair } from '@/app/fonts'
import s from './HeroSpecimen.module.css'

const HEADLINE = ['НОЧЬ,', 'КОГДА', 'ГЕРБ', 'ОЖИВАЕТ']
const MENU = ['ПРОГРАММА', 'ГОСТИ', 'МЕСТО', 'ЗАПИСЬ']

/**
 * Кадр hero целиком, набранный одной парой. Не отдельное слово, а вся
 * композиция в финальных кеглях на настоящем фоне — сравнивать надо кадрами.
 *
 * Вордмарк обрезан краями рамки так же, как в бою: слово целиком показывает
 * только финальный блок главной.
 */
export default function HeroSpecimen({ pair }: { pair: Pair }) {
  return (
    <div
      className={s.frame}
      style={
        {
          '--f-display': `var(${pair.displayVar})`,
          '--f-text': `var(${pair.textVar})`,
          '--w-display': pair.displayWeight,
          '--wordmark-k': pair.wordmarkScale,
        } as React.CSSProperties
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.plate} src={url(ASSETS.heroDesktop)} alt="" loading="lazy" decoding="async" />
      <div className={s.scrim} />

      <nav className={s.nav}>
        <span className={s.burger}>
          <span />
          <span />
        </span>
        <ul className={s.links}>
          {MENU.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <span className={s.cart}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4.4h2.1l1.6 8.2h7.9l1.4-6H5.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7" cy="15.2" r="1" fill="currentColor" />
            <circle cx="12.6" cy="15.2" r="1" fill="currentColor" />
          </svg>
          <span className={s.dot} />
        </span>
      </nav>

      <div className={s.wordmarkLayer} aria-hidden="true">
        <span className={s.wordmarkBloom}>ВАЛЬМОНТ</span>
        <span className={s.wordmark}>ВАЛЬМОНТ</span>
      </div>

      <div className={s.copy}>
        <h3 className={s.headline}>
          {HEADLINE.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </h3>
        <div className={s.lede}>
          <p>
            <span>Закрытый вечер в горах Вальмонта.</span>
            <span>Музыка, свет и звери, которых не существует.</span>
          </p>
          <span className={s.pill}>
            Забронировать
            <svg viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M4.4 10.6 10.6 4.4M5.6 4.4h5v5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}
