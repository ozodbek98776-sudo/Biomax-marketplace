import { createHmac, timingSafeEqual } from 'node:crypto'

// Xaridor seansi — imzolangan cookie.
//
// Nega NextAuth emas: xaridor kirishi faqat telefon + SMS kod; provayderlar,
// OAuth yoki ERP'dagi rollar kerak emas. Imzolangan cookie shu ish uchun
// yetarli, tushunarli va tashqi bog'liqliksiz.
//
// Cookie ichida faqat hisob ID va muddat. Har so'rovda hisob bazadan
// qayta o'qiladi (`joriyHisob`), shuning uchun bloklangan hisob darhol
// chiqariladi — imzo hali amal qilsa ham.

export const SEANS_COOKIE = 'mp_seans'
export const SEANS_MUDDATI_S = 30 * 24 * 3600

interface Yuk { h: string; e: number; v: 1 }

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const b64dan = (s: string) => Buffer.from(s, 'base64url').toString()

function imzo(matn: string, kalit: string): string {
  return createHmac('sha256', kalit).update(matn).digest('base64url')
}

export function seansYarat(hisobId: string, kalit: string, hozir = Date.now()): string {
  const yuk: Yuk = { h: hisobId, e: Math.floor(hozir / 1000) + SEANS_MUDDATI_S, v: 1 }
  const matn = b64(JSON.stringify(yuk))
  return `${matn}.${imzo(matn, kalit)}`
}

/** To'g'ri va muddati o'tmagan bo'lsa hisob ID, aks holda `null`. Hech qachon xato tashlamaydi. */
export function seansOqi(qiymat: string | undefined | null, kalit: string, hozir = Date.now()): string | null {
  if (!qiymat) return null
  const [matn, berilgan, ortiqcha] = qiymat.split('.')
  if (!matn || !berilgan || ortiqcha !== undefined) return null

  const a = Buffer.from(imzo(matn, kalit))
  const b = Buffer.from(berilgan)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const yuk = JSON.parse(b64dan(matn)) as Partial<Yuk>
    if (yuk.v !== 1 || typeof yuk.h !== 'string' || typeof yuk.e !== 'number') return null
    if (yuk.e * 1000 <= hozir) return null
    return yuk.h
  } catch {
    return null
  }
}

/**
 * Qaytish manzili xavfsizmi.
 *
 * `?keyin=` foydalanuvchidan keladi. Tekshirilmasa `?keyin=https://yolgon.uz`
 * bilan kirgan mijoz kod kiritgach begona saytga yuborilardi (ochiq
 * yo'naltirish — fishing uchun klassik usul). Faqat o'z saytimizdagi yo'l.
 */
export function xavfsizQaytish(keyin: unknown, zaxira = '/'): string {
  if (typeof keyin !== 'string') return zaxira
  if (!keyin.startsWith('/') || keyin.startsWith('//') || keyin.startsWith('/\\')) return zaxira
  if (/[\r\n]/.test(keyin)) return zaxira
  return keyin
}
