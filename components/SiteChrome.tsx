'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { curtainNameFor } from '@/lib/routes'
import s from './SiteChrome.module.css'

gsap.registerPlugin(ScrollTrigger)

type Nav = (href: string) => void
const NavContext = createContext<Nav>(() => {})
export const useNavigate = () => useContext(NavContext)

const LenisContext = createContext<Lenis | null>(null)
export const useLenis = () => useContext(LenisContext)

/**
 * Один RAF на весь сайт: Lenis крутится с тикера GSAP, а не своим циклом,
 * поэтому скролл, ScrollTrigger и все таймлайны идут в одном кадре.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const curtain = useRef<HTMLDivElement>(null)
  const name = useRef<HTMLSpanElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const [lenis, setLenis] = useState<Lenis | null>(null)

  /** маршрут, к которому едем; пока он задан — штора внизу не поднимается */
  const pending = useRef<string | null>(null)
  const [curtainName, setCurtainName] = useState('ВАЛЬМОНТ')

  /* ---------------------------------------------------------------- скролл */
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const l = new Lenis({
      autoRaf: false,
      // мягкая инерция без резинки в конце
      lerp: reduce ? 1 : 0.09,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      syncTouch: false,
      overscroll: false,
    })
    lenisRef.current = l
    setLenis(l)

    const drive = (time: number) => l.raf(time * 1000)
    l.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(drive)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(drive)
      l.destroy()
      lenisRef.current = null
    }
  }, [])

  /* -------------------------------------------------------------- переход */
  const navigate = useCallback<Nav>(
    (href) => {
      const here = '/' + pathname.replace(/^\/+|\/+$/g, '')
      const there = '/' + href.replace(/^\/+|\/+$/g, '')
      if (here === there || pending.current) return

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) {
        pending.current = null
        router.push(href)
        return
      }

      pending.current = there
      setCurtainName(curtainNameFor(there))

      const el = curtain.current
      const label = name.current
      if (!el || !label) {
        router.push(href)
        return
      }

      gsap
        .timeline()
        .set(el, { visibility: 'visible' })
        .set(label, { clipPath: 'inset(100% 0% 0% 0%)', opacity: 1 })
        // 1. штора снизу вверх
        .fromTo(
          el,
          { yPercent: 100 },
          { yPercent: 0, duration: 0.5, ease: 'power3.inOut' },
        )
        // 2. имя страницы прочерчивается снизу вверх
        .to(
          label,
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.42, ease: 'power2.out' },
          '-=0.06',
        )
        // 3. уходим за штору — новая страница рисуется в темноте
        .add(() => router.push(href))
    },
    [pathname, router],
  )

  /* Штора уходит только когда новый маршрут уже отрисован. */
  useEffect(() => {
    const here = '/' + pathname.replace(/^\/+|\/+$/g, '')
    if (!pending.current || pending.current !== here) return
    pending.current = null

    const el = curtain.current
    const label = name.current
    if (!el) return

    lenisRef.current?.scrollTo(0, { immediate: true })

    // два кадра, чтобы новая страница успела встать в лейаут под шторой
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        gsap
          .timeline({
            onComplete: () => gsap.set(el, { visibility: 'hidden' }),
          })
          .to(label, { opacity: 0, duration: 0.28, ease: 'power2.in' }, 0.1)
          .to(el, { yPercent: -100, duration: 0.5, ease: 'power3.inOut' }, 0.16)
      }),
    )
  }, [pathname])

  return (
    <LenisContext.Provider value={lenis}>
      <NavContext.Provider value={navigate}>
        {children}

        <div className={s.curtain} ref={curtain} aria-hidden="true">
          <span className={s.stack}>
            <span className={s.nameBloom}>{curtainName}</span>
            <span className={s.name} ref={name}>
              {curtainName}
            </span>
          </span>
        </div>
      </NavContext.Provider>
    </LenisContext.Provider>
  )
}
