import type { Metadata } from 'next'
import Gosti from '@/components/pages/Gosti'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — вход',
  description: 'Как попасть на вечер: код, подсказки, попытки, приглашение.',
}

export default function Page() {
  return <Gosti />
}
