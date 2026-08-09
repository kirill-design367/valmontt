import type { Metadata } from 'next'
import Gosti from '@/components/pages/Gosti'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — гости',
  description: 'Бестиарий Вальмонта: грифон, виверна, ламассу, катоблепас.',
}

export default function Page() {
  return <Gosti />
}
