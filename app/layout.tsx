import type { Metadata, Viewport } from 'next'
import { fontVars } from './fonts'
import SiteChrome from '@/components/SiteChrome'
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
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  )
}
