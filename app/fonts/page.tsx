import type { Metadata } from 'next'
import { FONT_SHORTLIST } from '../fonts'
import s from './fonts.module.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — отбор гарнитуры',
  description: 'Три кириллических гротеска для вертикального вордмарка ВАЛЬМОНТ.',
}

export default function FontsPage() {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <span className={s.eyebrow}>Отбор гарнитуры</span>
        <h1 className={s.title}>
          Три гротеска
          <br />
          для вордмарка
        </h1>
        <p className={s.intro}>
          Каждая гарнитура проверена по составу глифов в самом файле, а не по описанию на
          сайте: скрипт <b>scripts/audit-fonts.py</b> открывает бинарник кириллического
          подмножества и сверяет таблицу cmap с полным русским алфавитом, включая Ё.
          Ниже слово набрано вертикально в финальном кегле и обрезано сверху и снизу —
          ровно в тех условиях, в которых оно живёт в hero.
        </p>
        <a className={s.back} href="../">
          ← К обложке
        </a>
      </header>

      <div className={s.grid}>
        {FONT_SHORTLIST.map((font) => (
          <section className={s.card} key={font.id}>
            <div>
              <div className={s.meta}>
                <h2 className={s.name} style={{ fontFamily: `var(${font.varName})` }}>
                  {font.name}
                </h2>
                <span className={s.role}>{font.role}</span>
              </div>

              <p className={s.note}>{font.note}</p>

              <dl className={s.facts}>
                <div>
                  Начертаний: <b>{font.weights}</b> · диапазон веса <b>{font.axis}</b>
                </div>
                <div>
                  Кириллица в файле: <b>полная А–Я, а–я, Ё/ё</b>
                </div>
              </dl>

              <p className={s.letters} style={{ fontFamily: `var(${font.varName})` }}>
                ЖФЩЪЫЬЙЦШЭЮЯ
              </p>
            </div>

            <div className={s.stage}>
              <span className={s.specimen} style={{ fontFamily: `var(${font.varName})` }}>
                ВАЛЬМОНТ
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
