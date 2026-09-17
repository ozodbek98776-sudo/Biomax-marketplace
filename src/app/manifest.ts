import type { MetadataRoute } from 'next'

// PWA manifesti — `/manifest.webmanifest` bo'lib beriladi.
//
// Shu fayl tufayli sayt telefonga "ilova" bo'lib o'rnatiladi: bosh ekranda
// o'z belgisi bilan turadi, brauzer manzil satrisiz ochiladi.
//
// Android/Chrome o'rnatish taklifini ko'rsatishi uchun kerak bo'ladiganlar:
// manifest (nomi, `start_url`, `display`, 192 va 512 px ikonka), HTTPS va
// `fetch` hodisasini ushlaydigan servis-ishchi (`public/sw.js`).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'BioMax — onlayn do‘kon',
    short_name: 'BioMax',
    description: 'Mahsulotlarni onlayn buyurtma qiling — biz yetkazib beramiz.',
    lang: 'uz',
    dir: 'ltr',
    // Ilovadan kelgan tashriflar tahlilda ajralib tursin
    start_url: '/?manba=ilova',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#FBF9F8',
    theme_color: '#C62828',
    categories: ['shopping', 'food', 'lifestyle'],
    icons: [
      { src: '/ikonka/ikonka-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/ikonka/ikonka-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Android belgini doira yoki boshqa shaklga kesadi — bu nusxada fon to'liq
      { src: '/ikonka/ikonka-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Katalog', short_name: 'Katalog', url: '/katalog' },
      { name: 'Savatim', short_name: 'Savat', url: '/savat' },
      { name: 'Buyurtmalarim', short_name: 'Buyurtmalar', url: '/kabinet#buyurtmalar' },
    ],
  }
}
