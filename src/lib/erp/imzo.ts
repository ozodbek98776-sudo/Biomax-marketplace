import { createHmac, timingSafeEqual } from 'node:crypto'

// So'rovni imzolash — ERP faqat marketplace'dan kelgan so'rovni qabul qilsin.
//
// Nega token emas, imzo: token ushlab olinsa cheksiz ishlatiladi. Imzo esa
// so'rov TANASIGA va VAQTIGA bog'langan — ushlab olingan so'rovni na
// o'zgartirib, na keyinroq qayta yuborib bo'ladi.

/** So'rov shu muddatdan eski bo'lsa rad etiladi (qayta yuborishga qarshi). */
export const IMZO_AMAL_MS = 5 * 60_000

export interface ImzoSarlavhalari {
  'X-MP-Timestamp': string
  'X-MP-Signature': string
  'X-MP-Version': string
}

/**
 * Imzolanadigan matn. Ikkala tomon AYNAN shu tartibda tuzishi shart —
 * aks holda imzolar hech qachon mos kelmaydi.
 */
function imzoMatni(vaqt: string, yol: string, tana: string): string {
  return `${vaqt}\n${yol}\n${tana}`
}

/**
 * Imzoni tekshirish — ERP tomonida ishlatiladi.
 *
 * Taqqoslash `timingSafeEqual` bilan: oddiy `===` belgima-belgi
 * taqqoslaydi va javob vaqtidan imzoni bit-bit topib olish mumkin.
 */
export function imzoTogrimi(
  kalit: string,
  yol: string,
  tana: string,
  vaqt: string,
  imzo: string,
  hozir: number = Date.now(),
): { ok: true } | { ok: false; sabab: string } {
  const v = Number(vaqt)
  if (!Number.isFinite(v)) return { ok: false, sabab: 'vaqt_notogri' }

  // Kelajakdagi vaqt ham rad etiladi: soati oldinga surilgan mijoz
  // imzoni uzoq muddatga amal qiladigan qilib yasay olmasin.
  const farq = hozir - v
  if (farq > IMZO_AMAL_MS) return { ok: false, sabab: 'muddati_otgan' }
  if (farq < -IMZO_AMAL_MS) return { ok: false, sabab: 'kelajak_vaqti' }

  const kutilgan = createHmac('sha256', kalit)
    .update(imzoMatni(vaqt, yol, tana))
    .digest()
  let berilgan: Buffer
  try {
    berilgan = Buffer.from(imzo, 'hex')
  } catch {
    return { ok: false, sabab: 'imzo_shakli' }
  }
  // `timingSafeEqual` uzunligi farq qilsa `throw` qiladi — oldin tekshiramiz.
  if (berilgan.length !== kutilgan.length) return { ok: false, sabab: 'imzo_mos_emas' }
  if (!timingSafeEqual(berilgan, kutilgan)) return { ok: false, sabab: 'imzo_mos_emas' }

  return { ok: true }
}
