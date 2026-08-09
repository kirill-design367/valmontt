import type { Metadata, Viewport } from 'next'
import { fontVars } from './fonts'
import SiteChrome from '@/components/SiteChrome'
import './globals.css'

export const metadata: Metadata = {
  title: 'ВАЛЬМОНТ — ночь, когда герб оживает',
  description:
    'Закрытый вечер в горах Вальмонта. Музыка, свет и звери, которых не существует.',
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
