'use client'

import { useRef } from 'react'
import PageShell from '../PageShell'
import { useReveal } from '@/lib/reveal'
import { useLetterAssembly } from '@/lib/letters'
import s from './Gosti.module.css'

/** Четыре правила входа. Больше на странице ничего нет — и не должно быть. */
const RULES = [
  { name: 'КОД', note: 'Четыре цифры. Все на этом сайте.' },
  { name: 'ПОДСКАЗКИ', note: 'Мы не прячем их. Мы просто не показываем.' },
  { name: 'ПОПЫТКИ', note: 'Не ограничены. Время — да.' },
  { name: 'ПРИГЛАШЕНИЕ', note: 'Открывается один раз и только вам.' },
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
            <li className={s.rule} key={rule.name} data-reveal-group>
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
