import type { Metadata, Viewport } from 'next'
import { fontVars } from './fonts'
import SiteChrome from '@/components/SiteChrome'
import QuestProgress from '@/components/QuestProgress'
import { QuestProvider } from '@/lib/quest'
import './globals.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — вечер без свидетелей',
  description: 'Закрытая вечеринка в горах Вальмонта. Только по приглашениям.',
}

export const viewport: Viewport = {
  themeColor: '#07070a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontVars}>
      <body>
        {/* Прогресс квеста живёт выше маршрутов: переход между страницами
            не должен его терять. */}
        <QuestProvider>
          <SiteChrome>{children}</SiteChrome>
          <QuestProgress />
        </QuestProvider>
      </body>
    </html>
  )
}
