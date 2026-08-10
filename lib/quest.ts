'use client'

import { createContext, createElement, useCallback, useContext, useState } from 'react'

/**
 * Квест: четыре цифры на кадрах /mesto складываются в код, код открывает
 * дверь на /zapis.
 *
 * ПРОГРЕСС ЖИВЁТ ТОЛЬКО В ПАМЯТИ СТРАНИЦЫ. Ни sessionStorage, ни
 * localStorage, ни куки — ничего, что переживает перезагрузку. Провайдер
 * стоит в `app/layout.tsx`, а он в App Router не размонтируется при
 * переходах между маршрутами: значит внутри одной SPA-сессии прогресс
 * сохраняется, а F5 обнуляет всё — найденные цифры, счётчик и статус
 * пройденного.
 *
 * Так и задумано: после перезагрузки человек начинает заново, и код надо
 * вводить снова.
 *
 * Код 1847 — высота горы, она же написана на обороте линзы. Внимательный
 * введёт его, не найдя ни одного маркера: так и задумано.
 */

/** Цифры в порядке маршрута: дорога, ворота, верхний зал, терраса. */
export const ЦИФРЫ = [1, 8, 4, 7] as const
export const КОД = ЦИФРЫ.join('')

type Состояние = { найдено: boolean[]; пройден: boolean }
const ПУСТО: Состояние = { найдено: [false, false, false, false], пройден: false }

type Квест = Состояние & {
  открыть: (индекс: number) => void
  завершить: () => void
  сколькоНайдено: number
}

const Контекст = createContext<Квест>({
  ...ПУСТО,
  открыть: () => {},
  завершить: () => {},
  сколькоНайдено: 0,
})

export const useQuest = () => useContext(Контекст)

export function QuestProvider({ children }: { children: React.ReactNode }) {
  const [состояние, setСостояние] = useState<Состояние>(ПУСТО)

  const открыть = useCallback((индекс: number) => {
    setСостояние((v) => {
      if (v.найдено[индекс]) return v
      const найдено = v.найдено.slice()
      найдено[индекс] = true
      return { ...v, найдено }
    })
  }, [])

  const завершить = useCallback(() => {
    setСостояние((v) => (v.пройден ? v : { ...v, пройден: true }))
  }, [])

  const значение: Квест = {
    ...состояние,
    открыть,
    завершить,
    сколькоНайдено: состояние.найдено.filter(Boolean).length,
  }

  return createElement(Контекст.Provider, { value: значение }, children)
}
