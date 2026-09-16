import type { NextConfig } from 'next'

const config: NextConfig = {
  // Ishlab turgan dev server `.next` ini buzmasdan alohida build tekshirish uchun:
  // NEXT_DIST_DIR=.next-build npx next build
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Rasmlar CDN'dan keladi (TZ 1.6 §1) — base64 emas. Ruxsat etilgan
  // manbalar shu yerda ro'yxatga olinadi, aks holda Next optimizatsiya
  // qilmaydi va rasm umuman ko'rinmaydi.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.cloudflarestorage.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Ommaviy sayt — javob sarlavhalari xavfsizlik uchun qattiqlashtiriladi.
  async headers() {
    return [{
      source: '/:yol*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      ],
    }]
  },
}

export default config
