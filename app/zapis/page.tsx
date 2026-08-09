import type { Metadata } from 'next'
import Zapis from '@/components/pages/Zapis'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — запись',
  description: 'Пригласительный билет на закрытый вечер 14 февраля.',
}

export default function Page() {
  return <Zapis />
}
