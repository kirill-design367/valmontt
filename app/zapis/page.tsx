import type { Metadata } from 'next'
import Zamok from '@/components/pages/Zamok'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — замок',
  description: 'Четыре цифры открывают дверь. Код собирается на самом сайте.',
}

export default function Page() {
  return <Zamok />
}
