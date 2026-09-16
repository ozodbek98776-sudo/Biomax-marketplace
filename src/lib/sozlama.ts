import { z } from 'zod'

// Muhit o'zgaruvchilari — ISHGA TUSHISHDA tekshiriladi.
//
// Nega shu yerda: `process.env.X` ni kod ichida to'g'ridan-to'g'ri o'qish
// eng ko'p uchraydigan ishlab chiqarish nosozligi — o'zgaruvchi yo'q bo'lsa
// ilova ishlayveradi va faqat mijoz buyurtma berganda "undefined" bilan
// yiqiladi. Bu yerda esa noto'g'ri sozlama bilan ilova UMUMAN ko'tarilmaydi
// va xato xabari nima yetishmayotganini aniq aytadi.

const sxema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Marketplace o'z jadvallari uchun. ERP jadvallariga tegmaydi. */
  DATABASE_URL: z.string().url('DATABASE_URL to‘g‘ri URL bo‘lishi kerak'),

  /** ERP shartnoma API manzili, masalan http://localhost:3001 */
  ERP_BASE_URL: z.string().url('ERP_BASE_URL to‘g‘ri URL bo‘lishi kerak'),
  /**
   * ERP bilan umumiy HMAC kaliti. Ikkala tomonda BIR XIL bo'lishi shart.
   * 32 belgidan qisqa kalit qo'pol kuch hujumiga ochiq.
   */
  ERP_HMAC_SECRET: z.string().min(32, 'ERP_HMAC_SECRET kamida 32 belgi bo‘lishi kerak'),

  /** Seans cookie'sini imzolash uchun. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET kamida 32 belgi bo‘lishi kerak'),

  /** Saytning tashqi manzili — havolalar va SEO uchun. */
  SAYT_URL: z.string().url().default('http://localhost:3002'),

  /**
   * Kirish kodi qayerga yuboriladi:
   *   · `telegram` — ERP orqali mijozning Telegram profiliga (do'konning
   *     mijozlarga chek yuboradigan akkaunti). Ishlab chiqarishda shu.
   *   · `konsol` — hech qayerga yuborilmaydi, kod ekranda va jurnalda
   *     ko'rinadi. FAQAT rivojlanish uchun: lokal ERP jonli Telegram
   *     sessiyasiga ulanib ketsa, serverdagi sessiya bekor bo'lishi mumkin.
   */
  KOD_KANALI: z.enum(['telegram', 'konsol']).optional(),

  /**
   * Sayt nginx kabi teskari proksi ortidami. `true` bo'lsa mijoz IP'si
   * `X-Real-IP` dan olinadi (proksi uni o'zi yozadi, mijoz soxtalay olmaydi).
   * Proksisiz `true` qo'yish XAVFLI: sarlavhani mijozning o'zi yuboradi.
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

function oqi(): Sozlama {
  const natija = sxema.safeParse({ ...process.env, SAYT_URL: saytManzili(process.env) })
  if (!natija.success) {
    const satrlar = natija.error.issues
      .map(i => `  · ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    // Ataylab `throw` — ilova noto'g'ri sozlama bilan ko'tarilmasin.
    throw new Error(`Muhit sozlamalari noto‘g‘ri:\n${satrlar}\n\n.env.example dan nusxa oling.`)
  }
  return natija.data
}

export const sozlama = oqi()

/** Kod kanali: aniq ko'rsatilmasa ishlab chiqarishda Telegram, aks holda konsol. */
export const kodKanali: 'telegram' | 'konsol' =
  sozlama.KOD_KANALI ?? (sozlama.NODE_ENV === 'production' ? 'telegram' : 'konsol')

if (sozlama.NODE_ENV === 'production' && kodKanali === 'konsol') {
  // Ishlab chiqarishda kod ekranga chiqarilmaydi (`kod-yetkazish.ts`), lekin
  // bunday sozlama bilan hech kim kira olmaydi — darhol ko'rinsin.
  console.error('[sozlama] KOD_KANALI=konsol ishlab chiqarishda — mijozlar kod ololmaydi')
}
if (sozlama.NODE_ENV === 'production' && !sozlama.PROKSI_ORQALI) {
  console.warn('[sozlama] PROKSI_ORQALI=false — IP chegarasi hamma mijozga BITTA umumiy hisoblagich bo‘ladi')
}

export const ishlabChiqarish = sozlama.NODE_ENV === 'production'
export const rivojlanish = sozlama.NODE_ENV === 'development'
