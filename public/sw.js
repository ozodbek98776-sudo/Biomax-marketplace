/* BioMax servis-ishchisi.
 *
 * Ikki vazifasi bor:
 *   1. Ilova o'rnatiladigan bo'lishi — Chrome `fetch` hodisasini ushlaydigan
 *      servis-ishchini talab qiladi, aks holda "O'rnatish" taklifi chiqmaydi.
 *   2. Internet uzilganda oq ekran emas, tushunarli sahifa ko'rinsin.
 *
 * QOIDA: avval tarmoq, keyin kesh. Narx, qoldiq va buyurtma holati doim
 * jonli bo'lishi kerak — eskirgan sahifa ko'rsatilsa mijoz yo'q mahsulotga
 * buyurtma berib qo'yadi. Keshga faqat o'zgarmaydigan fayllar (ikonka,
 * `_next/static` — nomida versiyasi bor) va oflayn sahifa tushadi.
 *
 * `/api/*` hech qachon keshlanmaydi: u yerda shaxsiy ma'lumot bor.
 */

const KESH = 'biomax-v1'
const OFLAYN = '/oflayn'
/** Doimiy fayllar: nomi o'zgarmasa mazmuni ham o'zgarmaydi. */
const DOIMIY = [/^\/_next\/static\//, /^\/ikonka\//]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(KESH)
      .then(kesh => kesh.addAll([OFLAYN, '/ikonka/ikonka-192.png']))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomlar => Promise.all(nomlar.filter(n => n !== KESH).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', event => {
  // Yangi versiya chiqqanda sahifa "kutma, darhol almash" deb aytadi
  if (event.data === 'DARHOL_ALMASH') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const sorov = event.request
  if (sorov.method !== 'GET') return

  const url = new URL(sorov.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  const doimiy = DOIMIY.some(n => n.test(url.pathname))

  if (doimiy) {
    // Avval kesh (tez), keyin fon rejimida yangilash
    event.respondWith(
      caches.match(sorov).then(keshdan => {
        const tarmoqdan = fetch(sorov)
          .then(javob => {
            if (javob.ok) caches.open(KESH).then(k => k.put(sorov, javob.clone())).catch(() => {})
            return javob
          })
          .catch(() => keshdan)
        return keshdan || tarmoqdan
      }),
    )
    return
  }

  // Sahifalar: avval tarmoq; internet yo'q bo'lsa oflayn sahifa
  if (sorov.mode === 'navigate') {
    event.respondWith(
      fetch(sorov).catch(() => caches.match(OFLAYN).then(j => j || new Response(
        '<!doctype html><meta charset="utf-8"><title>Internet yo‘q</title><p>Internet aloqasi yo‘q.',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
      ))),
    )
  }
})
