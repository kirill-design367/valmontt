'use client'

import { useEffect } from 'react'

/**
 * Where the griffin's eye sits inside each source photograph, in normalised
 * image coordinates. The lens frame is anchored to these, not to the viewport,
 * so it keeps cropping the eye when `object-fit: cover` trims the picture.
 */
export const EYE = {
  desktop: { x: 0.587, y: 0.238, aspect: 16 / 9 },
  mobile: { x: 0.505, y: 0.232, aspect: 9 / 16 },
} as const

export const MOBILE_QUERY = '(max-width: 767px)'

type Rect = { x: number; y: number; w: number; h: number }

/** The rectangle a `cover` image actually paints into, including the overflow. */
function coverRect(vw: number, vh: number, aspect: number): Rect {
  const viewport = vw / vh
  if (viewport > aspect) {
    const w = vw
    const h = vw / aspect
    return { x: 0, y: (vh - h) / 2, w, h }
  }
  const h = vh
  const w = vh * aspect
  return { x: (vw - w) / 2, y: 0, w, h }
}

/**
 * Publishes the covered image rectangle and the eye position as custom
 * properties on `root`, so eye-anchored elements can be placed in pure CSS
 * and stay correct on 1920×1080, 2560×1440 and 390×844 alike.
 */
export function useStageAnchors(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return

    const mq = window.matchMedia(MOBILE_QUERY)

    const apply = () => {
      const eye = mq.matches ? EYE.mobile : EYE.desktop
      const vw = window.innerWidth
      const vh = window.innerHeight
      const r = coverRect(vw, vh, eye.aspect)
      el.style.setProperty('--eye-x', `${(r.x + eye.x * r.w).toFixed(2)}px`)
      el.style.setProperty('--eye-y', `${(r.y + eye.y * r.h).toFixed(2)}px`)
      el.style.setProperty('--viewport-h', `${vh}px`)
    }

    apply()
    window.addEventListener('resize', apply, { passive: true })
    window.addEventListener('orientationchange', apply)
    mq.addEventListener('change', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
      mq.removeEventListener('change', apply)
    }
  }, [root])
}
