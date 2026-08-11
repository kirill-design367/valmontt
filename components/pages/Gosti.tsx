'use client'

import { useRef } from 'react'
import PageShell from '../PageShell'
import { useReveal } from '@/lib/reveal'
import { useLetterAssembly } from '@/lib/letters'
import s from './Gosti.module.css'

/**
 * Шесть правил входа: сначала четыре, обещанные карточками на главной,
 * затем два про квест. Раньше здесь были только правила квеста, и человек,
 * кликнувший по карточке «ТЕЛЕФОНЫ», попадал на страницу, где про телефоны
 * ничего не сказано.
 *
 * `id` — якорь для карточки с главной: она ведёт не на страницу вообще, а
 * на своё правило.
 */
const RULES = [
  { id: 'spisok', name: 'СПИСОК', note: 'Закрывается за месяц. Мы его не публикуем.' },
  { id: 'priglashenie', name: 'ПРИГЛАШЕНИЕ', note: 'Приходит один раз, на бумаге, на одного.' },
  { id: 'telefony', name: 'ТЕЛЕФОНЫ', note: 'Сдаются на въезде. Возвращаются на выезде.' },
  { id: 'syomka', name: 'СЪЁМКА', note: 'Запрещена везде, включая террасу.' },
  { id: 'kod', name: 'КОД', note: 'Четыре цифры. Все на этом сайте.' },
  { id: 'podskazki', name: 'ПОДСКАЗКИ', note: 'Мы не прячем их. Мы просто не показываем.' },
]

/**
 * Вход — правила, а не бестиарий.
 *
 * Изображений нет ни одного: страница держится типографикой и воздухом,
 * как хронология. Вертикальный приём остаётся — слово ВХОД идёт вдоль
 * правого края в раме страницы.
 */
export default function Gosti() {
  const root = useRef<HTMLDivElement>(null)

  useReveal(root, { stagger: 0.06 })
  useLetterAssembly(root)

  return (
    <PageShell title="ВХОД">
      <div className={s.wrap} ref={root}>
        <div data-reveal-group>
          <span className={s.mask}>
            <span className="t-page" style={{ display: 'block' }} data-reveal>
              Вход
            </span>
          </span>
        </div>

        <ol className={s.rules}>
          {RULES.map((rule) => (
            <li className={s.rule} key={rule.id} id={rule.id} data-reveal-group>
              <span className={`${s.mask} ${s.free}`}>
                <span className={s.name} data-letters>
                  {rule.name}
                </span>
              </span>
              <span className={s.note} data-reveal-fade>
                {rule.note}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </PageShell>
  )
}
