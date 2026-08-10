'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useQuest } from '@/lib/quest'
import s from './QuestProgress.module.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Счётчик найденных цифр: четыре кружка в правом нижнем углу.
 *
 * Появляется после первой находки и исчезает, когда квест пройден. На
 * обложке главной его нет — там первый экран отдан кадру; он выходит вместе
 * с бургером, как только обложка пролистана.
 */
export default function QuestProgress() {
  const root = useRef<HTMLDivElement>(null)
  const { найдено, сколькоНайдено, пройден } = useQuest()
  const pathname = usePathname()
  const главная = '/' + pathname.replace(/^\/+|\/+$/g, '') === '/'

  const видим = сколькоНайдено > 0 && !пройден

  /* На главной ждём, пока обложка уедет; на остальных страницах показываем
     сразу — там первого экрана-кадра нет. */
  useEffect(() => {
    const el = root.current
    if (!el) return

    const мало = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const показать = (on: boolean) =>
      gsap.to(el, {
        autoAlpha: on ? 1 : 0,
        y: on ? 0 : 8,
        duration: мало ? 0 : on ? 0.45 : 0.3,
        ease: on ? 'power3.out' : 'power3.in',
        overwrite: true,
      })

    if (!видим) {
      показать(false)
      return
    }

    if (!главная) {
      показать(true)
      return
    }

    const st = ScrollTrigger.create({
      start: () => window.innerHeight * 0.75,
      end: () => ScrollTrigger.maxScroll(window),
      onToggle: (self) => показать(self.isActive),
    })
    показать(st.isActive)
    return () => st.kill()
  }, [видим, главная])

  return (
    <div className={s.progress} ref={root} aria-hidden={!видим}>
      {найдено.map((есть, i) => (
        <span className={`${s.dot} ${есть ? s.on : ''}`} key={i} />
      ))}
    </div>
  )
}
