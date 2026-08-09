import type { Metadata } from 'next'
import { PAIRS, CANDIDATES, specimenVars } from '../fonts'
import HeroSpecimen from '@/components/HeroSpecimen'
import AppLink from '@/components/AppLink'
import s from './fonts.module.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — отбор пары гарнитур',
  description: 'Три пары «акцидентный × текстовый» на полной композиции hero.',
}

const heroUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/valmont-desktop.jpg`

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

      <section className={s.cands}>
        <h2 className="t-block">Кандидаты на вордмарк</h2>
        <p className={s.intro}>
          Unbounded снят. Пока акцидентная роль возвращена Onest — это рабочее
          состояние, не решение. Ниже три платных кандидата: цены и ссылки
          приведены по моим данным и <b>не проверены запросом</b> — сеть
          песочницы наружу закрыта. Состав глифов у всех трёх <b>не проверен
          бинарно</b>: файлов нет. Образец слова набран подставной гарнитурой
          близких пропорций — он показывает поведение столбца и кегль, но не
          рисунок конкретных знаков.
        </p>

        <div className={s.candGrid}>
          {CANDIDATES.map((c) => (
            <article className={s.cand} key={c.id}>
              <div className={s.candStage}>
                <img src={heroUrl} alt="" className={s.candPlate} loading="lazy" decoding="async" />
                <span
                  className={s.candWord}
                  style={{
                    fontFamily: `var(${c.fallbackVar})`,
                    fontWeight: c.fallbackWeight,
                    fontSize: `calc(9.4cqw * ${c.wordmarkScale})`,
                  }}
                >
                  ВАЛЬМОНТ
                </span>
                <span className={s.candProxy}>ОБРАЗЕЦ ПОДСТАВНОЙ</span>
              </div>

              <h3 className={s.candName}>{c.name}</h3>
              <dl className={s.candFacts}>
                <div>Производитель: <b>{c.foundry}</b></div>
                <div>Цена: <b>{c.price}</b></div>
                <div>
                  Ссылка:{' '}
                  <a href={c.url} target="_blank" rel="noreferrer noopener">
                    {c.url.replace('https://', '')}
                  </a>
                </div>
                <div>Кириллица по cmap: <b>{c.cmapChecked ? 'проверена' : 'не проверена — файла нет'}</b></div>
              </dl>
              <p className={s.note}>{c.note}</p>
            </article>
          ))}
        </div>
      </section>

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
