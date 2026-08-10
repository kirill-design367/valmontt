'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import PageShell from '../PageShell'
import AppLink from '../AppLink'
import { useReveal } from '@/lib/reveal'
import { usePillHover } from '@/lib/motion'
import { assembleLettersInTime } from '@/lib/letters'
import { КОД, useQuest } from '@/lib/quest'
import s from './Zamok.module.css'

const ПОЛЕЙ = 4

/**
 * Выход с финального экрана — та же пилюля, что на обложке, с тем же
 * наведением. Отдельным компонентом: `usePillHover` цепляется в своём
 * эффекте, а он должен отработать после того, как кнопка появилась в
 * дереве, — на родителе она ещё null.
 */
function ExitPill({ ссылка }: { ссылка: React.RefObject<HTMLAnchorElement | null> }) {
  usePillHover(ссылка)
  return (
    <AppLink className={`pill ${s.exit}`} href="/" ref={ссылка}>
      На главную
      <svg className="pill-icon" data-pill-icon viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M4.4 10.6 10.6 4.4M5.6 4.4h5v5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </AppLink>
  )
}

/**
 * Замок — единственная дверь сайта.
 *
 * Четыре цифры собираются на кадрах /mesto, но код можно ввести и сразу:
 * это высота горы, она написана на обороте линзы. Мешать догадливым не надо.
 *
 * Верный код — главный момент сайта: поля гаснут справа налево, чернота
 * закрывается от краёв к центру четырьмя полосами (только transform), и на
 * чёрном собирается постер той же сборкой из разлетевшихся букв, что и
 * остальные блоки.
 */
export default function Zamok() {
  const root = useRef<HTMLDivElement>(null)
  const поля = useRef<(HTMLInputElement | null)[]>([])
  const ряд = useRef<HTMLDivElement>(null)
  const штора = useRef<HTMLDivElement>(null)
  const финал = useRef<HTMLDivElement>(null)
  const выход = useRef<HTMLAnchorElement>(null)

  const { пройден, завершить } = useQuest()
  const [цифры, setЦифры] = useState<string[]>(Array(ПОЛЕЙ).fill(''))
  const [ошибка, setОшибка] = useState(false)
  // прошёл в этой сессии — дверь уже открыта, показываем постер сразу
  const [открыто, setОткрыто] = useState(false)
  const занято = useRef(false)
  /* Чернота и постер уходят порталом в body. Тело страницы лежит в своём
     контексте наложения (z-index: 10), и любой z-index внутри него ниже
     шапки — без портала меню оставалось бы поверх финального кадра. */
  const [вбоди, setВбоди] = useState(false)
  useEffect(() => setВбоди(true), [])

  useReveal(root, { stagger: 0.07 })

  /* ------------------------------------------------------------- открытие */
  const открыть = useCallback(() => {
    if (занято.current) return
    занято.current = true
    завершить()

    const мало = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const собрать = () => {
      setОткрыто(true)
      requestAnimationFrame(() => {
        const блок = финал.current
        if (!блок) return
        gsap.set(блок, { autoAlpha: 1 })

        // когда встанет на место последняя литера последней строки
        let собрался = 0
        блок.querySelectorAll<HTMLElement>('[data-final]').forEach((el, i) => {
          const { tween } = assembleLettersInTime(el, {
            seed: i * 977 + 41,
            delay: мало ? 0 : 0.15 + i * 0.18,
          })
          if (tween) собрался = Math.max(собрался, tween.delay() + tween.totalDuration())
        })

        /* Выход приходит через 1.2 с ПОСЛЕ сборки, не вместе с ней: пока
           кадр собирается, кнопка сбивала бы момент. */
        gsap.to(выход.current, {
          autoAlpha: 1,
          duration: мало ? 0 : 0.5,
          delay: мало ? 0 : собрался + 1.2,
          ease: 'power2.out',
        })
      })
    }

    if (мало || !штора.current) {
      if (штора.current) {
        gsap.set(штора.current, { autoAlpha: 1 })
        gsap.set(штора.current.querySelectorAll('[data-bar]'), { xPercent: 0, yPercent: 0 })
      }
      собрать()
      return
    }

    gsap
      .timeline()
      // 1. поля гаснут по одному справа налево
      .to(поля.current.filter(Boolean).reverse(), {
        autoAlpha: 0,
        y: -10,
        duration: 0.35,
        stagger: 0.08,
        ease: 'power3.in',
      })
      // 2. чернота наплывает от краёв к центру — четыре полосы, только transform
      .set(штора.current, { autoAlpha: 1 }, 0.2)
      .to(
        штора.current.querySelectorAll('[data-bar]'),
        { xPercent: 0, yPercent: 0, duration: 0.6, ease: 'power2.inOut' },
        0.2,
      )
      // 3. на чёрном собирается постер
      .add(собрать, 0.66)
  }, [завершить])

  /* Возврат на страницу в той же сессии: дверь уже открыта. */
  useEffect(() => {
    // ждём портал: до него штора ещё не в дереве
    if (!пройден || !вбоди || занято.current) return
    занято.current = true
    setОткрыто(true)
    requestAnimationFrame(() => {
      if (штора.current) {
        gsap.set(штора.current, { autoAlpha: 1 })
        gsap.set(штора.current.querySelectorAll('[data-bar]'), { xPercent: 0, yPercent: 0 })
      }
      const блок = финал.current
      if (!блок) return
      gsap.set(блок, { autoAlpha: 1 })
      блок.querySelectorAll<HTMLElement>('[data-final]').forEach((el, i) => {
        assembleLettersInTime(el, { seed: i * 977 + 41, duration: 0.01, stagger: 0 })
      })
      // сюда пришли уже открытыми — момент собирать нечего, выход сразу
      gsap.set(выход.current, { autoAlpha: 1 })
    })
  }, [пройден, вбоди])

  /* ---------------------------------------------------------------- отказ */
  const отказать = useCallback(() => {
    setОшибка(true)
    const мало = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const очистить = () => {
      setЦифры(Array(ПОЛЕЙ).fill(''))
      поля.current[0]?.focus()
    }

    if (мало) {
      очистить()
    } else {
      gsap
        .timeline()
        // дрожание по горизонтали, 0.3 с
        .to(ряд.current, { keyframes: { x: [-9, 8, -6, 5, -3, 0] }, duration: 0.3, ease: 'none' })
        .to(поля.current.filter(Boolean), { autoAlpha: 0, duration: 0.18, ease: 'power2.in' })
        .add(очистить)
        .to(поля.current.filter(Boolean), { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
    }

    window.setTimeout(() => setОшибка(false), 2000)
  }, [])

  const проверить = useCallback(
    (набор: string[]) => {
      const код = набор.join('')
      if (код.length < ПОЛЕЙ) return
      if (код === КОД) открыть()
      else отказать()
    },
    [открыть, отказать],
  )

  /* ------------------------------------------------------------------ ввод */
  const ввести = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const знак = e.target.value.replace(/\D/g, '').slice(-1)
    const набор = цифры.slice()
    набор[i] = знак
    setЦифры(набор)
    if (знак && i < ПОЛЕЙ - 1) поля.current[i + 1]?.focus()
    // код набран целиком — проверяем сразу, Enter для этого не обязателен
    if (набор.every(Boolean)) проверить(набор)
  }

  const клавиша = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      проверить(цифры)
      return
    }
    if (e.key === 'Backspace' && !цифры[i] && i > 0) {
      e.preventDefault()
      const набор = цифры.slice()
      набор[i - 1] = ''
      setЦифры(набор)
      поля.current[i - 1]?.focus()
    }
  }

  /* Вставка кода целиком: раскладываем по полям, откуда бы ни вставили. */
  const вставить = (i: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const знаки = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, ПОЛЕЙ - i).split('')
    if (!знаки.length) return
    e.preventDefault()
    const набор = цифры.slice()
    знаки.forEach((з, k) => { набор[i + k] = з })
    setЦифры(набор)
    поля.current[Math.min(i + знаки.length, ПОЛЕЙ - 1)]?.focus()
    if (набор.every(Boolean)) проверить(набор)
  }

  return (
    <PageShell title="ЗАМОК">
      <div className={s.wrap} ref={root}>
        <div data-reveal-group>
          <h1 className="t-page" data-reveal-fade>
            Замок
          </h1>
          <p className={s.lede} data-reveal-fade>
            Четыре цифры
          </p>
        </div>

        <div className={s.code} ref={ряд} data-reveal-fade>
          {цифры.map((з, i) => (
            <input
              key={i}
              ref={(el) => {
                поля.current[i] = el
              }}
              className={s.cell}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={з}
              aria-label={`Цифра ${i + 1} из ${ПОЛЕЙ}`}
              onChange={ввести(i)}
              onKeyDown={клавиша(i)}
              onPaste={вставить(i)}
            />
          ))}
        </div>

        <p className={`${s.otkaz} ${ошибка ? s.otkazOn : ''}`} aria-live="polite">
          Не сегодня
        </p>
      </div>

      {вбоди &&
        createPortal(
          <>
            {/* чернота: четыре полосы едут к центру, ничего кроме transform */}
            <div className={s.veil} ref={штора} aria-hidden="true">
              <span className={`${s.bar} ${s.barTop}`} data-bar />
              <span className={`${s.bar} ${s.barBottom}`} data-bar />
              <span className={`${s.bar} ${s.barLeft}`} data-bar />
              <span className={`${s.bar} ${s.barRight}`} data-bar />
            </div>

            {открыто && (
              <div className={s.final} ref={финал} aria-live="polite">
                <span className={s.time} data-final>
                  03:47
                </span>
                <span className={s.phrase} data-final>
                  СКАЖИТЕ НА ВХОДЕ: ВЫСОТА
                </span>
                <span className={s.note} data-final>
                  Приглашение действительно на одного
                </span>
                <ExitPill ссылка={выход} />
              </div>
            )}
          </>,
          document.body,
        )}
    </PageShell>
  )
}
