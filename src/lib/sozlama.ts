import { z } from 'zod'

// Muhit o'zgaruvchilari — SERVER ISHGA TUSHGANDA tekshiriladi (build paytida
// emas, pastdagi `buildBosqichi` ga qarang).
//
// Nega shu yerda: `process.env.X` ni kod ichida to'g'ridan-to'g'ri o'qish
// eng ko'p uchraydigan ishlab chiqarish nosozligi — o'zgaruvchi yo'q bo'lsa
// ilova ishlayveradi va faqat mijoz buyurtma berganda "undefined" bilan
// yiqiladi. Bu yerda esa noto'g'ri sozlama bilan ilova UMUMAN ko'tarilmaydi
// va xato xabari nima yetishmayotganini aniq aytadi.

const sxema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Marketplace oz jadvallari uchun. ERP jadvallariga tegmaydi. */
  DATABASE_URL: z.string().url('DATABASE_URL togri URL bolishi kerak'),

  /** ERP shartnoma API manzili, masalan http://localhost:3001 */
  ERP_BASE_URL: z.string().url('ERP_BASE_URL togri URL bolishi kerak'),
  /**
   * ERP bilan umumiy HMAC kaliti. Ikkala tomonda BIR XIL bolishi shart.
   * 32 belgidan qisqa kalit qopol kuch hujumiga ochiq.
   */
  ERP_HMAC_SECRET: z.string().min(32, 'ERP_HMAC_SECRET kamida 32 belgi bolishi kerak'),

  /** Seans cookie\'sini imzolash uchun. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET kamida 32 belgi bolishi kerak'),

  /** Saytning tashqi manzili — havolalar va SEO uchun. */
  SAYT_URL: z.string().url().default('http://localhost:3002'),

  /**
   * Sayt nginx kabi teskari proksi ortidami. `true` bolsa mijoz IP\'si
   * `X-Real-IP` dan olinadi (proksi uni ozi yozadi, mijoz soxtalay olmaydi).
   * Proksisiz `true` qoyish XAVFLI: sarlavhani mijozning ozi yuboradi.
   */
  PROKSI_ORQALI: z.enum(['true', 'false']).default('false').transform(q => q === 'true'),
})

export type Sozlama = z.infer<typeof sxema>

/**
 * Vercel saytning manzilini o'zi biladi. SAYT_URL yozilmagan bo'lsa o'shani
 * olamiz, aks holda havolalar va SEO `localhost:3002` ga ishora qilib qolardi.
 * Avval doimiy (production) domen, bo'lmasa shu deploy manzili.
 */
function saytManzili(muhit: NodeJS.ProcessEnv): string | undefined {
  if (muhit.SAYT_URL) return muhit.SAYT_URL
  const vercel = muhit.VERCEL_PROJECT_PRODUCTION_URL || muhit.VERCEL_URL
  return vercel ? `https://${vercel}` : undefined
}

/**
 * `next build` bosqichidamizmi.
 *
 * Build sahifalarni yig'ish uchun har bir modulni ishga tushiradi — shu
 * jumladan shu faylni ham. Maxfiy qiymatlar esa build mashinasida
 * bo'lmasligi mumkin (Vercel'da ular loyiha sozlamalarida turadi va
 * ba'zan faqat bitta muhit uchun belgilanadi). O'shanda build
 * "Failed to collect page data" bilan yiqilardi.
 */
const buildBosqichi =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.SOZLAMANI_TEKSHIRMA === '1'

/**
 * Build paytida yetishmagan qiymat o'rniga qo'yiladigan vaqtinchalik qiymat.
 * Bu bosqichda saytga hech kim kirmaydi va bazaga so'rov ketmaydi (barcha
 * sahifalar dinamik), shuning uchun ular hech qayerda ishlatilmaydi.
 */
const ORINBOSAR: Record<string, string> = {
  DATABASE_URL: 'postgresql://build:build@localhost:5432/build',
  ERP_BASE_URL: 'http://localhost:3001',
  ERP_HMAC_SECRET: 'build-uchun-vaqtinchalik-qiymat-32+',
  SESSION_SECRET: 'build-uchun-vaqtinchalik-qiymat-32+',
  SAYT_URL: 'http://localhost:3002',
}

function oqi(): Sozlama {
  const xom: Record<string, unknown> = { ...process.env, SAYT_URL: saytManzili(process.env) }
  const natija = sxema.safeParse(xom)
  if (natija.success) return natija.data

  const satrlar = natija.error.issues
    .map(i => `  · ${i.path.join('.')}: ${i.message}`)
    .join('\n')

  // Build paytida yiqilmaymiz: yetishmagan qiymat vaqtinchalik bilan
  // almashtiriladi. Haqiqiy tekshiruv server ko'tarilganda (birinchi
  // so'rovda) bo'ladi — noto'g'ri sozlama o'sha yerda darhol ko'rinadi.
  if (buildBosqichi) {
    const tuzatilgan = { ...xom }
    for (const muammo of natija.error.issues) {
      const kalit = String(muammo.path[0])
      if (kalit in ORINBOSAR) tuzatilgan[kalit] = ORINBOSAR[kalit]
    }
    const qayta = sxema.safeParse(tuzatilgan)
    if (qayta.success) {
      console.warn(
        `[sozlama] build paytida quyidagilar yoq yoki notogri:\n${satrlar}\n` +
        '[sozlama] build davom etadi, lekin sayt ISHLASHI uchun ular muhit ' +
        'ozgaruvchilarida bolishi SHART (README → "Vercel\'ga deploy").',
      )
      return qayta.data
    }
  }

  // Ataylab `throw` — ilova notogri sozlama bilan kotarilmasin.
  throw new Error(`Muhit sozlamalari notogri:\n${satrlar}\n\n.env.example dan nusxa oling.`)
}

export const sozlama = oqi()

// Build paytida ogohlantirish bermaymiz: u yerdagi qiymatlar vaqtinchalik.
if (!buildBosqichi && sozlama.NODE_ENV === 'production' && !sozlama.PROKSI_ORQALI) {
  console.warn('[sozlama] PROKSI_ORQALI=false — IP chegarasi hamma mijozga BITTA umumiy hisoblagich boladi')
}

export const ishlabChiqarish = sozlama.NODE_ENV === 'production'
export const rivojlanish = sozlama.NODE_ENV === 'development'
