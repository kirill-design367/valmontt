import type { Metadata } from 'next'
import Programma from '@/components/pages/Programma'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — программа ночи',
  description: 'Хронология вечера в горах Вальмонта: от открытия ворот до последнего круга.',
}

export default function Page() {
  return <Programma />
}
