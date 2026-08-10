'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useQuest } from '@/lib/quest'
import s from './Marker.module.css'

/**
 * Маркер с цифрой на кадре локации.
 *
 * Тот самый кружок с точкой, который в своё время сняли с обложки: теперь у
 * него есть смысл. В покое — тонкая окружность на 40 % с точкой внутри.
 * Наведение (на телефоне тап) раскрывает цифру, и она остаётся: найденное не
 * теряется, окружность становится малиновой.
 *
 * Двигаем только transform и opacity. Окружность нарисована в конечном
 * размере 64 px и в покое поджата масштабом до 44 — так рост идёт по
 * композитору, без пересчёта лейаута.
 */
export default function Marker({
  индекс,
  цифра,
  x,
  y,
  xМоб,
  yМоб,
}: {
  индекс: number
  цифра: number
  /** доля ШИРИНЫ и ВЫСОТЫ самого снимка, а не рамки: координаты привязаны
      к содержимому кадра и переживают любой кроп. На телефоне показан
      другой снимок — у него свои координаты, выбор делает медиазапрос. */
  x: number
  y: number
  xМоб: number
  yМоб: number
}) {
  const root = useRef<HTMLButtonElement>(null)
  const { найдено, открыть } = useQuest()
  const открыт = найдено[индекс]
  const [наведено, setНаведено] = useState(false)
  const раскрыт = открыт || наведено

  useEffect(() => {
    const el = root.current
    if (!el) return

    const мало = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const q = gsap.utils.selector(el)
    const длит = мало ? 0 : 0.4

    gsap.to(q('[data-ring]'), {
      scale: раскрыт ? 1 : 0.6875, // 44 из 64
      duration: длит,
      ease: 'power3.out',
      overwrite: 'auto',
    })
    gsap.to(q('[data-dot]'), {
      autoAlpha: раскрыт ? 0 : 1,
      duration: длит * 0.5,
      ease: 'power2.out',
      overwrite: 'auto',
    })
    gsap.to(q('[data-digit]'), {
      autoAlpha: раскрыт ? 1 : 0,
      scale: раскрыт ? 1 : 0.6,
      duration: длит,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }, [раскрыт])

  const найти = () => {
    setНаведено(true)
    открыть(индекс)
  }

  return (
    <button
      ref={root}
      type="button"
      className={`${s.marker} ${открыт ? s.found : ''}`}
      style={{ '--x': x, '--y': y, '--xm': xМоб, '--ym': yМоб } as React.CSSProperties}
      data-marker
      data-found={открыт || undefined}
      aria-label={открыт ? `Цифра ${цифра} найдена` : 'Показать цифру'}
      onPointerEnter={(e) => e.pointerType === 'mouse' && найти()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setНаведено(false)}
      onClick={найти}
      onFocus={найти}
    >
      <span className={s.ring} data-ring />
      <span className={s.dot} data-dot />
      <span className={s.digit} data-digit>
        {цифра}
      </span>
    </button>
  )
}
