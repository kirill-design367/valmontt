'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ASSETS, formats } from '@/lib/assets'
import s from './Lens.module.css'

/** Размытые копии подложки — стекло показывает сквозь себя именно их. */
const набор = (a: Parameters<typeof formats>[0]) => {
  const f = formats(a)
  return `image-set(url(${f.avif}) type("image/avif"), url(${f.webp}) type("image/webp"), url(${f.jpg}) type("image/jpeg"))`
}
const СТЕКЛО = {
  '--glass-desk': набор(ASSETS.heroDesktopGlass),
  '--glass-mob': набор(ASSETS.heroMobileGlass),
  '--glass-desk-back': набор(ASSETS.heroDesktopGlassMirror),
  '--glass-mob-back': набор(ASSETS.heroMobileGlassMirror),
} as React.CSSProperties

/** Лицо: где и по каким правилам. Оборот: где именно и как туда доехать. */
const ЛИЦО = {
  покой: ['ВАЛЬМОНТ', 'ВЕРХНИЙ ЗАЛ', 'ПО СПИСКУ'],
  данные: [
    { t: 'ЧЁРНЫЙ ГАЛСТУК' },
    { t: 'ТЕЛЕФОНЫ НА ВХОДЕ' },
    { t: 'БЕЗ СЪЁМКИ' },
    { t: 'СПИСОК ЗАКРЫТ', crimson: true },
  ],
}
const ОБОРОТ = {
  покой: [
    { t: 'ВАЛЬМОНТ' },
    { t: '47°18′ С.Ш.' },
    { t: '7°02′ В.Д.' },
    { t: '1 847 М НАД УРОВНЕМ МОРЯ', crimson: true },
  ],
  данные: [
    { t: 'ДОРОГА ЗАКРЫВАЕТСЯ В 20:00' },
    { t: 'ПОСЛЕДНИЙ ПОДЪЁМНИК В 19:30' },
    { t: 'ТРАНСФЕР ПО ЗАПРОСУ' },
  ],
}

const УДЕРЖАНИЕ = 400 // мс до разворота на телефоне

/**
 * Оптический прибор на глазу птицы со снимка.
 *
 * Две стороны на одной панели. Наведение уплотняет стекло и меняет подписи —
 * работает и на лице, и на обороте. Клик разворачивает панель вокруг
 * вертикальной оси на 180°: настоящий 3D, perspective на родителе, rotateY на
 * панели, изнанки скрыты. На середине разворота панель стоит ребром и
 * пропадает из кадра — так и задумано.
 *
 * Стекло — испечённые копии подложки, выровненные по тому месту кадра,
 * которое рамка закрывает; для оборота копия отражена, а отсчёт идёт от
 * правого края — после разворота она снова садится ровно на своё место.
 * Ни одного фильтра в рантайме: движение только transform и opacity.
 */
export default function Lens() {
  const root = useRef<HTMLDivElement>(null)
  const [оборот, setОборот] = useState(false)
  const [наведено, setНаведено] = useState(false)

  const тлЛицо = useRef<gsap.core.Timeline | null>(null)
  const тлОборот = useRef<gsap.core.Timeline | null>(null)
  const разворот = useRef<gsap.core.Tween | null>(null)

  /* --------------------------------------------------- таймлайны наведения */
  useEffect(() => {
    const el = root.current
    if (!el) return

    const мало = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const собрать = (сторона: string) => {
      const q = gsap.utils.selector(el)
      const п = (sel: string) => q(`[data-side="${сторона}"] ${sel}`)

      const t = gsap.timeline({ paused: true })
      if (мало) {
        t.set(п('[data-frost-edge]'), { autoAlpha: 1 }, 0)
          .set(п('[data-frost-blur]'), { autoAlpha: 1 }, 0)
          .set(п('[data-rest]'), { autoAlpha: 0 }, 0)
          .set(п('[data-rest-ghost]'), { autoAlpha: 0 }, 0)
          .set(п('[data-fact]'), { autoAlpha: 1, yPercent: 0 }, 0)
        return t
      }

      t
        // стекло ложится на кадр: кромка первой, следом подложка
        .to(п('[data-frost-edge]'), { autoAlpha: 1, duration: 0.16, ease: 'power2.out' }, 0)
        .to(п('[data-frost-blur]'), { autoAlpha: 1, duration: 0.2, ease: 'power2.out' }, 0.03)
        // исходные строки уходят вверх, размытый дубль подхватывает их в пути
        .to(п('[data-rest]'), { yPercent: -115, autoAlpha: 0, duration: 0.18, ease: 'power3.in' }, 0)
        .fromTo(
          п('[data-rest-ghost]'),
          { yPercent: 0, autoAlpha: 0 },
          { yPercent: -115, autoAlpha: 0.6, duration: 0.18, ease: 'power3.in' },
          0,
        )
        .set(п('[data-rest-ghost]'), { autoAlpha: 0 })
        // на их месте проступают данные
        .fromTo(
          п('[data-fact]'),
          { yPercent: 118, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 0.25, stagger: 0.04, ease: 'power3.out' },
          0.12,
        )
      return t
    }

    тлЛицо.current = собрать('face')
    тлОборот.current = собрать('back')

    return () => {
      тлЛицо.current?.kill()
      тлОборот.current?.kill()
      тлЛицо.current = null
      тлОборот.current = null
    }
  }, [])

  /* Наведение всегда играет на ВИДИМОЙ стороне. */
  useEffect(() => {
    const t = оборот ? тлОборот.current : тлЛицо.current
    if (!t) return
    // обратный ход быстрее прямого: стекло уходит за 0.15 против 0.2
    if (наведено) t.timeScale(1).play()
    else t.timeScale(1.33).reverse()
  }, [наведено, оборот])

  /* ------------------------------------------------------------- разворот */
  useEffect(() => {
    const el = root.current
    if (!el) return

    const мало = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    разворот.current?.kill()

    if (мало) {
      gsap.set(el, { rotationY: оборот ? 180 : 0 })
      return
    }

    разворот.current = gsap.to(el, {
      rotationY: оборот ? 180 : 0,
      duration: 0.9,
      ease: 'power3.inOut',
      onComplete: () => {
        // скрытую сторону возвращаем в покой, чтобы следующий показ был чистым
        const скрытая = оборот ? тлЛицо.current : тлОборот.current
        скрытая?.pause(0)
      },
    })
  }, [оборот])

  /* ------------------------------------------------- касания: тап и удержание */
  const таймер = useRef<number | null>(null)
  const держали = useRef(false)
  const старт = useRef({ x: 0, y: 0 })

  const сброс = useCallback(() => {
    if (таймер.current !== null) {
      window.clearTimeout(таймер.current)
      таймер.current = null
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    держали.current = false
    старт.current = { x: e.clientX, y: e.clientY }
    таймер.current = window.setTimeout(() => {
      держали.current = true
      таймер.current = null
      setОборот((v) => !v)
    }, УДЕРЖАНИЕ)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || таймер.current === null) return
    // палец поехал — это скролл, а не удержание
    if (Math.hypot(e.clientX - старт.current.x, e.clientY - старт.current.y) > 10) сброс()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    сброс()
    // короткий тап переключает текст, длинный уже развернул панель
    if (!держали.current) setНаведено((v) => !v)
  }

  useEffect(() => сброс, [сброс])

  const сторона = (
    ключ: 'face' | 'back',
    покой: { t: string; crimson?: boolean }[] | string[],
    данные: { t: string; crimson?: boolean }[],
  ) => (
    <div className={`${s.face} ${ключ === 'back' ? s.back : ''}`} data-side={ключ}>
      <span className={s.frost} data-frost-blur aria-hidden="true">
        <span className={s.glass} />
      </span>
      <span className={s.frostEdge} data-frost-edge aria-hidden="true" />

      <svg className={`${s.arrow} ${ключ === 'back' ? s.arrowBack : ''}`} viewBox="0 0 17 17" fill="none" aria-hidden="true">
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
          {покой.map((строка) => {
            const текст = typeof строка === 'string' ? строка : строка.t
            const малиновая = typeof строка === 'string' ? false : строка.crimson
            return (
              <span className={s.row} key={текст}>
                <span data-rest className={малиновая ? s.crimson : undefined}>
                  {текст}
                </span>
                <span className={s.ghost} data-rest-ghost aria-hidden="true">
                  {текст}
                </span>
              </span>
            )
          })}
        </span>

        <span className={s.facts}>
          {данные.map((f) => (
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

  return (
    <div
      className={s.panel}
      ref={root}
      data-lens
      data-late
      style={СТЕКЛО}
      role="button"
      tabIndex={0}
      aria-label={оборот ? 'Показать лицевую сторону' : 'Показать координаты'}
      aria-pressed={оборот}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setНаведено(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setНаведено(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={сброс}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        // клик синтезируется и после касания — там разворотом рулит удержание
        if ((e.nativeEvent as PointerEvent).pointerType === 'mouse') setОборот((v) => !v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setОборот((v) => !v)
        }
      }}
    >
      {сторона('face', ЛИЦО.покой, ЛИЦО.данные)}
      {сторона('back', ОБОРОТ.покой, ОБОРОТ.данные)}
    </div>
  )
}
