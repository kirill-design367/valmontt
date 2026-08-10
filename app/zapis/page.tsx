import type { Metadata } from 'next'
import Zapis from '@/components/pages/Zapis'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — приглашение',
  description: 'Запрос на приглашение. Мест немного, и они не продаются.',
}

export default function Page() {
  return <Zapis />
}
