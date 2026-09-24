import { z } from 'zod'

// ERP ↔ Marketplace shartnomasi — YAGONA HAQIQAT MANBAI.
//
// Bu fayl ikkala tomon rozi bo'lgan shaklni belgilaydi. ERP javobi
// shu sxemalar bilan TEKSHIRILADI: ERP kutilmagan narsa qaytarsa
// (masalan yangilanishdan keyin maydon nomi o'zgarsa) xato darhol
// va aniq joyda chiqadi, `undefined` bo'lib sahifagacha yetib bormaydi.
//
// Shartnoma versiyasi: har buzuvchi o'zgarishda oshiriladi va ERP
// tomonda ham qo'llab-quvvatlanadi.
export const SHARTNOMA_VERSIYASI = 1

/**
 * Mavjudlik ATAYLAB uch holat — aniq son EMAS.
 *
 * Sabab (TZ 12.3): aniq qoldiqni ko'rsatish raqobatchiga ombor hajmini
 * ochib beradi va "kam qoldi" bosimini yo'qotadi. Shuning uchun ERP ham
 * son qaytarmaydi — sizib chiqadigan narsaning o'zi bo'lmasin.
 */
export const mavjudlikSxema = z.enum(['BOR', 'KAM', 'YOQ'])
export type Mavjudlik = z.infer<typeof mavjudlikSxema>

export const valyutaSxema = z.enum(['UZS', 'USD'])
export type Valyuta = z.infer<typeof valyutaSxema>

export const hajmBirligiSxema = z.enum(['G', 'KG', 'ML', 'L', 'DONA', 'M'])
export type HajmBirligi = z.infer<typeof hajmBirligiSxema>

/** Katalogdagi bitta mahsulot — ERP beradigan hamma narsa. */
export const katalogTovariSxema = z.object({
  id: z.string(),
  nomi: z.string(),
  birlik: z.string(),
  shtrixKod: z.string().nullable(),
  /** Sotish narxi — o'z valyutasida. So'mga o'girish mijoz tomonida. */
  sotishNarxi: z.number(),
  valyuta: valyutaSxema,
  mavjudlik: mavjudlikSxema,
  kategoriya: z.object({ id: z.string(), nomi: z.string() }).nullable(),
  ombor: z.object({ id: z.string(), nomi: z.string() }).nullable(),
  // ── Onlayn vitrina kartochkasi (ERP'da to'ldiriladi) ──
  sarlavha: z.string().nullable(),
  brend: z.string().nullable(),
  tavsif: z.string().nullable(),
  xususiyatlar: z.array(z.object({ nomi: z.string(), qiymat: z.string() })),
  hajm: z.number().nullable(),
  hajmBirligi: hajmBirligiSxema.nullable(),
  /** Aksiya faol bo'lsa — aksiyadan oldingi haqiqiy narx (o'z valyutasida) */
  eskiNarx: z.number().nullable(),
  aksiyaOxiri: z.string().nullable(),
  /** Rasm versiyalari (tartib bo'yicha). Rasmning o'zi `/api/marketplace/rasm/...` dan. */
  rasmlar: z.array(z.string()),
  yangilangan: z.string(),
})
export type KatalogTovari = z.infer<typeof katalogTovariSxema>

export const katalogJavobiSxema = z.object({
  tovarlar: z.array(katalogTovariSxema),
  /** Joriy USD kursi — dollarda narxlangan tovarlarni so'mga o'girish uchun. */
  usdKursi: z.number().nullable(),
  /** ERP javob bergan vaqt — keshni boshqarish uchun. */
  vaqt: z.string(),
})

export type KatalogJavobi = z.infer<typeof katalogJavobiSxema>

export const dokonJavobiSxema = z.object({
  nomi: z.string().nullable(),
  telefon: z.string().nullable(),
  manzil: z.string().nullable(),
  ishVaqti: z.string().nullable(),
  qaytarishShartlari: z.string().nullable(),
})
export type DokonMalumoti = z.infer<typeof dokonJavobiSxema>
