import type { Metadata } from 'next'
import { PAIRS, specimenVars } from '../fonts'
import HeroSpecimen from '@/components/HeroSpecimen'
import AppLink from '@/components/AppLink'
import s from './fonts.module.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — отбор пары гарнитур',
  description: 'Три пары «акцидентный × текстовый» на полной композиции hero.',
}

export default function FontsPage() {
  return (
    <div className={`${s.page} ${specimenVars}`}>
      <header className={s.head}>
        <span className={s.eyebrow}>Отбор пары гарнитур</span>
        <h1 className="t-page">
          Три пары
          <br />
          на одном кадре
        </h1>
        <p className={s.intro}>
          Не отдельное слово, а вся композиция hero каждой парой: вордмарк,
          заголовок в четыре строки, подзаголовок, пункты навигации — в финальных
          кеглях, на настоящем фоне. Вордмарк обрезан краями кадра так же, как в
          бою. Состав глифов у всех шести проверен по таблице cmap в самом
          бинарнике (<b>scripts/audit-fonts.py</b>), а не по описанию на сайте:
          полный русский алфавит, включая Ё.
        </p>
        <AppLink className={s.back} href="/">
          ← К обложке
        </AppLink>
      </header>

      <div className={s.grid}>
        {PAIRS.map((pair) => (
          <section className={s.card} key={pair.id}>
            <div className={s.meta}>
              <h2 className={s.name} style={{ fontFamily: `var(${pair.displayVar})` }}>
                {pair.title}
              </h2>
              <span className={s.role}>{pair.role}</span>
            </div>

            <HeroSpecimen pair={pair} />

            <div className={s.below}>
              <p className={s.note}>{pair.note}</p>
              <dl className={s.facts}>
                <div>
                  Кегль вордмарка: <b>×{pair.wordmarkScale.toFixed(2)}</b> от рабочего
                </div>
                <div>
                  Проблемные знаки:{' '}
                  <b style={{ fontFamily: `var(${pair.displayVar})`, fontWeight: pair.displayWeight }}>
                    ЖФЩЪЫЬЙЦШЭЮЯ
                  </b>
                </div>
                <div>
                  Текстовый в 11px:{' '}
                  <b className={s.tiny} style={{ fontFamily: `var(${pair.textVar})` }}>
                    ПРОГРАММА · ГОСТИ · МЕСТО · ЗАПИСЬ
                  </b>
                </div>
              </dl>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
