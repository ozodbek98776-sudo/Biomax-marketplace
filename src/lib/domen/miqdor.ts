// Savatdagi miqdor — sof mantiq (brauzer ham, server ham shu qoidadan
// foydalanadi). Bu yerda `server-only` yo'q: kiritgich mijoz tomonida ishlaydi.

/** Bitta qatorga qo'shish mumkin bo'lgan eng katta miqdor. */
export const MAKS_MIQDOR = 99

/**
 * Kiritilgan matndan sonni ajratadi: xaridor "2 dona" deb nusxalasa, telefon
 * klaviaturasi bo'sh joy qo'shsa yoki minus bossa ham faqat raqamlar qoladi.
 * Boshidagi ortiqcha nollar olib tashlanadi ("007" → "7"), yolg'iz "0" esa
 * saqlanadi — u "savatdan olib tashlash" degani.
 */
export function raqamlar(matn: string, maksBelgi = 4): string {
  const faqat = matn.replace(/\D/g, '').slice(0, maksBelgi)
  return faqat.replace(/^0+(?=\d)/, '')
}

/** Sonni `min`–`maks` oralig'iga siqadi; kasr qismi tashlanadi. */
export function chegarala(son: number, min: number, maks: number): number {
  if (!Number.isFinite(son)) return min
  return Math.min(maks, Math.max(min, Math.trunc(son)))
}

/**
 * Kiritgich maydonidagi matnni serverga yuboriladigan miqdorga aylantiradi.
 * `null` — matn bo'sh yoki sonsiz, ya'ni o'zgartirish yo'q (eski qiymat qoladi).
 */
export function kiritilganMiqdor(matn: string, min: number, maks: number): number | null {
  const xom = raqamlar(matn)
  if (xom === '') return null
  return chegarala(Number(xom), min, maks)
}
