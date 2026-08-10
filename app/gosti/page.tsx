import type { Metadata } from 'next'
import Gosti from '@/components/pages/Gosti'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — вход',
  description: 'Как попадают на вечер: список, приглашение, телефоны, съёмка.',
}

export default function Page() {
  return <Gosti />
}
