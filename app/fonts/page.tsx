import type { Metadata } from 'next'
import { STYLE_SETS } from '../fonts'
import AppLink from '@/components/AppLink'
import s from './fonts.module.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — Pilar Regular',
  description: 'Стилистические наборы Pilar и сравнение заголовка hero.',
}

const plate = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/valmont-desktop.jpg`
const HEADLINE = ['НОЧЬ,', 'КОГДА', 'ГЕРБ', 'ОЖИВАЕТ']

export default function FontsPage() {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <span className={s.eyebrow}>Гарнитура вордмарка</span>
        <h1 className="t-page">Pilar Regular</h1>
        <p className={s.intro}>
          CSTM&nbsp;Fonts / type.today, версия 1.3. Подключён локальным файлом,
          сабсет — кириллица, цифры и базовая пунктуация: 341&nbsp;КБ исходника
          ужаты до 45. Состав глифов проверен по таблице cmap в самом бинарнике:
          полный русский алфавит, включая Ё, Ъ, Ь, Щ и Ж, — не потеряно ничего.
          Начертание в файле одно, поэтому вес везде 400, а массу набираем
          кеглем и трекингом. Средний апрош слова ВАЛЬМОНТ — 0.839&nbsp;em
          против 0.728 у Onest: на 15&nbsp;% шире, вся типографика пересчитана.
        </p>
        <AppLink className={s.back} href="/">
          ← К обложке
        </AppLink>
      </header>

      {/* --- стилистические наборы --- */}
      <section className={s.cands}>
        <h2 className="t-block">Стилистические наборы</h2>
        <p className={s.intro}>
          В файле их три — ss01, ss02, ss03. Слово набрано вертикально в финальном
          кегле и обрезано краями кадра так же, как в бою.
        </p>

        <div className={s.candGrid}>
          {STYLE_SETS.map((set) => (
            <article key={set.id}>
              <div className={s.candStage}>
                <img src={plate} alt="" className={s.candPlate} loading="lazy" decoding="async" />
                <span
                  className={s.candWord}
                  style={
                    set.tag === '—'
                      ? undefined
                      : { fontFeatureSettings: `"${set.tag}" 1` }
                  }
                >
                  ВАЛЬМОНТ
                </span>
              </div>
              <h3 className={s.candName}>{set.title}</h3>
              <dl className={s.candFacts}>
                <div>Фича: <b>{set.tag}</b></div>
                <div>{set.note}</div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* --- заголовок hero: Pilar против Onest --- */}
      <section className={s.cands}>
        <h2 className="t-block">Заголовок hero — два варианта</h2>
        <p className={s.intro}>
          Одна и та же композиция, один и тот же кегль. Слева Pilar (рабочий
          вариант), справа Onest. Вордмарк на обоих кадрах — Pilar: он решён.
        </p>

        <div className={s.abGrid}>
          {[
            { id: 'pilar', label: 'Pilar Regular', f: 'var(--font-display-src)' },
            { id: 'onest', label: 'Onest', f: 'var(--font-text-src)' },
          ].map((v) => (
            <article key={v.id}>
              <div className={s.abStage}>
                <img src={plate} alt="" className={s.candPlate} loading="lazy" decoding="async" />
                <span className={s.abScrim} />
                <h3 className={s.abHead} style={{ fontFamily: v.f }}>
                  {HEADLINE.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </h3>
                <span className={s.abWord}>ВАЛЬМОНТ</span>
              </div>
              <h3 className={s.candName}>{v.label}</h3>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
