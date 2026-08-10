'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Квест: четыре цифры на кадрах /mesto складываются в код, код открывает
 * дверь на /zapis.
 *
 * Сервера нет и не будет. Прогресс живёт в React-контексте, а sessionStorage
 * держит его при обновлении вкладки — и теряет при её закрытии. Это ровно то
 * поведение, которое просил клиент: перезагрузил — не начинаешь заново,
 * закрыл — проходишь с нуля.
 *
 * Код 1847 — высота горы, она же написана на обороте линзы. Внимательный
 * введёт его, не найдя ни одного маркера: так и задумано.
 */

/** Цифры в порядке маршрута: дорога, ворота, верхний зал, терраса. */
export const ЦИФРЫ = [1, 8, 4, 7] as const
export const КОД = ЦИФРЫ.join('')

const КЛЮЧ = 'valmont-quest'

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

const прочитать = (): Состояние => {
  if (typeof window === 'undefined') return ПУСТО
  try {
    const сырое = window.sessionStorage.getItem(КЛЮЧ)
    if (!сырое) return ПУСТО
    const v = JSON.parse(сырое) as Состояние
    if (!Array.isArray(v.найдено) || v.найдено.length !== 4) return ПУСТО
    return { найдено: v.найдено.map(Boolean), пройден: Boolean(v.пройден) }
  } catch {
    return ПУСТО
  }
}

export function QuestProvider({ children }: { children: React.ReactNode }) {
  // Первый рендер обязан совпасть с серверным, иначе гидратация ругается:
  // читаем хранилище уже после монтирования.
  const [состояние, setСостояние] = useState<Состояние>(ПУСТО)

  useEffect(() => {
    setСостояние(прочитать())
  }, [])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(КЛЮЧ, JSON.stringify(состояние))
    } catch {
      /* приватный режим — переживём, контекст всё равно работает */
    }
  }, [состояние])

  const открыть = useCallback((индекс: number) => {
    setСостояние((v) => {
      if (v.найдено[индекс]) return v
      const найдено = v.найдено.slice()
      найдено[индекс] = true
      return { ...v, найдено }
    })
  }, [])

  const завершить = useCallback(() => {
    setСостояние((v) => ({ ...v, пройден: true }))
  }, [])

  const значение: Квест = {
    ...состояние,
    открыть,
    завершить,
    сколькоНайдено: состояние.найдено.filter(Boolean).length,
  }

  return createElement(Контекст.Provider, { value: значение }, children)
}
