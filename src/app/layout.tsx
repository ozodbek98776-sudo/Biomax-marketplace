import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { sozlama } from '@/lib/sozlama'
import { MAVZU_SKRIPTI } from '@/lib/mavzu'
// Shriftlar o'z serverimizdan — Google Fonts'ga so'rov yo'q (tezlik va maxfiylik).
import '@fontsource/onest/400.css'
import '@fontsource/onest/500.css'
import '@fontsource/onest/600.css'
import '@fontsource/onest/700.css'
import '@fontsource/onest/800.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(sozlama.SAYT_URL),
  title: {
    default: 'BioMax — onlayn do‘kon',
    template: '%s — BioMax',
  },
  description: 'Mahsulotlarni onlayn buyurtma qiling, biz yetkazib beramiz.',
  // Ommaviy sayt: SEO birinchi darajali talab (TZ Q2).
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'BioMax',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF9F8' },
    { media: '(prefers-color-scheme: dark)', color: '#14100F' },
  ],
}

export default function AsosiyTarh({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Sahifa chizilishidan OLDIN mavzu sinfini qo'yadi — qorong'i
            rejimdagi foydalanuvchi bir lahza oq ekran ko'rmasin. */}
        <script dangerouslySetInnerHTML={{ __html: MAVZU_SKRIPTI }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
