import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { sozlama, rivojlanish } from '@/lib/sozlama'
import type { DomenXatosi } from '@/lib/natija'

// API marshrutlari uchun umumiy yordamchilar.

export function javob<T>(qiymat: T, holat = 200) {
  return NextResponse.json(qiymat, { status: holat, headers: { 'Cache-Control': 'no-store' } })
}

/** Domen xatosi → HTTP. Kod bo'yicha holat tanlanadi, matn o'zbekcha. */
export function xatoJavob(x: DomenXatosi) {
  const holat =
    x.kod === 'topilmadi' ? 404
    : x.kod === 'tasdiqlanmagan' || x.kod === 'kirish_kerak' ? 401
    : x.kod === 'tezlik_chegarasi' ? 429
    : x.kod === 'erp_ulanmadi' ? 503
    : 400
  return NextResponse.json({ kod: x.kod, xato: x.xabar, tafsilot: x.tafsilot }, { status: holat })
}

/**
 * So'rov o'z saytimizdan kelganmi.
 *
 * Seans cookie `sameSite: lax`, ya'ni boshqa saytdan kelgan POST ga u
 * qo'shilmaydi. Bu ikkinchi to'siq: `Origin` sarlavhasi bor bo'lsa u
 * bizning manzil bo'lishi shart.
 */
export function ozSaytdanmi(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true // brauzer bo'lmagan mijoz (masalan testlar) — cookie baribir kerak
  try {
    const kutilgan = new URL(sozlama.SAYT_URL).host
    const kelgan = new URL(origin).host
    if (kelgan === kutilgan) return true
    // Rivojlanishda telefondan lokal tarmoq IP orqali ochilishi mumkin
    return rivojlanish && kelgan === req.nextUrl.host
  } catch {
    return false
  }
}

export async function jsonOqi(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const j: unknown = await req.json()
    return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Mijoz IP manzili — faqat ishonchli proksi ortida.
 *
 * `X-Forwarded-For` ning BIRINCHI qiymatini mijozning o'zi yozadi, shuning
 * uchun unga ishonib bo'lmaydi: har so'rovga boshqa "IP" yozib chegarani
 * aylanib o'tish mumkin. nginx `X-Real-IP` ni o'zi ulanishdan olib QAYTA
 * YOZADI — proksi ortida faqat shu ishonchli. Proksisiz esa ishonchli IP
 * yo'q: hamma bitta umumiy hisoblagichga tushadi (asosiy himoya baribir
 * telefon bo'yicha, bazada).
 */
export function mijozIp(req: NextRequest): string {
  if (!sozlama.PROKSI_ORQALI) return 'umumiy'
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  // Zaxira: proksi qo'shgan OXIRGI qiymat (mijoz yozgani chapda qoladi)
  const zanjir = req.headers.get('x-forwarded-for')?.split(',').map(x => x.trim()).filter(Boolean)
  return zanjir?.at(-1) ?? 'umumiy'
}

// ─── Oddiy IP chegarasi ───────────────────────────────────────────────
// Xotirada: bitta server nusxasi uchun yetarli. Bir nechta nusxa bo'lsa
// Redis kabi umumiy omborga ko'chirilishi kerak. Asosiy himoya baribir
// telefon bo'yicha, bazada (`kirish-kodi.ts`).
const oyna = new Map<string, number[]>()

export function ipChegarasi(req: NextRequest, kalit: string, maks: number, ms: number): number | null {
  const ip = mijozIp(req)
  // Ishonchli IP yo'q (proksisiz yoki lokal) — hamma bitta hisoblagichda. Oddiy chegara
  // bilan bir necha mijoz birga saytni hammaga yopib qo'yardi ("Juda tez-tez..."),
  // shuning uchun umumiy hisoblagich kengroq. Asosiy himoya baribir telefon bo'yicha (bazada).
  if (ip === 'umumiy') maks = maks * (rivojlanish ? 50 : 10)
  const k = `${kalit}:${ip}`
  const hozir = Date.now()
  const vaqtlar = (oyna.get(k) ?? []).filter(t => hozir - t < ms)
  if (vaqtlar.length >= maks) {
    return Math.ceil((ms - (hozir - vaqtlar[0]!)) / 1000)
  }
  vaqtlar.push(hozir)
  oyna.set(k, vaqtlar)
  return null
}
