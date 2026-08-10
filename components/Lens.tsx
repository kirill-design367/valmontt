'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ASSETS, formats } from '@/lib/assets'
import s from './Lens.module.css'

/** Размытые копии подложки — стекло показывает сквозь себя именно их. */
const glassDesk = formats(ASSETS.heroDesktopGlass)
const glassMob = formats(ASSETS.heroMobileGlass)
const set = (f: ReturnType<typeof formats>) =>
  `image-set(url(${f.avif}) type("image/avif"), url(${f.webp}) type("image/webp"), url(${f.jpg}) type("image/jpeg"))`

const REST = ['ГРИФОН', 'ПРОСНЁТСЯ', 'В ПОЛНОЧЬ']
const FACTS = [
  { t: '14 ФЕВРАЛЯ' },
  { t: 'ВЕРХНИЙ ЗАЛ, ВАЛЬМОНТ' },
  { t: 'ЧЁРНЫЙ ГАЛСТУК' },
  { t: 'ОСТАЛОСЬ 12 МЕСТ', crimson: true },
]

/**
 * Оптический прибор на глазу грифона.
 *
 * Чистое стекло, положенное на кадр: сквозь рамку отчётливо читается тот же
 * глаз, что за ней, только чуть смягчённый. Размягчение НЕ считается в
 * браузере — оно испечено в отдельный файл (scripts/make-glass.py) и
 * подставлено картинкой, выровненной ровно по тому месту кадра, которое рамка
 * закрывает. Живого `backdrop-filter` здесь нет: замер показал на нём
 * −10 кадров, потому что под линзой всё время едет параллакс.
 *
 * Белого в стекле 3 %, холодная плёнка на грани заметности, блик — волосяная
 * линия в левом верхнем углу. Рамка неподвижна: ни масштаба по наведению, ни
 * цикла дыхания. Движение — только прозрачность и подписи.
 */
export default function Lens() {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const q = gsap.utils.selector(el)

    const t = gsap.timeline({ paused: true })
    if (reduce) {
      // без движения: состояние переключается мгновенно
      t.set(q('[data-frost-edge]'), { autoAlpha: 1 }, 0)
        .set(q('[data-frost-blur]'), { autoAlpha: 1 }, 0)
        .set(q('[data-rest]'), { autoAlpha: 0 }, 0)
        .set(q('[data-rest-ghost]'), { autoAlpha: 0 }, 0)
        .set(q('[data-fact]'), { autoAlpha: 1, yPercent: 0 }, 0)
    } else {
      t
        // стекло ложится на кадр: кромка первой, следом подложка
        .to(q('[data-frost-edge]'), { autoAlpha: 1, duration: 0.16, ease: 'power2.out' }, 0)
        .to(q('[data-frost-blur]'), { autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, 0.03)
        // исходные строки уходят вверх, размытый дубль подхватывает их в пути
        .to(q('[data-rest]'), { yPercent: -115, autoAlpha: 0, duration: 0.18, ease: 'power3.in' }, 0)
        .fromTo(
          q('[data-rest-ghost]'),
          { yPercent: 0, autoAlpha: 0 },
          { yPercent: -115, autoAlpha: 0.6, duration: 0.18, ease: 'power3.in' },
          0,
        )
        .set(q('[data-rest-ghost]'), { autoAlpha: 0 })
        // на их месте проступают данные вечера
        .fromTo(
          q('[data-fact]'),
          { yPercent: 118, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 0.25, stagger: 0.04, ease: 'power3.out' },
          0.12,
        )
    }
    tl.current = t

    return () => {
      t.kill()
      tl.current = null
    }
  }, [])

  useEffect(() => {
    const t = tl.current
    if (!t) return
    // обратный ход быстрее прямого: стекло уходит за 0.15 против 0.2
    if (open) t.timeScale(1).play()
    else t.timeScale(1.33).reverse()
  }, [open])

  return (
    <div
      className={s.lens}
      ref={root}
      data-lens
      data-late
      role="button"
      tabIndex={0}
      aria-label={open ? 'Скрыть данные вечера' : 'Показать данные вечера'}
      aria-expanded={open}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen((v) => !v)
        }
      }}
    >
      {/* стекло: оба слоя существуют всегда, но в покое сняты из композиции */}
      <span className={s.frost} data-frost-blur aria-hidden="true">
        <span
          className={s.glass}
          style={{ '--glass-desk': set(glassDesk), '--glass-mob': set(glassMob) } as React.CSSProperties}
        />
      </span>
      <span className={s.frostEdge} data-frost-edge aria-hidden="true" />

      <svg className={s.arrow} viewBox="0 0 17 17" fill="none" aria-hidden="true">
        <path
          d="M5 12 12 5M6.3 5H12v5.7"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className={s.caption}>
        <span className={s.stack}>
          {REST.map((line) => (
            <span className={s.row} key={line}>
              <span data-rest>{line}</span>
              <span className={s.ghost} data-rest-ghost aria-hidden="true">
                {line}
              </span>
            </span>
          ))}
        </span>

        <span className={s.facts}>
          {FACTS.map((f) => (
            <span className={s.row} key={f.t}>
              <span data-fact className={f.crimson ? s.crimson : undefined}>
                {f.t}
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}
