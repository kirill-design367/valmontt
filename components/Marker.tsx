'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { REDUCE } from '@/lib/reveal'
import { useQuest } from '@/lib/quest'
import s from './Marker.module.css'

/**
 * Маркер с цифрой на кадре локации.
 *
 * Цифра показывается ТОЛЬКО по клику (на телефоне — по тапу), держится две
 * секунды и гаснет насовсем: в пределах этой загрузки страницы её больше не
 * увидеть. Повторный клик ничего не открывает. Наведение цифру не показывает
 * — только подращивает окружность, чтобы метка читалась как нажимаемая.
 *
 * Смысл: код надо запомнить или записать. Маркер после этого остаётся
 * малиновым — видно, что здесь уже нашли, но не видно, что именно.
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
  /* Показывали ли цифру в ЭТОЙ загрузке страницы. Намеренно не уходит в
     sessionStorage: «до перезагрузки страницы её больше не увидеть». */
  const показана = useRef(false)
  const лента = useRef<gsap.core.Timeline | null>(null)

  /* Окружность реагирует на наведение и на находку. Цифра сюда не входит:
     ею управляет только клик. */
  useEffect(() => {
    const el = root.current
    if (!el) return
    const мало = window.matchMedia(REDUCE).matches
    gsap.to(el.querySelectorAll('[data-ring]'), {
      scale: наведено || открыт ? 1 : 0.6875, // 44 из 64
      duration: мало ? 0 : 0.4,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }, [наведено, открыт])

  useEffect(() => () => { лента.current?.kill() }, [])

  const показать = () => {
    const el = root.current
    if (!el || показана.current) return
    показана.current = true
    открыть(индекс)

    const мало = window.matchMedia(REDUCE).matches
    const q = gsap.utils.selector(el)
    лента.current?.kill()
    лента.current = gsap
      .timeline()
      // точка уступает место цифре
      .to(q('[data-dot]'), { autoAlpha: 0, duration: мало ? 0 : 0.2, ease: 'power2.out' }, 0)
      .fromTo(
        q('[data-digit]'),
        { autoAlpha: 0, scale: 0.6 },
        { autoAlpha: 1, scale: 1, duration: мало ? 0 : 0.4, ease: 'power3.out' },
        0,
      )
      // держится две секунды и уходит — уже навсегда
      .to(q('[data-digit]'), {
        autoAlpha: 0,
        scale: 0.6,
        duration: мало ? 0 : 0.45,
        ease: 'power2.in',
        delay: 2,
      })
      // точка возвращается: метка снова читается, но уже малиновая и немая
      .to(q('[data-dot]'), { autoAlpha: 1, duration: мало ? 0 : 0.3, ease: 'power2.out' }, '<0.15')
  }

  return (
    <button
      ref={root}
      type="button"
      className={`${s.marker} ${открыт ? s.found : ''}`}
      style={{ '--x': x, '--y': y, '--xm': xМоб, '--ym': yМоб } as React.CSSProperties}
      data-marker
      data-found={открыт || undefined}
      aria-label={открыт ? `Цифра ${цифра} уже найдена` : 'Показать цифру'}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setНаведено(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setНаведено(false)}
      onClick={показать}
    >
      <span className={s.ring} data-ring />
      <span className={s.dot} data-dot />
      <span className={s.digit} data-digit aria-hidden="true">
        {цифра}
      </span>
    </button>
  )
}
