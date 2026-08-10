import type { Metadata } from 'next'
import { STYLE_SETS } from '../fonts'
import AppLink from '@/components/AppLink'
import s from './fonts.module.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — заголовок обложки',
  description: 'Два варианта набора заголовка и стилистические наборы Pilar.',
}

const plate = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/valmont-desktop.jpg`

const VARIANTS = [
  {
    id: 'dve',
    title: 'А — две строки',
    lines: ['НОЧЬ, КОГДА', 'ГЕРБ ОЖИВАЕТ'],
    cls: 'head2' as const,
    note: 'Кегль 5.3vw — 102 px на 1920. Блок держится в левой половине кадра, до вордмарка остаётся 41 % ширины.',
    live: true,
  },
  {
    id: 'odna',
    title: 'Б — одна строка',
    lines: ['НОЧЬ, КОГДА ГЕРБ ОЖИВАЕТ'],
    cls: 'head1' as const,
    note: 'Двадцать четыре широких знака в строку: кегль падает до 4.2vw — 80 px на 1920, и строка переходит в правую половину кадра. Зазор до вордмарка тот же — 15 %.',
    live: false,
  },
]

export default function FontsPage() {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <span className={s.eyebrow}>Обложка</span>
        <h1 className="t-page">Заголовок — два набора</h1>
        <p className={s.intro}>
          Один и тот же кадр, один и тот же вордмарк, одна и та же гарнитура —
          Pilar&nbsp;Regular. Разница только в том, как разбита фраза. Вариант А
          сейчас стоит на сайте.
        </p>
        <AppLink className={s.back} href="/">
          ← К обложке
        </AppLink>
      </header>

      <section className={s.block}>
        <h2 className="t-block">Как ложится в кадр</h2>
        <div className={`${s.grid} ${s.two}`}>
          {VARIANTS.map((v) => (
            <article key={v.id}>
              <div className={s.stage}>
                <img src={plate} alt="" className={s.plate} loading="lazy" decoding="async" />
                <span className={s.scrim} />
                <h3 className={s[v.cls]}>
                  {v.lines.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </h3>
                <span className={s.word}>ВАЛЬМОНТ</span>
              </div>
              <h3 className={s.caseName}>{v.title}</h3>
              <dl className={s.caseFacts}>
                <div>{v.note}</div>
                <div>
                  <b>{v.live ? 'Стоит на сайте' : 'Вариант на выбор'}</b>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className={s.block}>
        <h2 className="t-block">Стилистические наборы Pilar</h2>
        <p className={s.intro}>
          В файле их три — ss01, ss02, ss03. Слово набрано вертикально в финальном
          кегле и обрезано краями кадра так же, как в бою.
        </p>

        <div className={`${s.grid} ${s.four}`}>
          {STYLE_SETS.map((set) => (
            <article key={set.id}>
              <div className={`${s.stage} ${s.tall}`}>
                <img src={plate} alt="" className={s.plate} loading="lazy" decoding="async" />
                <span
                  className={`${s.word} ${s.wordTall}`}
                  style={set.tag === '—' ? undefined : { fontFeatureSettings: `"${set.tag}" 1` }}
                >
                  ВАЛЬМОНТ
                </span>
              </div>
              <h3 className={s.caseName}>{set.title}</h3>
              <dl className={s.caseFacts}>
                <div>
                  Фича: <b>{set.tag}</b>
                </div>
                <div>{set.note}</div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
