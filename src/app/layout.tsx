import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { sozlama } from '@/lib/sozlama'
import { MAVZU_SKRIPTI } from '@/lib/mavzu'
import { TAKLIF_SKRIPTI } from '@/lib/ilova'
import ServisIshchi from '@/components/sayt/ServisIshchi'
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
  applicationName: 'BioMax',
  // Telefonga o'rnatilganda (PWA): o'z belgisi, brauzer satrisiz ochiladi
  appleWebApp: { capable: true, title: 'BioMax', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/ikonka/ikonka-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/ikonka/ikonka-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/ikonka/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
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
        {/* "Ilovani o'rnatish" taklifini ushlab qoladi — tugma bosilguncha saqlanadi */}
        <script dangerouslySetInnerHTML={{ __html: TAKLIF_SKRIPTI }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <ServisIshchi />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
