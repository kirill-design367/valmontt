import type { Metadata } from 'next'
import Mesto from '@/components/pages/Mesto'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — место',
  description: 'Дорога, ворота, верхний зал и терраса Вальмонта.',
}

export default function Page() {
  return <Mesto />
}
