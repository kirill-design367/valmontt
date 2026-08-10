import type { Metadata } from 'next'
import Programma from '@/components/pages/Programma'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — программа ночи',
  description: 'Хронология ночи: от сбора в девять вечера до разъезда в шесть утра.',
}

export default function Page() {
  return <Programma />
}
