import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

// Bir martalik kirish kodi (Telegram orqali yetkaziladi) — qoidalar bitta joyda.
//
// Parol yo'q: mijoz telefon raqami va unga kelgan kod bilan kiradi.
// Shuning uchun kodning o'zi — hisob kaliti, va unga hujum eng oson yo'l.
// Quyidagi har bir cheklov aniq bir hujumga qarshi:

export const KOD_UZUNLIGI = 6
/** Kod shu vaqtdan keyin kuyadi. */
export const KOD_AMAL_MS = 5 * 60_000
/** Bitta kodga noto'g'ri urinishlar chegarasi — 6 xonali kodni terib topishga qarshi. */
export const KOD_MAKS_URINISH = 5
/** Qayta yuborishdan oldin kutish — xabar bombardimoniga qarshi. */
export const QAYTA_YUBORISH_MS = 60_000
/** Bir raqamga soatiga maksimal kod — do'kon Telegram akkaunti spam deb bloklanmasin. */
export const SOATIGA_MAKS_KOD = 5

/** Kriptografik tasodifiy 6 xonali kod. `Math.random` taxmin qilinadigan — ishlatilmaydi. */
export function kodYarat(): string {
  return String(randomInt(0, 10 ** KOD_UZUNLIGI)).padStart(KOD_UZUNLIGI, '0')
}

/**
 * Kodning xeshi. Bazada kodning O'ZI emas, shu saqlanadi.
 *
 * Telefon va maxfiy kalit ("qalampir") qo'shiladi: 6 xonali kod bor-yo'g'i
 * million variant, qalampirsiz xesh baza sizib chiqsa bir soniyada ochilardi.
 */
export function kodXeshi(kod: string, telefon: string, qalampir: string): string {
  return createHash('sha256').update(`${qalampir}:${telefon}:${kod}`).digest('hex')
}

export function kodTogrimi(kod: string, telefon: string, qalampir: string, saqlanganXesh: string): boolean {
  if (!/^\d{6}$/.test(kod)) return false
  const a = Buffer.from(kodXeshi(kod, telefon, qalampir), 'hex')
  const b = Buffer.from(saqlanganXesh, 'hex')
  // Uzunlik farq qilsa `timingSafeEqual` xato beradi.
  return a.length === b.length && timingSafeEqual(a, b)
}

export type YuborishHukmi =
  | { ruxsat: true }
  | { ruxsat: false; sabab: 'kutish'; soniya: number }
  | { ruxsat: false; sabab: 'soatlik_chegara'; soniya: number }

/** Oxirgi soatda shu raqamga yuborilgan kodning qoidaga kerakli qismi. */
export interface YuborilganKod {
  yaratilgan: Date
  amalQiladi: Date
  ishlatilgan: boolean
  urinishlar: number
}

/**
 * Eng yangi kod to'g'ri kiritilib, mijoz kirganmi.
 *
 * Kod uch yo'l bilan yopiladi: to'g'ri kiritildi, 5 marta noto'g'ri terildi,
 * yoki yangi kod uni kuydirdi. Oxirgisi eng yangi kodga tegmaydi — shuning
 * uchun eng yangi kodda `ishlatilgan` va urinishlar chegaradan kam bo'lsa,
 * bu faqat muvaffaqiyatli kirish.
 */
function kirishBilanYopilgan(k: YuborilganKod): boolean {
  return k.ishlatilgan && k.urinishlar < KOD_MAKS_URINISH
}

/**
 * Yangi kod yuborish mumkinmi — shu raqamga oxirgi bir soatda yuborilgan
 * kodlarga qarab.
 *
 * 60 soniyalik kutish xabar bombardimoniga qarshi, lekin u faqat eng yangi
 * kod hali kutilayotgan bo'lsa kerak. Mijoz kodni to'g'ri kiritib kirgan
 * bo'lsa (so'ng chiqib, qayta kirmoqchi bo'lsa) kutish yo'q: kodni bilgan
 * odam raqam egasi, u o'ziga hujum qilmaydi. Aks holda mijozga "o'sha kodni
 * kiriting" deyilardi — kod esa allaqachon ishlatilgan, kirishning iloji yo'q.
 *
 * 5 marta noto'g'ri terib kuydirilgan kod esa kutishni saqlaydi — aks holda
 * "5 xato + yangi kod" aylanasi bilan kutishni chetlab o'tish mumkin bo'lardi.
 *
 * Soatlik chegara BARCHA kodlarni sanaydi: har biri Telegram xabari bo'lib ketgan.
 */
export function yuborishMumkinmi(oxirgiSoatKodlari: YuborilganKod[], hozir: number = Date.now()): YuborishHukmi {
  const tartibli = [...oxirgiSoatKodlari].sort((a, b) => b.yaratilgan.getTime() - a.yaratilgan.getTime())
  const eng = tartibli[0]
  if (eng) {
    const otgan = hozir - eng.yaratilgan.getTime()
    if (otgan < QAYTA_YUBORISH_MS && !kirishBilanYopilgan(eng)) {
      return { ruxsat: false, sabab: 'kutish', soniya: Math.ceil((QAYTA_YUBORISH_MS - otgan) / 1000) }
    }
  }
  const soatIchida = tartibli.filter(k => hozir - k.yaratilgan.getTime() < 3_600_000)
  if (soatIchida.length >= SOATIGA_MAKS_KOD) {
    const eskisi = soatIchida[soatIchida.length - 1]!
    return { ruxsat: false, sabab: 'soatlik_chegara', soniya: Math.ceil((3_600_000 - (hozir - eskisi.yaratilgan.getTime())) / 1000) }
  }
  return { ruxsat: true }
}
